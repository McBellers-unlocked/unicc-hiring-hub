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

  // Generate HTML with track changes
  const generateHTML = () => {
    // Determine the baseline to compare against
    const baseline = hrChangesAccepted ? hrValue : originalValue;
    
    // For HR changes not yet accepted, show them first
    if (!hrChangesAccepted && hasHRChanges) {
      const hrDiff = Diff.diffWords(originalValue || "", hrValue || "");
      let html = "";
      
      hrDiff.forEach((part) => {
        const text = escapeHtml(part.value);
        if (part.removed) {
          html += `<span style="color: #dc2626; text-decoration: line-through; background-color: #fee2e2;" title="Removed by HR">${text}</span>`;
        } else if (part.added) {
          html += `<span style="color: #16a34a; text-decoration: underline; background-color: #f0fdf4;" title="Added by HR">${text}</span>`;
        } else {
          html += text;
        }
      });
      
      return html || '<span style="color: #9ca3af;">No content</span>';
    }
    
    // For accepted HR changes or no HR changes, show Chief HR's changes
    if (currentValue !== baseline) {
      const chiefDiff = Diff.diffWords(baseline || "", currentValue || "");
      let html = "";
      
      chiefDiff.forEach((part) => {
        const text = escapeHtml(part.value);
        if (part.removed) {
          html += `<span style="color: #2563eb; text-decoration: line-through; background-color: #eff6ff;" title="Removed by Chief HR">${text}</span>`;
        } else if (part.added) {
          html += `<span style="color: #9333ea; text-decoration: underline; background-color: #faf5ff;" title="Added by Chief HR">${text}</span>`;
        } else {
          html += text;
        }
      });
      
      return html || '<span style="color: #9ca3af;">No content</span>';
    }
    
    // No changes, show plain text
    return escapeHtml(currentValue || "") || '<span style="color: #9ca3af;">No content</span>';
  };

  // Handle input from contentEditable
  const handleInput = () => {
    if (contentRef.current) {
      // Extract plain text, converting <br> back to newlines
      const plainText = contentRef.current.innerText || "";
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

  // Update content when values change (but not during active editing)
  useEffect(() => {
    if (contentRef.current) {
      // Only update if not currently editing
      if (!isEditing) {
        const html = generateHTML();
        contentRef.current.innerHTML = html;
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
        suppressContentEditableWarning
        className={cn(
          "min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "overflow-auto whitespace-pre-wrap break-words",
          disabled && "cursor-not-allowed opacity-70",
          className
        )}
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
