import React, { useRef, useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import * as Diff from "diff";

interface EditableTrackChangesFieldProps {
  label: string;
  originalValue: string;
  hrValue: string;
  currentValue: string;
  onChange: (value: string) => void;
  hrChangesAccepted: boolean;
  onAcceptHRChanges: () => void;
  disabled?: boolean;
  className?: string;
}

const EditableTrackChangesField: React.FC<EditableTrackChangesFieldProps> = ({
  label,
  originalValue,
  hrValue,
  currentValue,
  onChange,
  hrChangesAccepted,
  onAcceptHRChanges,
  disabled = false,
  className,
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Check if there are HR changes
  const hasHRChanges = originalValue !== hrValue;

  // Generate HTML with track changes
  const generateHTML = () => {
    let html = "";

    if (!hrChangesAccepted && hasHRChanges) {
      // Show HR's changes (original -> HR)
      const hrDiff = Diff.diffWords(originalValue || "", hrValue || "");
      
      hrDiff.forEach((part) => {
        const text = escapeHtml(part.value);
        if (part.removed) {
          html += `<span class="text-red-600 line-through bg-red-50 px-0.5" data-change="hr-delete" title="Removed by HR">${text}</span>`;
        } else if (part.added) {
          html += `<span class="text-green-600 underline bg-green-50 px-0.5" data-change="hr-add" title="Added by HR">${text}</span>`;
        } else {
          html += text;
        }
      });

      // If Chief HR made additional changes on top of HR's version
      if (currentValue !== hrValue) {
        // Show Chief HR's changes (HR -> Current)
        const chiefDiff = Diff.diffWords(hrValue || "", currentValue || "");
        let chiefHTML = "";
        
        chiefDiff.forEach((part) => {
          const text = escapeHtml(part.value);
          if (part.removed) {
            chiefHTML += `<span class="text-blue-600 line-through bg-blue-50 px-0.5" data-change="chief-delete" title="Removed by Chief HR">${text}</span>`;
          } else if (part.added) {
            chiefHTML += `<span class="text-purple-600 underline bg-purple-50 px-0.5" data-change="chief-add" title="Added by Chief HR">${text}</span>`;
          } else {
            chiefHTML += text;
          }
        });

        return chiefHTML;
      }
    } else {
      // HR changes accepted or no HR changes, show Chief HR's changes
      const baseline = hrChangesAccepted ? hrValue : originalValue;
      
      if (currentValue !== baseline) {
        const chiefDiff = Diff.diffWords(baseline || "", currentValue || "");
        
        chiefDiff.forEach((part) => {
          const text = escapeHtml(part.value);
          if (part.removed) {
            html += `<span class="text-blue-600 line-through bg-blue-50 px-0.5" data-change="chief-delete" title="Removed by Chief HR">${text}</span>`;
          } else if (part.added) {
            html += `<span class="text-purple-600 underline bg-purple-50 px-0.5" data-change="chief-add" title="Added by Chief HR">${text}</span>`;
          } else {
            html += text;
          }
        });
      } else {
        html = escapeHtml(currentValue || "");
      }
    }

    return html || '<span class="text-muted-foreground">No content</span>';
  };

  // Escape HTML to prevent XSS
  const escapeHtml = (text: string): string => {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  };

  // Handle input from contentEditable
  const handleInput = () => {
    if (contentRef.current) {
      const plainText = contentRef.current.innerText;
      onChange(plainText);
    }
  };

  // Handle focus
  const handleFocus = () => {
    setIsEditing(true);
  };

  // Handle blur
  const handleBlur = () => {
    setIsEditing(false);
  };

  // Update content when values change (but not during editing)
  useEffect(() => {
    if (!isEditing && contentRef.current) {
      const html = generateHTML();
      if (contentRef.current.innerHTML !== html) {
        // Save cursor position
        const selection = window.getSelection();
        const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
        const cursorOffset = range?.startOffset || 0;

        contentRef.current.innerHTML = html;

        // Restore cursor position (best effort)
        try {
          if (range && contentRef.current.firstChild) {
            const newRange = document.createRange();
            const textNode = contentRef.current.firstChild;
            const offset = Math.min(cursorOffset, (textNode.textContent?.length || 0));
            newRange.setStart(textNode, offset);
            newRange.setEnd(textNode, offset);
            selection?.removeAllRanges();
            selection?.addRange(newRange);
          }
        } catch (e) {
          // Cursor position restoration failed, ignore
        }
      }
    }
  }, [originalValue, hrValue, currentValue, hrChangesAccepted, isEditing]);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{label}</Label>
        {!hrChangesAccepted && hasHRChanges && (
          <Button
            size="sm"
            variant="outline"
            onClick={onAcceptHRChanges}
            className="h-7 text-xs"
          >
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Accept HR Changes
          </Button>
        )}
      </div>

      <div
        ref={contentRef}
        contentEditable={!disabled}
        onInput={handleInput}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={cn(
          "min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "overflow-auto whitespace-pre-wrap break-words",
          disabled && "cursor-not-allowed opacity-50",
          className
        )}
        dangerouslySetInnerHTML={{ __html: generateHTML() }}
      />

      {hrChangesAccepted && hasHRChanges && (
        <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 px-2 py-1 rounded">
          <CheckCircle2 className="h-3 w-3" />
          <span>HR changes accepted</span>
        </div>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 bg-red-50 border border-red-200 rounded"></span>
          <span className="text-red-600">HR removed</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 bg-green-50 border border-green-200 rounded"></span>
          <span className="text-green-600">HR added</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 bg-blue-50 border border-blue-200 rounded"></span>
          <span className="text-blue-600">Chief HR removed</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 bg-purple-50 border border-purple-200 rounded"></span>
          <span className="text-purple-600">Chief HR added</span>
        </div>
      </div>
    </div>
  );
};

export default EditableTrackChangesField;
