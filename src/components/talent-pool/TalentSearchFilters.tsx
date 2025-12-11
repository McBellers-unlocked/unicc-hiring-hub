import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Search, Filter, X, Grid3x3, List, Building2, Globe } from "lucide-react";
import { SearchFilters } from "@/pages/TalentPool";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface TalentSearchFiltersProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
  sortBy: string;
  onSortByChange: (sort: string) => void;
}

const DIVISIONS = ["CS", "DS", "DD", "DO", "MS", "OP"];
const DUTY_STATIONS = ["Valencia", "Brindisi", "Geneva", "New York", "Rome"];
const GRADES = ["G-4", "G-5", "G-6", "G-7", "P-2", "P-3", "P-4", "P-5", "D-1", "D-2"];

export function TalentSearchFilters({
  filters,
  onFiltersChange,
  viewMode,
  onViewModeChange,
  sortBy,
  onSortByChange,
}: TalentSearchFiltersProps) {
  const [isFiltersOpen, setIsFiltersOpen] = useState(true);
  const [skillInput, setSkillInput] = useState("");

  // Fetch active jobs for job matching dropdown
  const { data: jobs } = useQuery({
    queryKey: ["jobs-for-matching"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("id, title, notice_no")
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const toggleArrayFilter = (key: keyof SearchFilters, value: string) => {
    const current = (filters[key] as string[]) || [];
    if (current.includes(value)) {
      handleFilterChange(key, current.filter(v => v !== value));
    } else {
      handleFilterChange(key, [...current, value]);
    }
  };

  const handleSkillKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && skillInput.trim()) {
      e.preventDefault();
      const newSkill = skillInput.trim();
      if (!filters.skills.includes(newSkill)) {
        handleFilterChange("skills", [...filters.skills, newSkill]);
      }
      setSkillInput("");
    }
  };

  const removeSkill = (skillToRemove: string) => {
    handleFilterChange("skills", filters.skills.filter(s => s !== skillToRemove));
  };

  const clearFilters = () => {
    onFiltersChange({
      searchText: "",
      locations: [],
      education: [],
      languages: [],
      skills: [],
      availability: [],
      workPreferences: [],
      talentSource: filters.talentSource, // Keep the source toggle
      divisions: [],
      dutyStations: [],
      grades: [],
    });
  };

  const activeFilterCount = Object.entries(filters).filter(
    ([key, v]) => 
      key !== "talentSource" && 
      v !== undefined && 
      v !== "" && 
      (Array.isArray(v) ? v.length > 0 : true)
  ).length;

  const showInternalFilters = filters.talentSource === "internal" || filters.talentSource === "all";

  return (
    <div className="space-y-4">
      {/* Talent Source Toggle */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Label className="text-sm font-medium shrink-0">Talent Source:</Label>
          <ToggleGroup 
            type="single" 
            value={filters.talentSource} 
            onValueChange={(value) => value && handleFilterChange("talentSource", value)}
            className="justify-start"
          >
            <ToggleGroupItem value="all" aria-label="All talent" className="gap-2">
              All Talent
            </ToggleGroupItem>
            <ToggleGroupItem value="external" aria-label="External candidates" className="gap-2">
              <Globe className="h-4 w-4" />
              External
            </ToggleGroupItem>
            <ToggleGroupItem value="internal" aria-label="Internal staff" className="gap-2">
              <Building2 className="h-4 w-4" />
              Internal (UNICC)
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </Card>

      {/* Search bar and controls */}
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={showInternalFilters 
                ? "Search by name, position, division..." 
                : "Search by name, position, organization..."}
              value={filters.searchText}
              onChange={(e) => handleFilterChange("searchText", e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex-1 relative">
            <Input
              placeholder="Type a skill and press Enter..."
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={handleSkillKeyDown}
            />
            {filters.skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {filters.skills.map((skill) => (
                  <Badge key={skill} variant="secondary" className="gap-1 pr-1">
                    {skill}
                    <X 
                      className="h-3 w-3 cursor-pointer hover:text-destructive" 
                      onClick={() => removeSkill(skill)} 
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex gap-2 flex-wrap lg:flex-nowrap">
            <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Filter className="h-4 w-4" />
                  Filters
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </CollapsibleTrigger>
            </Collapsible>

            <div className="flex gap-2">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="icon"
                onClick={() => onViewModeChange("grid")}
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="icon"
                onClick={() => onViewModeChange("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>

            <Select value={sortBy} onValueChange={onSortByChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="updated_desc">Recently Updated</SelectItem>
                <SelectItem value="experience_desc">Most Experience</SelectItem>
                <SelectItem value="experience_asc">Least Experience</SelectItem>
                <SelectItem value="name_asc">Name (A-Z)</SelectItem>
                {showInternalFilters && (
                  <SelectItem value="tenure_desc">Tenure (Longest)</SelectItem>
                )}
                {filters.selectedJobId && (
                  <SelectItem value="match_score">Match Score</SelectItem>
                )}
              </SelectContent>
            </Select>

            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-2">
                <X className="h-4 w-4" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Advanced Filters */}
        <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
          <CollapsibleContent className="mt-4 pt-4 border-t">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Job Matching - only for external/all */}
              {filters.talentSource !== "internal" && (
                <div className="space-y-2 lg:col-span-3">
                  <Label>Match to Job Opening (Optional)</Label>
                  <div className="flex gap-2">
                    <Select
                      value={filters.selectedJobId || undefined}
                      onValueChange={(value) => handleFilterChange("selectedJobId", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a job to see match scores" />
                      </SelectTrigger>
                      <SelectContent>
                        {jobs?.map((job) => (
                          <SelectItem key={job.id} value={job.id}>
                            {job.notice_no} - {job.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {filters.selectedJobId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleFilterChange("selectedJobId", undefined)}
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Internal-specific filters */}
              {showInternalFilters && (
                <>
                  {/* Division Filter */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Division</Label>
                    <div className="flex flex-wrap gap-2">
                      {DIVISIONS.map((division) => (
                        <Badge
                          key={division}
                          variant={filters.divisions.includes(division) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => toggleArrayFilter("divisions", division)}
                        >
                          {division}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Duty Station Filter */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Duty Station</Label>
                    <div className="flex flex-wrap gap-2">
                      {DUTY_STATIONS.map((station) => (
                        <Badge
                          key={station}
                          variant={filters.dutyStations.includes(station) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => toggleArrayFilter("dutyStations", station)}
                        >
                          {station}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Grade Filter */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Grade</Label>
                    <div className="flex flex-wrap gap-2">
                      {GRADES.map((grade) => (
                        <Badge
                          key={grade}
                          variant={filters.grades.includes(grade) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => toggleArrayFilter("grades", grade)}
                        >
                          {grade}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Line Manager */}
                  <div className="space-y-2">
                    <Label>Line Manager</Label>
                    <Input
                      value={filters.lineManager || ""}
                      onChange={(e) => handleFilterChange("lineManager", e.target.value)}
                      placeholder="Filter by manager name..."
                    />
                  </div>
                </>
              )}

              {/* Experience Range - for all talent sources */}
              <div className="space-y-2">
                <Label>Minimum Years of Experience: {filters.minExperience || 0}+</Label>
                <Slider
                  min={0}
                  max={30}
                  step={1}
                  value={[filters.minExperience ?? 0]}
                  onValueChange={([min]) => {
                    onFiltersChange({
                      ...filters,
                      minExperience: min,
                    });
                  }}
                  className="mt-2"
                />
              </div>

              {/* Education Level - for external/all */}
              {filters.talentSource !== "internal" && (
                <div className="space-y-2">
                  <Label>Education Level</Label>
                  <Select
                    value={filters.educationLevel}
                    onValueChange={(value) => handleFilterChange("educationLevel", value === "all" ? undefined : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any level</SelectItem>
                      <SelectItem value="first_degree">First Degree (Bachelor's)</SelectItem>
                      <SelectItem value="advanced_degree">Advanced Degree (Master's/PhD)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Boolean toggles - for external/all */}
              {filters.talentSource !== "internal" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="un-experience">UN Experience</Label>
                    <Switch
                      id="un-experience"
                      checked={filters.hasUNExperience || false}
                      onCheckedChange={(checked) => handleFilterChange("hasUNExperience", checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="relocate">Willing to Relocate</Label>
                    <Switch
                      id="relocate"
                      checked={filters.willingToRelocate || false}
                      onCheckedChange={(checked) => handleFilterChange("willingToRelocate", checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="clearance">Security Clearance</Label>
                    <Switch
                      id="clearance"
                      checked={filters.hasSecurityClearance || false}
                      onCheckedChange={(checked) => handleFilterChange("hasSecurityClearance", checked)}
                    />
                  </div>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  );
}
