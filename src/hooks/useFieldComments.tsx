import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface FieldComment {
  id: string;
  requisition_id: string;
  field_name: string;
  comment_text: string;
  author_id: string;
  parent_comment_id: string | null;
  is_resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  author?: {
    name: string;
    role: string;
  };
  replies?: FieldComment[];
}

export const useFieldComments = (requisitionId: string | undefined, fieldName: string) => {
  const [comments, setComments] = useState<FieldComment[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchComments = async () => {
    if (!requisitionId) return;

    try {
      const { data, error } = await supabase
        .from("requisition_field_comments")
        .select(`
          *,
          author:author_id(name, role)
        `)
        .eq("requisition_id", requisitionId)
        .eq("field_name", fieldName)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching comments:", error);
        throw error;
      }

      // Organize comments into threads
      const commentMap = new Map<string, FieldComment>();
      const rootComments: FieldComment[] = [];

      data?.forEach((comment: any) => {
        const formattedComment: FieldComment = {
          ...comment,
          author: comment.author ? comment.author : undefined,
          replies: [],
        };
        commentMap.set(comment.id, formattedComment);

        if (!comment.parent_comment_id) {
          rootComments.push(formattedComment);
        }
      });

      // Build reply threads
      data?.forEach((comment: any) => {
        if (comment.parent_comment_id) {
          const parent = commentMap.get(comment.parent_comment_id);
          const child = commentMap.get(comment.id);
          if (parent && child) {
            parent.replies!.push(child);
          }
        }
      });

      setComments(rootComments);
    } catch (error: any) {
      console.error("Error fetching comments:", error);
      toast({
        title: "Error loading comments",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();

    if (!requisitionId) return;

    // Subscribe to real-time updates for this specific field
    const channel = supabase
      .channel(`comments:${requisitionId}:${fieldName}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "requisition_field_comments",
          filter: `requisition_id=eq.${requisitionId}`,
        },
        (payload) => {
          console.log("Comment change detected:", payload);
          // Only refetch if the change is for this field
          if (payload.new && (payload.new as any).field_name === fieldName) {
            fetchComments();
          } else if (payload.old && (payload.old as any).field_name === fieldName) {
            fetchComments();
          }
        }
      )
      .subscribe((status) => {
        console.log("Realtime subscription status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [requisitionId, fieldName]);

  const addComment = async (commentText: string, parentCommentId?: string) => {
    if (!requisitionId) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase.from("requisition_field_comments").insert({
        requisition_id: requisitionId,
        field_name: fieldName,
        comment_text: commentText,
        author_id: user.id,
        parent_comment_id: parentCommentId || null,
      }).select();

      if (error) {
        console.error("Error adding comment:", error);
        throw error;
      }

      console.log("Comment added successfully:", data);
      
      // Immediately refetch to show the new comment
      await fetchComments();

      toast({
        title: "Comment added",
        description: "Your comment has been posted successfully.",
      });
    } catch (error: any) {
      console.error("Error adding comment:", error);
      toast({
        title: "Error adding comment",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resolveComment = async (commentId: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("requisition_field_comments")
        .update({
          is_resolved: true,
          resolved_by: user.id,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", commentId);

      if (error) throw error;

      toast({
        title: "Comment resolved",
        description: "The comment has been marked as resolved.",
      });
    } catch (error: any) {
      console.error("Error resolving comment:", error);
      toast({
        title: "Error resolving comment",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from("requisition_field_comments")
        .delete()
        .eq("id", commentId);

      if (error) throw error;

      toast({
        title: "Comment deleted",
        description: "The comment has been removed.",
      });
    } catch (error: any) {
      console.error("Error deleting comment:", error);
      toast({
        title: "Error deleting comment",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const unresolveComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from("requisition_field_comments")
        .update({
          is_resolved: false,
          resolved_by: null,
          resolved_at: null,
        })
        .eq("id", commentId);

      if (error) throw error;

      toast({
        title: "Comment reopened",
        description: "The comment has been marked as unresolved.",
      });
    } catch (error: any) {
      console.error("Error unresolving comment:", error);
      toast({
        title: "Error reopening comment",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return {
    comments,
    loading,
    addComment,
    resolveComment,
    deleteComment,
    unresolveComment,
    refetch: fetchComments,
  };
};
