import React, { useState, useRef, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import * as Diff from "diff";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { MessageSquarePlus } from "lucide-react";
import CommentIndicator from "@/components/CommentIndicator";
import CommentPanel from "@/components/CommentPanel";
import { useFieldComments } from "@/hooks/useFieldComments";

interface EditableTrackChangesFieldWithHighlightProps {
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

const EditableTrackChangesFieldWithHighlight: React.FC<EditableTrackChangesFieldWithHighlightProps> = ({
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
  const [selectedText, setSelectedText] = useState<{ text: string; start: number; end: number } | null>(null);
  const [showQuickComment, setShowQuickComment] = useState(false);
  const [quickCommentPosition, setQuickCommentPosition] = useState({ top: 0, left: 0 });
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

  useEffect(() => {
    if (isFocused) {
      adjustHeight();
    }
  }, [currentValue, isFocused]);

  // Handle text selection
  const handleTextSelection = () => {
    const selection = window.getSelection();
    const selectedStr = selection?.toString().trim();
    
    if (selectedStr && selectedStr.length > 0 && previewRef.current) {
      const range = selection?.getRangeAt(0);
      if (range) {
        const rect = range.getBoundingClientRect();
        const containerRect = previewRef.current.getBoundingClientRect();
        
        // Find the selection position in the original text
        const preNode = range.startContainer;
        const textContent = currentValue || "";
        const start = textContent.indexOf(selectedStr);
        
        if (start !== -1) {
          setSelectedText({
            text: selectedStr,
            start: start,
            end: start + selectedStr.length
          });
          
          setQuickCommentPosition({
            top: rect.bottom - containerRect.top + 5,
            left: rect.left - containerRect.left
          });
          setShowQuickComment(true);
        }
      }
    } else {
      setShowQuickComment(false);
      setSelectedText(null);
    }
  };

  const handleAddCommentToSelection = () => {
    if (selectedText) {
      setCommentsPanelOpen(true);
      setShowQuickComment(false);
    }
  };

  const handleAddComment = (text: string, parentId?: string) => {
    if (selectedText && !parentId) {
      // Adding a new comment with selected text
      addComment(text, undefined, selectedText);
      setSelectedText(null);
      setShowQuickComment(false);
    } else {
      // Adding a reply or regular comment
      addComment(text, parentId);
    }
  };

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

  // Generate HTML with track changes and highlights
  const generateHTML = () => {
    let html = "";
    
    if (currentValue !== originalValue) {
      const diff = Diff.diffWords(originalValue || "", currentValue || "");
      
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
    } else {
      html = escapeHtml(currentValue || "");
    }

    // Add highlights for comments with selections
    comments.forEach((comment) => {
      if (comment.highlighted_text && comment.selection_start !== null && comment.selection_end !== null) {
        const highlightStyle = comment.is_resolved 
          ? "background-color: #e0e0e0; border-bottom: 2px solid #9ca3af;" 
          : "background-color: #fef3c7; border-bottom: 2px solid #f59e0b;";
        
        // Note: This is a simplified approach. For production, you'd want a more robust highlighting system
        const escapedText = escapeHtml(comment.highlighted_text);
        html = html.replace(
          escapedText,
          `<mark style="${highlightStyle}" title="Comment: ${comment.comment_text}">${escapedText}</mark>`
        );
      }
    });
    
    return html || '<span style="color: #9ca3af;">No content</span>';
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
        <div className="flex items-center gap-2">
          {selectedText && showQuickComment && (
            <Button
              variant="default"
              size="sm"
              onClick={handleAddCommentToSelection}
              className="h-7 gap-1.5 px-2"
            >
              <MessageSquarePlus className="h-4 w-4" />
              Comment on Selection
            </Button>
          )}
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
                  onAddComment={handleAddComment}
                  onResolveComment={resolveComment}
                  onUnresolveComment={unresolveComment}
                  onDeleteComment={deleteComment}
                  currentUserId={currentUserId}
                  canResolve={canResolveComments}
                  selectedText={selectedText?.text}
                />
              </PopoverContent>
            </Popover>
          )}
        </div>
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
          onMouseUp={handleTextSelection}
          className={cn(
            "min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
            "whitespace-pre-wrap break-words cursor-text select-text",
            disabled && "cursor-not-allowed opacity-50"
          )}
          dangerouslySetInnerHTML={{ __html: generateHTML() }}
        />
      )}
    </div>
  );
};

export default EditableTrackChangesFieldWithHighlight;
