import React, { useRef, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import * as Diff from "diff";

interface EditableTrackChangesFieldProps {
  label: string;
  originalValue: string;
  currentValue: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

const EditableTrackChangesField: React.FC<EditableTrackChangesFieldProps> = ({
  label,
  originalValue,
  currentValue,
  onChange,
  disabled = false,
  className,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // Sync scroll between textarea and preview
  const handleScroll = () => {
    if (textareaRef.current && previewRef.current) {
      previewRef.current.scrollTop = textareaRef.current.scrollTop;
      previewRef.current.scrollLeft = textareaRef.current.scrollLeft;
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
          html += `<span style="color: transparent;">${text}</span>`;
        }
      });
      
      return html || '<span style="color: #9ca3af;">No content</span>';
    }
    
    // No changes, return empty so textarea text shows through
    return "";
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Label className="text-sm font-medium">{label}</Label>

      <div className="relative">
        {/* Track changes preview layer (behind) */}
        <div
          ref={previewRef}
          className={cn(
            "absolute inset-0 min-h-[400px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
            "overflow-auto whitespace-pre-wrap break-words pointer-events-none font-mono"
          )}
          style={{ 
            lineHeight: "1.5",
            fontFamily: "inherit"
          }}
          dangerouslySetInnerHTML={{ __html: generateHTML() }}
        />

        {/* Textarea layer (on top, semi-transparent) */}
        <textarea
          ref={textareaRef}
          value={currentValue}
          onChange={handleChange}
          onScroll={handleScroll}
          disabled={disabled}
          className={cn(
            "relative min-h-[400px] w-full resize-none rounded-md border border-input px-3 py-2 text-sm",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            "overflow-auto whitespace-pre-wrap break-words",
            disabled && "cursor-not-allowed opacity-50",
            currentValue !== originalValue ? "bg-transparent text-transparent caret-black" : "bg-background"
          )}
          style={{
            lineHeight: "1.5",
            caretColor: currentValue !== originalValue ? "#000" : "auto"
          }}
        />
      </div>
    </div>
  );
};

export default EditableTrackChangesField;
