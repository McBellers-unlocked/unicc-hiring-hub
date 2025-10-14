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
import { Search, Filter, X, Grid3x3, List, Save } from "lucide-react";
import { SearchFilters } from "@/pages/TalentPool";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface TalentSearchFiltersProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
  sortBy: string;
  onSortByChange: (sort: string) => void;
}

export function TalentSearchFilters({
  filters,
  onFiltersChange,
  viewMode,
  onViewModeChange,
  sortBy,
  onSortByChange,
}: TalentSearchFiltersProps) {
  const [isFiltersOpen, setIsFiltersOpen] = useState(true);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const { toast } = useToast();

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

  const clearFilters = () => {
    onFiltersChange({
      searchText: "",
      locations: [],
      education: [],
      languages: [],
      skills: [],
      availability: [],
      workPreferences: [],
    });
  };

  const activeFilterCount = Object.values(filters).filter(
    (v) => v !== undefined && v !== "" && (Array.isArray(v) ? v.length > 0 : true)
  ).length;

  return (
    <div className="space-y-4">
      {/* Search bar and controls */}
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, position, organization, skills..."
              value={filters.searchText}
              onChange={(e) => handleFilterChange("searchText", e.target.value)}
              className="pl-9"
            />
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
              {/* Job Matching */}
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

              {/* Experience Range */}
              <div className="space-y-2">
                <Label>Years of Experience: {filters.minExperience || 0} - {filters.maxExperience || 30}+</Label>
                <Slider
                  min={0}
                  max={30}
                  step={1}
                  value={[filters.minExperience ?? 0, filters.maxExperience ?? 30]}
                  onValueChange={([min, max]) => {
                    onFiltersChange({
                      ...filters,
                      minExperience: min,
                      maxExperience: max,
                    });
                  }}
                  className="mt-2"
                />
              </div>

              {/* Education Level */}
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

              {/* Boolean toggles */}
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
            </div>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  );
}
