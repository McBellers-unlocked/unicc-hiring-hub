import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2, Search, Share2, Calendar } from "lucide-react";
import { SearchFilters } from "@/pages/TalentPool";
import { formatDistanceToNow } from "date-fns";

interface SavedSearchManagerProps {
  onLoadSearch: (filters: SearchFilters) => void;
}

export function SavedSearchManager({ onLoadSearch }: SavedSearchManagerProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [searchName, setSearchName] = useState("");
  const [isShared, setIsShared] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: searches, isLoading } = useQuery({
    queryKey: ["talent-pool-searches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("talent_pool_searches")
        .select("*, created_by:users(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const deleteSearchMutation = useMutation({
    mutationFn: async (searchId: string) => {
      const { error } = await supabase
        .from("talent_pool_searches")
        .delete()
        .eq("id", searchId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["talent-pool-searches"] });
      toast({ title: "Search deleted" });
    },
  });

  const loadSearch = (search: any) => {
    const filters = search.search_criteria as SearchFilters;
    onLoadSearch(filters);
    toast({ title: `Loaded search: ${search.name}` });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Saved Searches</h2>
      </div>

      {searches && searches.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {searches.map((search: any) => (
            <Card key={search.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-lg">
                  <span className="truncate">{search.name}</span>
                  {search.is_shared && (
                    <Share2 className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-2" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-muted-foreground space-y-1">
                  <p className="flex items-center gap-2">
                    <Calendar className="h-3 w-3" />
                    {new Date(search.created_at).toLocaleDateString('en-GB')}
                  </p>
                  <p>By {search.created_by?.name || "Unknown"}</p>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    onClick={() => loadSearch(search)}
                    className="flex-1 gap-2"
                    variant="outline"
                  >
                    <Search className="h-4 w-4" />
                    Load
                  </Button>
                  <Button
                    onClick={() => deleteSearchMutation.mutate(search.id)}
                    variant="ghost"
                    size="icon"
                    disabled={deleteSearchMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No saved searches yet. Save a search from the Search tab.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
