import React, { useState, useRef, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import * as Diff from "diff";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import CommentIndicator from "@/components/CommentIndicator";
import CommentPanel from "@/components/CommentPanel";
import { useFieldComments } from "@/hooks/useFieldComments";

interface EditableTrackChangesFieldProps {
  label: string;
  originalValue: string;
  currentValue: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  requisitionId?: string;
  fieldName?: string;
  currentUserId?: string;
  canResolveComments?: boolean;
}

const EditableTrackChangesField: React.FC<EditableTrackChangesFieldProps> = ({
  label,
  originalValue,
  currentValue,
  onChange,
  disabled = false,
  className,
  requisitionId,
  fieldName,
  currentUserId,
  canResolveComments = false,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [commentsPanelOpen, setCommentsPanelOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const {
    comments,
    loading: commentsLoading,
    addComment,
    resolveComment,
    unresolveComment,
    deleteComment,
  } = useFieldComments(requisitionId, fieldName || "");

  const totalComments = comments.length + comments.reduce((sum, c) => sum + (c.replies?.length || 0), 0);
  const unresolvedComments = comments.filter((c) => !c.is_resolved).length +
    comments.reduce((sum, c) => sum + (c.replies?.filter((r) => !r.is_resolved).length || 0), 0);

  // Auto-adjust textarea height
  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  // Adjust height when content changes or when switching to edit mode
  useEffect(() => {
    if (isFocused) {
      adjustHeight();
    }
  }, [currentValue, isFocused]);

  // Escape HTML to prevent XSS
  const escapeHtml = (text: string): string => {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;")
      .replace(/\n/g, "<br>");
  };

  // Generate HTML with track changes (comparing current to original)
  const generateHTML = () => {
    if (currentValue !== originalValue) {
      const diff = Diff.diffWords(originalValue || "", currentValue || "");
      let html = "";
      
      diff.forEach((part) => {
        const text = escapeHtml(part.value);
        if (part.removed) {
          html += `<span style="color: #dc2626; text-decoration: line-through; background-color: #fee2e2;" title="Removed">${text}</span>`;
        } else if (part.added) {
          html += `<span style="color: #16a34a; text-decoration: underline; background-color: #f0fdf4;" title="Added">${text}</span>`;
        } else {
          html += text;
        }
      });
      
      return html || '<span style="color: #9ca3af;">No content</span>';
    }
    
    // No changes, show plain text
    return escapeHtml(currentValue || "") || '<span style="color: #9ca3af;">No content</span>';
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    adjustHeight();
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{label}</Label>
        {requisitionId && fieldName && (
          <Popover open={commentsPanelOpen} onOpenChange={setCommentsPanelOpen}>
            <PopoverTrigger asChild>
              <div>
                <CommentIndicator
                  totalCount={totalComments}
                  unresolvedCount={unresolvedComments}
                  onClick={() => setCommentsPanelOpen(!commentsPanelOpen)}
                />
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="end">
              <CommentPanel
                comments={comments}
                onAddComment={addComment}
                onResolveComment={resolveComment}
                onUnresolveComment={unresolveComment}
                onDeleteComment={deleteComment}
                currentUserId={currentUserId}
                canResolve={canResolveComments}
              />
            </PopoverContent>
          </Popover>
        )}
      </div>

      {isFocused ? (
        <Textarea
          ref={textareaRef}
          value={currentValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled}
          autoFocus
          className="min-h-[120px] w-full resize-none overflow-hidden"
        />
      ) : (
        <div
          ref={previewRef}
          onClick={handleFocus}
          className={cn(
            "min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
            "whitespace-pre-wrap break-words cursor-text",
            disabled && "cursor-not-allowed opacity-50"
          )}
          dangerouslySetInnerHTML={{ __html: generateHTML() }}
        />
      )}
    </div>
  );
};

export default EditableTrackChangesField;
