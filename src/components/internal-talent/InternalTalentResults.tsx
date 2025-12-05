import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Users } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { StaffSearchCard } from "./StaffSearchCard";
import type { InternalTalentFilters } from "@/pages/InternalTalentPool";

interface InternalTalentResultsProps {
  filters: InternalTalentFilters;
  viewMode: "grid" | "list";
  sortBy: string;
}

export function InternalTalentResults({ filters, viewMode, sortBy }: InternalTalentResultsProps) {
  const { data: staff, isLoading, error } = useQuery({
    queryKey: ["internal-talent", filters],
    queryFn: async () => {
      let query = supabase
        .from("users")
        .select("*")
        .neq("role", "Candidate");

      // Apply division filter
      if (filters.divisions.length > 0) {
        query = query.in("division", filters.divisions);
      }

      // Apply duty station filter
      if (filters.dutyStations.length > 0) {
        query = query.in("duty_station", filters.dutyStations);
      }

      // Apply grade filter
      if (filters.grades.length > 0) {
        query = query.in("current_grade", filters.grades);
      }

      // Apply line manager filter
      if (filters.lineManager) {
        query = query.ilike("line_manager", `%${filters.lineManager}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Client-side filtering for search text, skills, and tenure
  const filteredStaff = staff?.filter((member) => {
    // Text search
    if (filters.searchText) {
      const search = filters.searchText.toLowerCase();
      const searchFields = [
        member.name,
        member.email,
        member.job_title,
        member.division,
        member.unit,
      ].filter(Boolean).join(" ").toLowerCase();
      
      // Also search in skills
      const skillsText = Array.isArray(member.skills) 
        ? member.skills.map((s: any) => typeof s === 'string' ? s : s.name || '').join(" ").toLowerCase()
        : "";
      
      if (!searchFields.includes(search) && !skillsText.includes(search)) {
        return false;
      }
    }

    // Skills filter
    if (filters.skills.length > 0) {
      const memberSkills = Array.isArray(member.skills)
        ? member.skills.map((s: any) => (typeof s === 'string' ? s : s.name || '').toLowerCase())
        : [];
      const hasMatchingSkill = filters.skills.some(skill =>
        memberSkills.some((ms: string) => ms.includes(skill.toLowerCase()))
      );
      if (!hasMatchingSkill) return false;
    }

    // Tenure filter
    if (member.entry_on_duty_date && (filters.minTenure || filters.maxTenure)) {
      const entryDate = new Date(member.entry_on_duty_date);
      const yearsAtUNICC = (Date.now() - entryDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
      
      if (filters.minTenure && yearsAtUNICC < filters.minTenure) return false;
      if (filters.maxTenure && yearsAtUNICC > filters.maxTenure) return false;
    }

    return true;
  });

  // Sort results
  const sortedStaff = filteredStaff?.sort((a, b) => {
    switch (sortBy) {
      case "name_asc":
        return (a.name || "").localeCompare(b.name || "");
      case "name_desc":
        return (b.name || "").localeCompare(a.name || "");
      case "tenure_desc":
        if (!a.entry_on_duty_date) return 1;
        if (!b.entry_on_duty_date) return -1;
        return new Date(a.entry_on_duty_date).getTime() - new Date(b.entry_on_duty_date).getTime();
      case "tenure_asc":
        if (!a.entry_on_duty_date) return 1;
        if (!b.entry_on_duty_date) return -1;
        return new Date(b.entry_on_duty_date).getTime() - new Date(a.entry_on_duty_date).getTime();
      case "division":
        return (a.division || "").localeCompare(b.division || "");
      default:
        return 0;
    }
  });

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
        <AlertDescription>Error loading staff: {(error as Error).message}</AlertDescription>
      </Alert>
    );
  }

  if (!sortedStaff?.length) {
    return (
      <Alert>
        <Users className="h-4 w-4" />
        <AlertDescription>No staff members found matching your criteria.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Showing {sortedStaff.length} staff member{sortedStaff.length !== 1 ? "s" : ""}
      </p>
      
      <div className={viewMode === "grid" 
        ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        : "space-y-4"
      }>
        {sortedStaff.map((member) => (
          <StaffSearchCard 
            key={member.id} 
            staff={member} 
            viewMode={viewMode}
          />
        ))}
      </div>
    </div>
  );
}
