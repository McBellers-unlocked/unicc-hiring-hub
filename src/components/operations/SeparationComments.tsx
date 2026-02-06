import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Loader2, MessageSquare, Send, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { MentionableTextarea, renderCommentWithMentions } from './MentionableTextarea';

interface Comment {
  id: string;
  comment_text: string;
  created_at: string;
  author_id: string | null;
  author?: { name: string } | null;
}

interface SeparationCommentsProps {
  separationId: string;
}

export const SeparationComments = ({ separationId }: SeparationCommentsProps) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [newComment, setNewComment] = useState('');

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['separation-comments', separationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_separation_comments')
        .select('id, comment_text, created_at, author_id')
        .eq('separation_id', separationId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Fetch author names separately
      const authorIds = data?.map(c => c.author_id).filter(Boolean) as string[];
      let authors: Record<string, string> = {};
      
      if (authorIds.length > 0) {
        const { data: usersData } = await supabase
          .from('users')
          .select('id, name')
          .in('id', authorIds);
        
        authors = Object.fromEntries((usersData || []).map(u => [u.id, u.name]));
      }
      
      return data?.map(c => ({
        ...c,
        author: c.author_id ? { name: authors[c.author_id] || 'Unknown' } : null,
      })) as Comment[];
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: async (text: string) => {
      const { error } = await supabase
        .from('hr_separation_comments')
        .insert({
          separation_id: separationId,
          author_id: user?.id,
          comment_text: text,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['separation-comments', separationId] });
      queryClient.invalidateQueries({ queryKey: ['hr-separations'] });
      setNewComment('');
      toast.success('Comment added');
    },
    onError: (error) => {
      toast.error('Failed to add comment: ' + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    addCommentMutation.mutate(newComment.trim());
  };

  return (
    <div className="bg-muted/30 rounded-lg p-4 mt-2">
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Comments ({comments.length})</span>
      </div>

      <Separator className="mb-3" />

      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">No comments yet</p>
      ) : (
        <div className="space-y-3 max-h-60 overflow-y-auto mb-3">
          {comments.map((comment) => (
            <div key={comment.id} className="bg-background rounded-md p-3 border">
              <div className="flex items-center gap-2 mb-1">
                <User className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs font-medium">
                  {comment.author?.name || 'Unknown'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                </span>
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {renderCommentWithMentions(comment.comment_text)}
              </p>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <MentionableTextarea
          value={newComment}
          onChange={setNewComment}
          placeholder="Add a comment... (use @ to mention)"
        />
        <Button 
          type="submit" 
          size="icon" 
          disabled={!newComment.trim() || addCommentMutation.isPending}
        >
          {addCommentMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  );
};

// Helper component to show last comment preview in collapsed row
export const LastSeparationCommentPreview = ({ separationId }: { separationId: string }) => {
  const { data: comments } = useQuery({
    queryKey: ['separation-comments', separationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_separation_comments')
        .select('comment_text, created_at')
        .eq('separation_id', separationId)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (error) throw error;
      return data;
    },
  });

  const lastComment = comments?.[0];
  
  if (!lastComment) return null;

  const truncated = lastComment.comment_text.length > 40 
    ? lastComment.comment_text.substring(0, 40) + '...'
    : lastComment.comment_text;

  return (
    <span className="text-xs text-muted-foreground italic">
      "{truncated}"
    </span>
  );
};
