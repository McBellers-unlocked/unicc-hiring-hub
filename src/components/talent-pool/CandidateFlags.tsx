import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, X, Flag } from "lucide-react";

const FLAG_TYPES = [
  { value: "high_potential", label: "High Potential", variant: "default" as const },
  { value: "future_opportunity", label: "Future Opportunity", variant: "secondary" as const },
  { value: "roster", label: "Roster Candidate", variant: "outline" as const },
  { value: "shortlist", label: "Shortlisted", variant: "default" as const },
];

interface CandidateFlagsProps {
  candidateId: string;
}

export function CandidateFlags({ candidateId }: CandidateFlagsProps) {
  const [selectedFlag, setSelectedFlag] = useState("");
  const [flagNotes, setFlagNotes] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: flags, isLoading } = useQuery({
    queryKey: ["candidate-flags", candidateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("candidate_flags")
        .select("*, flagged_by:users(name)")
        .eq("candidate_id", candidateId);
      if (error) throw error;
      return data;
    },
  });

  const addFlagMutation = useMutation({
    mutationFn: async ({ type, notes }: { type: string; notes: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("candidate_flags").insert({
        candidate_id: candidateId,
        flagged_by: user.id,
        flag_type: type,
        notes,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidate-flags", candidateId] });
      setSelectedFlag("");
      setFlagNotes("");
      toast({ title: "Flag added successfully" });
    },
  });

  const removeFlagMutation = useMutation({
    mutationFn: async (flagId: string) => {
      const { error } = await supabase
        .from("candidate_flags")
        .delete()
        .eq("id", flagId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidate-flags", candidateId] });
      toast({ title: "Flag removed" });
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold mb-2 flex items-center gap-2">
          <Flag className="h-4 w-4" />
          Candidate Flags
        </h3>
        <div className="flex flex-wrap gap-2 mb-4">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : flags && flags.length > 0 ? (
            flags.map((flag: any) => {
              const flagType = FLAG_TYPES.find((t) => t.value === flag.flag_type);
              return (
                <Badge
                  key={flag.id}
                  variant={flagType?.variant || "outline"}
                  className="gap-2"
                >
                  {flagType?.label || flag.flag_type}
                  <button
                    onClick={() => removeFlagMutation.mutate(flag.id)}
                    className="hover:bg-background/20 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground">No flags</p>
          )}
        </div>
      </div>

      <div className="space-y-2 pt-2 border-t">
        <Select value={selectedFlag} onValueChange={setSelectedFlag}>
          <SelectTrigger>
            <SelectValue placeholder="Add a flag..." />
          </SelectTrigger>
          <SelectContent>
            {FLAG_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedFlag && (
          <>
            <Textarea
              placeholder="Optional notes about this flag..."
              value={flagNotes}
              onChange={(e) => setFlagNotes(e.target.value)}
              rows={2}
            />
            <Button
              onClick={() => addFlagMutation.mutate({ type: selectedFlag, notes: flagNotes })}
              disabled={addFlagMutation.isPending}
              size="sm"
            >
              {addFlagMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Flag
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
