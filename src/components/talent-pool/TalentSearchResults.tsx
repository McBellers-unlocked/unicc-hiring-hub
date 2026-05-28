import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SearchFilters } from "@/pages/TalentPool";
import { CandidateSearchCard } from "./CandidateSearchCard";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { JobMatchingService } from "@/lib/jobMatching";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 50;

interface TalentSearchResultsProps {
  filters: SearchFilters;
  viewMode: "grid" | "list";
  sortBy: string;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  showSelection: boolean;
}

// Normalized talent record for unified display
interface NormalizedTalent {
  id: string;
  name: string;
  email: string;
  position: string | null;
  organization: string | null;
  location: string | null;
  years_of_experience: number | null;
  skills: any[];
  education: any[];
  languages: any[];
  un_experience: boolean;
  profile_photo_url: string | null;
  updated_at: string;
  _source: "external" | "internal";
  // Internal-specific fields
  division?: string | null;
  unit?: string | null;
  duty_station?: string | null;
  current_grade?: string | null;
  entry_on_duty_date?: string | null;
  line_manager?: string | null;
  // External-specific fields
  willing_to_relocate?: boolean;
  has_security_clearance?: boolean;
  work_experience?: any[];
  professional_summary?: string | null;
  // Geographic
  present_nationality?: string | null;
  nationality?: string | null;
}

