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

      // Text search
      if (filters.searchText) {
        query = query.or(
          `name.ilike.%${filters.searchText}%,email.ilike.%${filters.searchText}%,current_position.ilike.%${filters.searchText}%,current_organization.ilike.%${filters.searchText}%,professional_summary.ilike.%${filters.searchText}%`
        );
      }

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

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
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
          {
            skills: [],
            experience_years: 0,
            education_level: "",
            languages: [],
            un_experience: false,
          }
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
