import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TalentSearchFilters } from "@/components/talent-pool/TalentSearchFilters";
import { TalentSearchResults } from "@/components/talent-pool/TalentSearchResults";
import { SavedSearchManager } from "@/components/talent-pool/SavedSearchManager";
import { TalentPoolStats } from "@/components/talent-pool/TalentPoolStats";
import { SelectionActionBar } from "@/components/talent-pool/SelectionActionBar";
import { BulkEmailDialog } from "@/components/talent-pool/BulkEmailDialog";
import { Users, Search, BookmarkCheck, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export interface SearchFilters {
  searchText: string;
  locations: string[];
  minExperience?: number;
  maxExperience?: number;
  education: string[];
  languages: string[];
  skills: string[];
  hasUNExperience?: boolean;
  availability: string[];
  willingToRelocate?: boolean;
  hasSecurityClearance?: boolean;
  workPreferences: string[];
  gender?: string;
  selectedJobId?: string;
  educationLevel?: string;
  // Internal talent filters
  talentSource: "all" | "external" | "internal";
  divisions: string[];
  dutyStations: string[];
  grades: string[];
  minTenure?: number;
  maxTenure?: number;
  lineManager?: string;
}

export default function TalentPool() {
  const { userRoles } = useAuth();
  const [filters, setFilters] = useState<SearchFilters>({
    searchText: "",
    locations: [],
    education: [],
    languages: [],
    skills: [],
    availability: [],
    workPreferences: [],
    talentSource: "all",
    divisions: [],
    dutyStations: [],
    grades: [],
  });
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<string>("updated_desc");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);

  // Clear selection when filters change
  useEffect(() => {
    setSelectedIds([]);
  }, [filters.talentSource, filters.skills, filters.searchText, filters.divisions, filters.dutyStations, filters.grades]);

  // Fetch selected staff details for email dialog
  const { data: selectedStaff } = useQuery({
    queryKey: ["selected-staff", selectedIds],
    queryFn: async () => {
      if (selectedIds.length === 0) return [];
      const { data, error } = await supabase
        .from("users")
        .select("id, name, email, job_title")
        .in("id", selectedIds);
      if (error) throw error;
      return data.map((s) => ({
        id: s.id,
        name: s.name || s.email,
        email: s.email,
        position: s.job_title,
      }));
    },
    enabled: selectedIds.length > 0,
  });

  const handleRemoveRecipient = (id: string) => {
    setSelectedIds((prev) => prev.filter((sid) => sid !== id));
  };

  const showSelection = filters.talentSource !== "external";

  // Check if user has appropriate role
  const hasAccess = userRoles.some(role => 
    ["Admin", "HR Assistant", "Chief of HR", "Hiring Manager", "Director"].includes(role)
  );

  if (!hasAccess) {
    return <Navigate to="/" replace />;
  }

  return (
    <Layout>
      <div className="container mx-auto py-6 px-4">
        <div className="flex items-center gap-3 mb-6">
          <Users className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Talent Pool</h1>
            <p className="text-muted-foreground">
              Search and source candidates from your existing applicant pool
            </p>
          </div>
        </div>

        <Tabs defaultValue="search" className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
            <TabsTrigger value="search" className="gap-2">
              <Search className="h-4 w-4" />
              Search
            </TabsTrigger>
            <TabsTrigger value="saved" className="gap-2">
              <BookmarkCheck className="h-4 w-4" />
              Saved Searches
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-6">
            <TalentSearchFilters
              filters={filters}
              onFiltersChange={setFilters}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              sortBy={sortBy}
              onSortByChange={setSortBy}
            />
            <TalentSearchResults
              filters={filters}
              viewMode={viewMode}
              sortBy={sortBy}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              showSelection={showSelection}
            />
          </TabsContent>

          <TabsContent value="saved">
            <SavedSearchManager onLoadSearch={setFilters} />
          </TabsContent>

          <TabsContent value="analytics">
            <TalentPoolStats />
          </TabsContent>
        </Tabs>

        {/* Selection Action Bar */}
        <SelectionActionBar
          selectedCount={selectedIds.length}
          onClearSelection={() => setSelectedIds([])}
          onEmailSelected={() => setEmailDialogOpen(true)}
        />

        {/* Bulk Email Dialog */}
        <BulkEmailDialog
          open={emailDialogOpen}
          onClose={() => {
            setEmailDialogOpen(false);
            setSelectedIds([]);
          }}
          recipients={selectedStaff || []}
          onRemoveRecipient={handleRemoveRecipient}
        />
      </div>
    </Layout>
  );
}
