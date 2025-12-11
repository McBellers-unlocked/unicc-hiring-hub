import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Search, Filter, Grid, List, ChevronDown, X, Save } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface InternalTalentFilters {
  searchText: string;
  divisions: string[];
  units: string[];
  dutyStations: string[];
  skills: string[];
  grades: string[];
  minTenure?: number;
  maxTenure?: number;
  lineManager?: string;
}

interface InternalTalentFiltersProps {
  filters: InternalTalentFilters;
  onFiltersChange: (filters: InternalTalentFilters) => void;
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
  sortBy: string;
  onSortByChange: (sort: string) => void;
}

const DIVISIONS = ["CS", "DS", "DD", "DO", "MS", "OP"];
const DUTY_STATIONS = ["Valencia", "Brindisi", "Geneva", "New York", "Rome"];
const GRADES = ["G-4", "G-5", "G-6", "G-7", "P-2", "P-3", "P-4", "P-5", "D-1", "D-2"];

export function InternalTalentFilters({
  filters,
  onFiltersChange,
  viewMode,
  onViewModeChange,
  sortBy,
  onSortByChange,
}: InternalTalentFiltersProps) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [searchName, setSearchName] = useState("");
  const [isShared, setIsShared] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleFilterChange = (key: keyof InternalTalentFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const toggleArrayFilter = (key: keyof InternalTalentFilters, value: string) => {
    const current = filters[key] as string[];
    if (current.includes(value)) {
      handleFilterChange(key, current.filter(v => v !== value));
    } else {
      handleFilterChange(key, [...current, value]);
    }
  };

  const clearFilters = () => {
    onFiltersChange({
      searchText: "",
      divisions: [],
      units: [],
      dutyStations: [],
      skills: [],
      grades: [],
    });
  };

  const saveSearch = async () => {
    if (!searchName.trim() || !user) return;

    const { error } = await supabase
      .from("internal_talent_saved_searches")
      .insert({
        name: searchName,
        filters: filters as any,
        is_shared: isShared,
        created_by: user.id,
      });

    if (error) {
      toast({ title: "Error saving search", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Search saved successfully" });
      setSaveDialogOpen(false);
      setSearchName("");
    }
  };

  const activeFilterCount = [
    filters.divisions.length,
    filters.units.length,
    filters.dutyStations.length,
    filters.skills.length,
    filters.grades.length,
    filters.minTenure ? 1 : 0,
    filters.maxTenure ? 1 : 0,
    filters.lineManager ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-4">
      {/* Main Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, job title, or skills..."
            value={filters.searchText}
            onChange={(e) => handleFilterChange("searchText", e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant={viewMode === "grid" ? "default" : "outline"}
          size="icon"
          onClick={() => onViewModeChange("grid")}
        >
          <Grid className="h-4 w-4" />
        </Button>
        <Button
          variant={viewMode === "list" ? "default" : "outline"}
          size="icon"
          onClick={() => onViewModeChange("list")}
        >
          <List className="h-4 w-4" />
        </Button>
        <Select value={sortBy} onValueChange={onSortByChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name_asc">Name (A-Z)</SelectItem>
            <SelectItem value="name_desc">Name (Z-A)</SelectItem>
            <SelectItem value="tenure_desc">Tenure (Longest)</SelectItem>
            <SelectItem value="tenure_asc">Tenure (Shortest)</SelectItem>
            <SelectItem value="division">Division</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Advanced Filters */}
      <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
        <div className="flex items-center gap-2">
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Advanced Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {activeFilterCount}
                </Badge>
              )}
              <ChevronDown className={`h-4 w-4 transition-transform ${isAdvancedOpen ? "rotate-180" : ""}`} />
            </Button>
          </CollapsibleTrigger>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
          <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="ml-auto gap-2">
                <Save className="h-4 w-4" />
                Save Search
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Save Search</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Search Name</Label>
                  <Input
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    placeholder="e.g., CS Division Senior Staff"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="shared"
                    checked={isShared}
                    onCheckedChange={(checked) => setIsShared(checked as boolean)}
                  />
                  <Label htmlFor="shared">Share with team</Label>
                </div>
                <Button onClick={saveSearch} disabled={!searchName.trim()} className="w-full">
                  Save Search
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <CollapsibleContent className="pt-4">
          <Card>
            <CardContent className="p-4 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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

              {/* Tenure Range */}
              <div className="space-y-2 md:col-span-2 lg:col-span-3">
                <Label className="text-sm font-medium">
                  Minimum Years at UNICC: {filters.minTenure || 0}+ years
                </Label>
                <Slider
                  min={0}
                  max={30}
                  step={1}
                  value={[filters.minTenure || 0]}
                  onValueChange={([min]) => {
                    handleFilterChange("minTenure", min);
                  }}
                  className="w-full"
                />
              </div>

              {/* Line Manager */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Line Manager</Label>
                <Input
                  value={filters.lineManager || ""}
                  onChange={(e) => handleFilterChange("lineManager", e.target.value)}
                  placeholder="Filter by manager name..."
                />
              </div>

              {/* Skills */}
              <div className="space-y-2 md:col-span-2">
                <Label className="text-sm font-medium">Skills (comma-separated)</Label>
                <Input
                  value={filters.skills.join(", ")}
                  onChange={(e) => handleFilterChange("skills", e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
                  placeholder="e.g., Python, Cloud, Security..."
                />
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
