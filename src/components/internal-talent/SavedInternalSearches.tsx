import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Trash2, Share2, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { InternalTalentFilters } from "@/pages/InternalTalentPool";

interface SavedInternalSearchesProps {
  onLoadSearch: (filters: InternalTalentFilters) => void;
}

export function SavedInternalSearches({ onLoadSearch }: SavedInternalSearchesProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: searches, isLoading } = useQuery({
    queryKey: ["internal-talent-saved-searches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("internal_talent_saved_searches")
        .select("*, creator:users!internal_talent_saved_searches_created_by_fkey(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("internal_talent_saved_searches")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["internal-talent-saved-searches"] });
      toast({ title: "Search deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Error deleting search", description: error.message, variant: "destructive" });
    },
  });

  const loadSearch = (search: any) => {
    const filters = search.filters as InternalTalentFilters;
    onLoadSearch({
      searchText: filters.searchText || "",
      divisions: filters.divisions || [],
      units: filters.units || [],
      dutyStations: filters.dutyStations || [],
      skills: filters.skills || [],
      grades: filters.grades || [],
      minTenure: filters.minTenure,
      maxTenure: filters.maxTenure,
      lineManager: filters.lineManager,
    });
    toast({ title: "Search loaded", description: `Loaded "${search.name}"` });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!searches?.length) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Search className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No saved searches</h3>
          <p className="text-muted-foreground text-center">
            Save your search filters to quickly access them later.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {searches.map((search) => {
        const filters = search.filters as any;
        const filterCount = [
          filters.divisions?.length || 0,
          filters.dutyStations?.length || 0,
          filters.grades?.length || 0,
          filters.skills?.length || 0,
          filters.searchText ? 1 : 0,
          filters.lineManager ? 1 : 0,
        ].reduce((a, b) => a + b, 0);

        return (
          <Card key={search.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{search.name}</CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(search.created_at), "MMM d, yyyy")}
                  </CardDescription>
                </div>
                {search.is_shared && (
                  <Badge variant="secondary" className="gap-1">
                    <Share2 className="h-3 w-3" />
                    Shared
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-1">
                {filters.divisions?.map((d: string) => (
                  <Badge key={d} variant="outline" className="text-xs">{d}</Badge>
                ))}
                {filters.dutyStations?.map((s: string) => (
                  <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                ))}
                {filters.grades?.map((g: string) => (
                  <Badge key={g} variant="outline" className="text-xs">{g}</Badge>
                ))}
                {filterCount === 0 && (
                  <span className="text-sm text-muted-foreground">No filters</span>
                )}
              </div>

              {search.description && (
                <p className="text-sm text-muted-foreground">{search.description}</p>
              )}

              <p className="text-xs text-muted-foreground">
                Created by {(search as any).creator?.name || "Unknown"}
              </p>

              <div className="flex gap-2 pt-2">
                <Button size="sm" onClick={() => loadSearch(search)} className="flex-1">
                  Load Search
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => deleteMutation.mutate(search.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
