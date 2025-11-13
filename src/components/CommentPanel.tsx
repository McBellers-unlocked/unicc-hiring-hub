import React, { useState } from "react";
import { format } from "date-fns";
import { Check, Trash2, Reply, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { FieldComment } from "@/hooks/useFieldComments";

interface CommentPanelProps {
  comments: FieldComment[];
  onAddComment: (text: string, parentId?: string) => void;
  onResolveComment: (commentId: string) => void;
  onUnresolveComment: (commentId: string) => void;
  onDeleteComment: (commentId: string) => void;
  currentUserId?: string;
  canResolve?: boolean;
}

const CommentThread: React.FC<{
  comment: FieldComment;
  onReply: (parentId: string) => void;
  onResolve: (commentId: string) => void;
  onUnresolve: (commentId: string) => void;
  onDelete: (commentId: string) => void;
  currentUserId?: string;
  canResolve?: boolean;
  isReply?: boolean;
}> = ({
  comment,
  onReply,
  onResolve,
  onUnresolve,
  onDelete,
  currentUserId,
  canResolve,
  isReply = false,
}) => {
  const isOwner = currentUserId === comment.author_id;

  return (
    <div className={cn("space-y-2", isReply && "ml-8 mt-2")}>
      <div
        className={cn(
          "rounded-lg border bg-card p-3",
          comment.is_resolved && "opacity-60 bg-muted"
        )}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{comment.author?.name || "Unknown"}</span>
            <Badge variant="outline" className="text-xs">
              {comment.author?.role || "User"}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {format(new Date(comment.created_at), "MMM d, yyyy 'at' h:mm a")}
            </span>
            {comment.is_resolved && (
              <Badge variant="secondary" className="text-xs">
                Resolved
              </Badge>
            )}
          </div>
        </div>

        <p className="text-sm whitespace-pre-wrap break-words mb-3">{comment.comment_text}</p>

        <div className="flex items-center gap-2">
          {!comment.is_resolved && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onReply(comment.id)}
              className="h-7 gap-1 text-xs"
            >
              <Reply className="h-3 w-3" />
              Reply
            </Button>
          )}

          {canResolve && !comment.is_resolved && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onResolve(comment.id)}
              className="h-7 gap-1 text-xs"
            >
              <Check className="h-3 w-3" />
              Resolve
            </Button>
          )}

          {canResolve && comment.is_resolved && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onUnresolve(comment.id)}
              className="h-7 gap-1 text-xs"
            >
              <RotateCcw className="h-3 w-3" />
              Reopen
            </Button>
          )}

          {isOwner && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(comment.id)}
              className="h-7 gap-1 text-xs text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
              Delete
            </Button>
          )}
        </div>
      </div>

      {comment.replies && comment.replies.length > 0 && (
        <div className="space-y-2">
          {comment.replies.map((reply) => (
            <CommentThread
              key={reply.id}
              comment={reply}
              onReply={onReply}
              onResolve={onResolve}
              onUnresolve={onUnresolve}
              onDelete={onDelete}
              currentUserId={currentUserId}
              canResolve={canResolve}
              isReply
            />
          ))}
        </div>
      )}
    </div>
  );
};

const CommentPanel: React.FC<CommentPanelProps> = ({
  comments,
  onAddComment,
  onResolveComment,
  onUnresolveComment,
  onDeleteComment,
  currentUserId,
  canResolve = false,
}) => {
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const handleAddComment = () => {
    if (newComment.trim()) {
      onAddComment(newComment);
      setNewComment("");
    }
  };

  const handleAddReply = (parentId: string) => {
    if (replyText.trim()) {
      onAddComment(replyText, parentId);
      setReplyText("");
      setReplyingTo(null);
    }
  };

  const handleReply = (parentId: string) => {
    setReplyingTo(parentId);
  };

  return (
    <div className="flex flex-col h-full max-h-[600px]">
      <div className="p-4 border-b">
        <h3 className="font-semibold">Comments</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {comments.length === 0
            ? "No comments yet"
            : `${comments.length} comment${comments.length !== 1 ? "s" : ""}`}
        </p>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {comments.map((comment) => (
            <CommentThread
              key={comment.id}
              comment={comment}
              onReply={handleReply}
              onResolve={onResolveComment}
              onUnresolve={onUnresolveComment}
              onDelete={onDeleteComment}
              currentUserId={currentUserId}
              canResolve={canResolve}
            />
          ))}
        </div>
      </ScrollArea>

      <div className="p-4 border-t space-y-3">
        {replyingTo && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Reply to comment</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setReplyingTo(null);
                  setReplyText("");
                }}
              >
                Cancel
              </Button>
            </div>
            <Textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write a reply..."
              className="min-h-[60px] resize-none"
            />
            <Button
              onClick={() => handleAddReply(replyingTo)}
              disabled={!replyText.trim()}
              size="sm"
              className="w-full"
            >
              Post Reply
            </Button>
            <Separator />
          </div>
        )}

        <div className="space-y-2">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="min-h-[80px] resize-none"
          />
          <Button
            onClick={handleAddComment}
            disabled={!newComment.trim()}
            className="w-full"
          >
            Post Comment
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CommentPanel;
