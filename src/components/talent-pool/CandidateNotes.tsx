import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface CandidateNotesProps {
  candidateId: string;
}

export function CandidateNotes({ candidateId }: CandidateNotesProps) {
  const [newNote, setNewNote] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: notes, isLoading } = useQuery({
    queryKey: ["candidate-notes", candidateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("candidate_notes")
        .select("*, created_by:users(name)")
        .eq("candidate_id", candidateId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createNoteMutation = useMutation({
    mutationFn: async (note: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("candidate_notes").insert({
        candidate_id: candidateId,
        created_by: user.id,
        note,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidate-notes", candidateId] });
      setNewNote("");
      toast({ title: "Note added successfully" });
    },
    onError: () => {
      toast({ title: "Failed to add note", variant: "destructive" });
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase
        .from("candidate_notes")
        .delete()
        .eq("id", noteId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidate-notes", candidateId] });
      toast({ title: "Note deleted" });
    },
  });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Textarea
          placeholder="Add a private note about this candidate..."
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          rows={3}
        />
        <Button
          onClick={() => createNoteMutation.mutate(newNote)}
          disabled={!newNote.trim() || createNoteMutation.isPending}
        >
          {createNoteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Add Note
        </Button>
      </div>

      <div className="space-y-2">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : notes && notes.length > 0 ? (
          notes.map((note: any) => (
            <Card key={note.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1">
                    <p className="text-sm">{note.note}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      By {note.created_by?.name || "Unknown"} •{" "}
                      {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteNoteMutation.mutate(note.id)}
                    disabled={deleteNoteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No notes yet. Add one above.
          </p>
        )}
      </div>
    </div>
  );
}
