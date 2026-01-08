import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Filter, RotateCcw, Users, LayoutGrid } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export interface FilterState {
  division: string;
  dutyStation: string;
  grade: string;
  workerType: string;
  viewMode: "people" | "skill";
}

interface Props {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}

const DIVISIONS = ["All", "CS", "DD", "DO", "DS", "MS", "OP"];

export default function OrganizationFilters({ filters, onChange }: Props) {
  const [dutyStations, setDutyStations] = useState<string[]>(["All"]);
  const [grades, setGrades] = useState<string[]>(["All"]);
  const [workerTypes, setWorkerTypes] = useState<string[]>(["All"]);

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  const fetchFilterOptions = async () => {
    // Fetch unique duty stations
    const { data: stationData } = await supabase
      .from("users")
      .select("duty_station")
      .not("duty_station", "is", null);
    
    const uniqueStations = [...new Set(stationData?.map((d) => d.duty_station).filter(Boolean) || [])].sort();
    setDutyStations(["All", ...uniqueStations]);

    // Fetch unique grades
    const { data: gradeData } = await supabase
      .from("users")
      .select("current_grade")
      .not("current_grade", "is", null);
    
    const uniqueGrades = [...new Set(gradeData?.map((d) => d.current_grade).filter(Boolean) || [])].sort();
    setGrades(["All", ...uniqueGrades]);

    // Fetch unique worker types
    const { data: workerData } = await supabase
      .from("users")
      .select("worker_type")
      .not("worker_type", "is", null);
    
    const uniqueTypes = [...new Set(workerData?.map((d) => d.worker_type).filter(Boolean) || [])].sort();
    setWorkerTypes(["All", ...uniqueTypes]);
  };

  const handleReset = () => {
    onChange({
      division: "All",
      dutyStation: "All",
      grade: "All",
      workerType: "All",
      viewMode: "skill",
    });
  };

  const hasActiveFilters =
    filters.division !== "All" ||
    filters.dutyStation !== "All" ||
    filters.grade !== "All" ||
    filters.workerType !== "All";

  return (
    <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/30 rounded-lg border">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Filter className="h-4 w-4" />
        <span className="font-medium">Filters:</span>
      </div>

      <Select
        value={filters.division}
        onValueChange={(v) => onChange({ ...filters, division: v })}
      >
        <SelectTrigger className="w-[120px] h-8 text-sm">
          <SelectValue placeholder="Division" />
        </SelectTrigger>
        <SelectContent>
          {DIVISIONS.map((d) => (
            <SelectItem key={d} value={d}>
              {d === "All" ? "All Divisions" : d}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.dutyStation}
        onValueChange={(v) => onChange({ ...filters, dutyStation: v })}
      >
        <SelectTrigger className="w-[140px] h-8 text-sm">
          <SelectValue placeholder="Duty Station" />
        </SelectTrigger>
        <SelectContent>
          {dutyStations.map((s) => (
            <SelectItem key={s} value={s}>
              {s === "All" ? "All Stations" : s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.grade}
        onValueChange={(v) => onChange({ ...filters, grade: v })}
      >
        <SelectTrigger className="w-[100px] h-8 text-sm">
          <SelectValue placeholder="Grade" />
        </SelectTrigger>
        <SelectContent>
          {grades.map((g) => (
            <SelectItem key={g} value={g}>
              {g === "All" ? "All Grades" : g}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.workerType}
        onValueChange={(v) => onChange({ ...filters, workerType: v })}
      >
        <SelectTrigger className="w-[130px] h-8 text-sm">
          <SelectValue placeholder="Worker Type" />
        </SelectTrigger>
        <SelectContent>
          {workerTypes.map((t) => (
            <SelectItem key={t} value={t}>
              {t === "All" ? "All Types" : t}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={handleReset} className="h-8 gap-1">
          <RotateCcw className="h-3 w-3" />
          Reset
        </Button>
      )}

      <div className="ml-auto flex items-center gap-2">
        <span className="text-xs text-muted-foreground">View:</span>
        <ToggleGroup
          type="single"
          value={filters.viewMode}
          onValueChange={(v) => v && onChange({ ...filters, viewMode: v as "people" | "skill" })}
          className="gap-0"
        >
          <ToggleGroupItem value="skill" size="sm" className="h-8 px-3 text-xs gap-1">
            <LayoutGrid className="h-3 w-3" />
            Skills
          </ToggleGroupItem>
          <ToggleGroupItem value="people" size="sm" className="h-8 px-3 text-xs gap-1">
            <Users className="h-3 w-3" />
            People
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  );
}