export function TalentSearchResults({
  filters,
  viewMode,
  sortBy,
  selectedIds,
  onSelectionChange,
  showSelection,
}: TalentSearchResultsProps) {
  const [matchScores, setMatchScores] = useState<Record<string, number>>({});
  const [page, setPage] = useState(0);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [filters]);

  // Fetch external candidates - ordered newest first
  const { data: externalCandidates, isLoading: loadingExternal } = useQuery({
    queryKey: ["talent-pool-external", filters],
    queryFn: async () => {
      let query = supabase.from("candidates").select("*");

      if (filters.minExperience !== undefined) {
        query = query.gte("years_of_experience", filters.minExperience);
      }
      if (filters.maxExperience !== undefined && filters.maxExperience < 30) {
        query = query.lte("years_of_experience", filters.maxExperience);
      }
      if (filters.hasUNExperience) {
        query = query.eq("un_experience", true);
      }
      if (filters.willingToRelocate) {
        query = query.eq("willing_to_relocate", true);
      }
      if (filters.hasSecurityClearance) {
        query = query.eq("has_security_clearance", true);
      }

      // Order newest first and fetch up to 2000 via two batches
      const batch1 = await query.order("updated_at", { ascending: false }).range(0, 999);
      if (batch1.error) throw batch1.error;
      
      if (batch1.data.length < 1000) return batch1.data;
      
      // Fetch second batch if first was full
      const batch2 = await supabase.from("candidates").select("*")
        .order("updated_at", { ascending: false }).range(1000, 1999);
      if (batch2.error) throw batch2.error;
      
      return [...batch1.data, ...(batch2.data || [])];
    },
    enabled: filters.talentSource !== "internal",
  });

  // Fetch internal staff
  const { data: internalStaff, isLoading: loadingInternal } = useQuery({
    queryKey: ["talent-pool-internal", filters],
    queryFn: async () => {
      let query = supabase
        .from("users")
        .select("*")
        .neq("role", "Candidate");

      if (filters.divisions.length > 0) {
        query = query.in("division", filters.divisions);
      }
      if (filters.dutyStations.length > 0) {
        query = query.in("duty_station", filters.dutyStations);
      }
      if (filters.grades.length > 0) {
        query = query.in("current_grade", filters.grades);
      }
      if (filters.lineManager) {
        query = query.ilike("line_manager", `%${filters.lineManager}%`);
      }

      query = query.order("updated_at", { ascending: false });
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: filters.talentSource !== "external",
  });

  // Normalize data from both sources
  const normalizedTalent: NormalizedTalent[] = [];

  // Build set of candidate emails (candidates table has richer profile data)
  const candidateEmails = new Set(
    externalCandidates?.map((c) => c.email.toLowerCase()) || []
  );

  // Normalize candidates (both Internal and External) - these have richer profiles
  if (filters.talentSource !== "internal" && externalCandidates) {
    externalCandidates.forEach((c) => {
      // Check if this candidate is also staff (for proper source tagging)
      const isAlsoStaff = internalStaff?.some(
        (s) => s.email.toLowerCase() === c.email.toLowerCase()
      );
      
      normalizedTalent.push({
        id: c.id,
        name: c.name,
        email: c.email,
        position: c.current_position,
        organization: c.current_organization,
        location: c.location,
        years_of_experience: c.years_of_experience,
        skills: Array.isArray(c.skills) ? c.skills : [],
        education: Array.isArray(c.education) ? c.education : [],
        languages: Array.isArray(c.languages) ? c.languages : [],
        un_experience: isAlsoStaff ? true : (c.un_experience || false),
        profile_photo_url: c.profile_photo_url,
        updated_at: c.updated_at,
        _source: isAlsoStaff ? "internal" : "external",
        willing_to_relocate: c.willing_to_relocate,
        has_security_clearance: c.has_security_clearance,
        work_experience: Array.isArray(c.work_experience) ? c.work_experience : [],
        professional_summary: c.professional_summary,
      });
    });
  }

  // Normalize internal staff (only those without candidate profiles)
  if (filters.talentSource !== "external" && internalStaff) {
    internalStaff.forEach((s) => {
      // Skip if this staff member has a candidate profile (show that instead - richer data)
      if (candidateEmails.has(s.email.toLowerCase())) {
        return;
      }

      // Calculate tenure in years
      let tenure: number | null = null;
      if (s.entry_on_duty_date) {
        tenure = Math.floor(
          (Date.now() - new Date(s.entry_on_duty_date).getTime()) /
            (1000 * 60 * 60 * 24 * 365)
        );
      }

      normalizedTalent.push({
        id: s.id,
        name: s.name || s.email,
        email: s.email,
        position: s.job_title,
        organization: "UNICC",
        location: s.duty_station,
        years_of_experience: tenure,
        skills: Array.isArray(s.skills) ? s.skills : [],
        education: [],
        languages: [],
        un_experience: true, // All internal staff have UN experience
        profile_photo_url: null,
        updated_at: s.updated_at || s.created_at,
        _source: "internal",
        division: s.division,
        unit: s.unit,
        duty_station: s.duty_station,
        current_grade: s.current_grade,
        entry_on_duty_date: s.entry_on_duty_date,
        line_manager: s.line_manager,
      });
    });
  }

  // Client-side filtering
  let filteredTalent = normalizedTalent.filter((person) => {
    // Text search
    if (filters.searchText) {
      const searchLower = filters.searchText.toLowerCase();
      const textMatch =
        person.name?.toLowerCase().includes(searchLower) ||
        person.email?.toLowerCase().includes(searchLower) ||
        person.position?.toLowerCase().includes(searchLower) ||
        person.organization?.toLowerCase().includes(searchLower) ||
        person.division?.toLowerCase().includes(searchLower) ||
        person.unit?.toLowerCase().includes(searchLower) ||
        person.professional_summary?.toLowerCase().includes(searchLower);

      const skillsMatch = person.skills.some((skill: any) => {
        const skillName = typeof skill === "string" ? skill : skill.name || "";
        return skillName.toLowerCase().includes(searchLower);
      });

      const workExpMatch =
        person.work_experience?.some(
          (exp: any) =>
            exp.position?.toLowerCase().includes(searchLower) ||
            exp.organization?.toLowerCase().includes(searchLower)
        ) || false;

      if (!textMatch && !skillsMatch && !workExpMatch) return false;
    }

    // Skills filter (AND logic - must have ALL selected skills)
    if (filters.skills.length > 0) {
      const hasAllSkills = filters.skills.every((requiredSkill) => {
        const requiredLower = requiredSkill.toLowerCase();
        return person.skills.some((personSkill: any) => {
          const skillName = typeof personSkill === "string" 
            ? personSkill 
            : personSkill.name || "";
          return skillName.toLowerCase().includes(requiredLower);
        });
      });
      if (!hasAllSkills) return false;
    }

    // Education level filter (external only)
    if (filters.educationLevel && person._source === "external") {
      if (!person.education.length) return false;
      const allDegrees = person.education
        .map((e: any) => e.degree?.toLowerCase() || "")
        .join(" ");
      if (filters.educationLevel === "first_degree") {
        if (
          !allDegrees.includes("bachelor") &&
          !allDegrees.includes("b.a") &&
          !allDegrees.includes("b.s")
        )
          return false;
      } else if (filters.educationLevel === "advanced_degree") {
        if (
          !allDegrees.includes("master") &&
          !allDegrees.includes("phd") &&
          !allDegrees.includes("doctorate")
        )
          return false;
      }
    }

    // Experience filter for internal staff (uses tenure as proxy)
    if (person._source === "internal") {
      const yearsExp = person.years_of_experience || 0;
      if (filters.minExperience && yearsExp < filters.minExperience) return false;
      if (filters.maxExperience && filters.maxExperience < 30 && yearsExp > filters.maxExperience) return false;
      
      // Also apply tenure-specific filters if set
      if (person.entry_on_duty_date) {
        const tenure =
          (Date.now() - new Date(person.entry_on_duty_date).getTime()) /
          (1000 * 60 * 60 * 24 * 365);
        if (filters.minTenure && tenure < filters.minTenure) return false;
        if (filters.maxTenure && filters.maxTenure < 30 && tenure > filters.maxTenure)
          return false;
      }
    }

    return true;
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

  // Calculate match scores
  useEffect(() => {
    if (selectedJob && filteredTalent.length > 0) {
      const scores: Record<string, number> = {};

      const extractSkills = (description: string): string[] => {
        const commonSkills = [
          "penetration testing", "vulnerability assessment", "security auditing",
          "risk assessment", "incident response", "malware analysis", "network security",
          "cloud security", "project management", "data analysis", "communication",
          "leadership", "python", "javascript", "sql", "bash", "powershell",
        ];
        const descLower = description.toLowerCase();
        return commonSkills.filter((skill) => descLower.includes(skill));
      };

      const extractExperience = (description: string): number | undefined => {
        const expMatch = description.match(/(\d+)\s*years?\s*(of\s*)?experience/i);
        return expMatch ? parseInt(expMatch[1]) : undefined;
      };

      const jobDescription = `${selectedJob.requirements_md || ""} ${selectedJob.description_md || ""}`;
      const jobRequirements = {
        skills: extractSkills(jobDescription),
        experience_years: extractExperience(jobDescription),
        un_experience:
          jobDescription.toLowerCase().includes("un experience") ||
          jobDescription.toLowerCase().includes("united nations"),
      };

      filteredTalent.forEach((person) => {
        const match = JobMatchingService.calculateJobMatch(
          {
            skills: person.skills || [],
            years_of_experience: person.years_of_experience || 0,
            education: person.education || [],
            un_experience: person.un_experience || false,
            languages: { un_languages: {}, other_languages: [] },
            work_experience: person.work_experience || [],
          },
          jobRequirements
        );
        scores[person.id] = match.matchPercentage;
      });
      setMatchScores(scores);
    } else {
      setMatchScores({});
    }
  }, [selectedJob, filteredTalent.length]);

  // Filter out 0% matches when job selected
  if (filters.selectedJobId && Object.keys(matchScores).length > 0) {
    filteredTalent = filteredTalent.filter((p) => (matchScores[p.id] || 0) > 0);
  }

  // Sort results
  const sortedTalent = [...filteredTalent].sort((a, b) => {
    if (filters.selectedJobId && Object.keys(matchScores).length > 0) {
      return (matchScores[b.id] || 0) - (matchScores[a.id] || 0);
    }

    switch (sortBy) {
      case "updated_desc":
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      case "experience_desc":
        return (b.years_of_experience || 0) - (a.years_of_experience || 0);
      case "experience_asc":
        return (a.years_of_experience || 0) - (b.years_of_experience || 0);
      case "tenure_desc":
        if (!a.entry_on_duty_date) return 1;
        if (!b.entry_on_duty_date) return -1;
        return (
          new Date(a.entry_on_duty_date).getTime() -
          new Date(b.entry_on_duty_date).getTime()
        );
      case "name_asc":
        return a.name.localeCompare(b.name);
      case "match_score":
        return (matchScores[b.id] || 0) - (matchScores[a.id] || 0);
      default:
        return 0;
    }
  });

  const isLoading =
    (filters.talentSource !== "internal" && loadingExternal) ||
    (filters.talentSource !== "external" && loadingInternal);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!sortedTalent.length) {
    return (
      <Alert>
        <AlertDescription>
          No {filters.talentSource === "internal" ? "staff members" : filters.talentSource === "external" ? "candidates" : "talent"} found matching your search criteria.
        </AlertDescription>
      </Alert>
    );
  }

  const externalCount = sortedTalent.filter((t) => t._source === "external").length;
  const internalCount = sortedTalent.filter((t) => t._source === "internal").length;

  const internalTalent = sortedTalent.filter((t) => t._source === "internal");

  // Pagination
  const totalPages = Math.ceil(sortedTalent.length / PAGE_SIZE);
  const paginatedTalent = sortedTalent.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const internalOnPage = paginatedTalent.filter((t) => t._source === "internal");

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(internalOnPage.map((t) => t.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelect = (id: string, selected: boolean) => {
    if (selected) {
      onSelectionChange([...selectedIds, id]);
    } else {
      onSelectionChange(selectedIds.filter((sid) => sid !== id));
    }
  };

  const allInternalSelected = internalOnPage.length > 0 && internalOnPage.every((t) => selectedIds.includes(t.id));

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Found {sortedTalent.length} result{sortedTalent.length !== 1 ? "s" : ""}
          {filters.talentSource === "all" && (
            <span className="ml-2">
              ({externalCount} external, {internalCount} internal)
            </span>
          )}
          {totalPages > 1 && (
            <span className="ml-2">
              · Page {page + 1} of {totalPages}
            </span>
          )}
        </div>
        {showSelection && internalOnPage.length > 0 && (
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={allInternalSelected}
              onChange={(e) => handleSelectAll(e.target.checked)}
              className="rounded border-border"
            />
            Select all on page ({internalOnPage.length})
          </label>
        )}
      </div>
      <div
        className={
          viewMode === "grid"
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            : "space-y-4"
        }
      >
        {paginatedTalent.map((person) => (
          <CandidateSearchCard
            key={person.id}
            candidate={person}
            viewMode={viewMode}
            matchScore={matchScores[person.id]}
            isSelected={selectedIds.includes(person.id)}
            onSelect={handleSelect}
            showSelection={showSelection}
          />
        ))}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground px-3">
            {page + 1} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
