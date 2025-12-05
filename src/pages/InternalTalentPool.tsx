import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InternalTalentFilters } from "@/components/internal-talent/InternalTalentFilters";
import { InternalTalentResults } from "@/components/internal-talent/InternalTalentResults";
import { SavedInternalSearches } from "@/components/internal-talent/SavedInternalSearches";
import { InternalTalentStats } from "@/components/internal-talent/InternalTalentStats";
import { Users, Search, BookmarkCheck, BarChart3 } from "lucide-react";

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

export default function InternalTalentPool() {
  const { userRoles } = useAuth();
  const [filters, setFilters] = useState<InternalTalentFilters>({
    searchText: "",
    divisions: [],
    units: [],
    dutyStations: [],
    skills: [],
    grades: [],
  });
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<string>("name_asc");

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
            <h1 className="text-3xl font-bold">Internal Talent Pool</h1>
            <p className="text-muted-foreground">
              Search and discover UNICC staff by skills, division, and expertise
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
            <InternalTalentFilters
              filters={filters}
              onFiltersChange={setFilters}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              sortBy={sortBy}
              onSortByChange={setSortBy}
            />
            <InternalTalentResults
              filters={filters}
              viewMode={viewMode}
              sortBy={sortBy}
            />
          </TabsContent>

          <TabsContent value="saved">
            <SavedInternalSearches onLoadSearch={setFilters} />
          </TabsContent>

          <TabsContent value="analytics">
            <InternalTalentStats />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
