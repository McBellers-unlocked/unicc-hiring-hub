import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TalentSearchFilters } from "@/components/talent-pool/TalentSearchFilters";
import { TalentSearchResults } from "@/components/talent-pool/TalentSearchResults";
import { SavedSearchManager } from "@/components/talent-pool/SavedSearchManager";
import { TalentPoolStats } from "@/components/talent-pool/TalentPoolStats";
import { Users, Search, BookmarkCheck, BarChart3 } from "lucide-react";

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
            />
          </TabsContent>

          <TabsContent value="saved">
            <SavedSearchManager onLoadSearch={setFilters} />
          </TabsContent>

          <TabsContent value="analytics">
            <TalentPoolStats />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
