import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SearchFilters } from "@/pages/TalentPool";
import { CandidateSearchCard } from "./CandidateSearchCard";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { JobMatchingService } from "@/lib/jobMatching";
import { useState, useEffect } from "react";

interface TalentSearchResultsProps {
  filters: SearchFilters;
  viewMode: "grid" | "list";
  sortBy: string;
}

export function TalentSearchResults({
  filters,
  viewMode,
  sortBy,
}: TalentSearchResultsProps) {
  const [matchScores, setMatchScores] = useState<Record<string, number>>({});

  const { data: candidates, isLoading, error } = useQuery({
    queryKey: ["talent-pool-search", filters],
    queryFn: async () => {
      let query = supabase
        .from("candidates")
        .select("*");

      // Apply server-side filters
      // Experience range
      if (filters.minExperience !== undefined) {
        query = query.gte("years_of_experience", filters.minExperience);
      }
      if (filters.maxExperience !== undefined && filters.maxExperience < 30) {
        query = query.lte("years_of_experience", filters.maxExperience);
      }

      // Boolean filters
      if (filters.hasUNExperience) {
        query = query.eq("un_experience", true);
      }
      if (filters.willingToRelocate) {
        query = query.eq("willing_to_relocate", true);
      }
      if (filters.hasSecurityClearance) {
        query = query.eq("has_security_clearance", true);
      }

      const { data: allData, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      
      let filteredData = allData || [];

      // Apply client-side filters for complex JSONB searches
      // Text search in JSONB fields
      if (filters.searchText) {
        const searchLower = filters.searchText.toLowerCase();
        filteredData = filteredData.filter((candidate) => {
          // Basic text fields
          const textMatch = 
            candidate.name?.toLowerCase().includes(searchLower) ||
            candidate.email?.toLowerCase().includes(searchLower) ||
            candidate.current_position?.toLowerCase().includes(searchLower) ||
            candidate.current_organization?.toLowerCase().includes(searchLower) ||
            candidate.professional_summary?.toLowerCase().includes(searchLower);
          
          // Search in skills array
          const skillsMatch = Array.isArray(candidate.skills) && 
            candidate.skills.some((skill: any) => 
              typeof skill === 'string' && skill.toLowerCase().includes(searchLower)
            );
          
          // Search in work experience
          const workExpMatch = Array.isArray(candidate.work_experience) &&
            candidate.work_experience.some((exp: any) => 
              exp.position?.toLowerCase().includes(searchLower) ||
              exp.organization?.toLowerCase().includes(searchLower) ||
              exp.description?.toLowerCase().includes(searchLower)
            );
          
          return textMatch || skillsMatch || workExpMatch;
        });
      }

      // Apply education level filter
      if (filters.educationLevel) {
        filteredData = filteredData.filter((candidate) => {
          const education = candidate.education as any[];
          if (!Array.isArray(education) || education.length === 0) return false;
          
          // Check all education entries, not just the first one
          const allDegrees = education.map(e => e.degree?.toLowerCase() || '').join(' ');
          
          if (filters.educationLevel === 'first_degree') {
            return allDegrees.includes('bachelor') || allDegrees.includes('b.a') || 
                   allDegrees.includes('b.s') || allDegrees.includes('undergraduate');
          } else if (filters.educationLevel === 'advanced_degree') {
            return allDegrees.includes('master') || allDegrees.includes('phd') || 
                   allDegrees.includes('doctorate') || allDegrees.includes('m.a') ||
                   allDegrees.includes('m.s') || allDegrees.includes('mba');
          }
          return true;
        });
      }

      return filteredData;
    },
  });

  // Fetch job data if job matching is selected
  const { data: selectedJob } = useQuery({
    queryKey: ["selected-job", filters.selectedJobId],
    queryFn: async () => {
      if (!filters.selectedJobId) return null;
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", filters.selectedJobId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!filters.selectedJobId,
  });

  // Calculate match scores when job is selected
  useEffect(() => {
    if (selectedJob && candidates) {
      const scores: Record<string, number> = {};
      
      // Extract job requirements from the selected job
      const extractSkills = (description: string): string[] => {
        const commonSkills = [
          'penetration testing', 'vulnerability assessment', 'security auditing', 'risk assessment',
          'incident response', 'malware analysis', 'network security', 'cloud security',
          'project management', 'data analysis', 'communication', 'leadership',
          'python', 'javascript', 'sql', 'bash', 'powershell', 'burp suite', 'metasploit',
          'nmap', 'wireshark', 'kali linux', 'owasp', 'compliance', 'cissp', 'oscp', 'ceh'
        ];
        const descLower = description.toLowerCase();
        return commonSkills.filter(skill => descLower.includes(skill));
      };
      
      const extractExperience = (description: string): number | undefined => {
        const expMatch = description.match(/(\d+)\s*years?\s*(of\s*)?experience/i);
        return expMatch ? parseInt(expMatch[1]) : undefined;
      };
      
      const extractEducation = (description: string): string | undefined => {
        const descLower = description.toLowerCase();
        if (descLower.includes('phd') || descLower.includes('doctorate')) return 'PhD';
        if (descLower.includes('master')) return 'Master\'s';
        if (descLower.includes('bachelor')) return 'Bachelor\'s';
        return undefined;
      };
      
      const extractLanguages = (description: string): string[] => {
        const languages = ['english', 'french', 'spanish', 'arabic', 'chinese', 'russian', 'mandarin'];
        const descLower = description.toLowerCase();
        return languages.filter(lang => descLower.includes(lang));
      };
      
      const jobDescription = `${selectedJob.requirements_md || ''} ${selectedJob.description_md || ''}`;
      const jobRequirements = {
        skills: extractSkills(jobDescription),
        experience_years: extractExperience(jobDescription),
        education_level: extractEducation(jobDescription),
        languages: extractLanguages(jobDescription),
        un_experience: jobDescription.toLowerCase().includes('un experience') || 
                       jobDescription.toLowerCase().includes('united nations'),
      };
      
      candidates.forEach((candidate) => {
        const match = JobMatchingService.calculateJobMatch(
          {
            skills: (candidate.skills as any) || [],
            years_of_experience: candidate.years_of_experience || 0,
            education: (candidate.education as any) || [],
            un_experience: candidate.un_experience || false,
            languages: (candidate.languages as any) || { un_languages: {}, other_languages: [] },
            work_experience: (candidate.work_experience as any) || [],
          },
          jobRequirements
        );
        scores[candidate.id] = match.matchPercentage;
      });
      setMatchScores(scores);
    } else {
      setMatchScores({});
    }
  }, [selectedJob, candidates]);

  // Sort candidates
  const sortedCandidates = candidates ? [...candidates].sort((a, b) => {
    switch (sortBy) {
      case "updated_desc":
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      case "experience_desc":
        return (b.years_of_experience || 0) - (a.years_of_experience || 0);
      case "experience_asc":
        return (a.years_of_experience || 0) - (b.years_of_experience || 0);
      case "name_asc":
        return a.name.localeCompare(b.name);
      case "match_score":
        return (matchScores[b.id] || 0) - (matchScores[a.id] || 0);
      default:
        return 0;
    }
  }) : [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load candidates. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  if (!sortedCandidates.length) {
    return (
      <Alert>
        <AlertDescription>
          No candidates found matching your search criteria.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div>
      <div className="mb-4 text-sm text-muted-foreground">
        Found {sortedCandidates.length} candidate{sortedCandidates.length !== 1 ? "s" : ""}
      </div>
      <div
        className={
          viewMode === "grid"
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            : "space-y-4"
        }
      >
        {sortedCandidates.map((candidate) => (
          <CandidateSearchCard
            key={candidate.id}
            candidate={candidate}
            viewMode={viewMode}
            matchScore={matchScores[candidate.id]}
          />
        ))}
      </div>
    </div>
  );
}
