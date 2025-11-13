import React, { useRef, useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  const [showPreview, setShowPreview] = useState(false);
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  // Handle input with debounced preview
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    
    // Hide preview while typing
    setShowPreview(false);
    
    // Clear existing timer
    if (updateTimerRef.current) {
      clearTimeout(updateTimerRef.current);
    }
    
    // Show preview after brief pause
    updateTimerRef.current = setTimeout(() => {
      setShowPreview(true);
    }, 500);
  };

  const handleFocus = () => {
    setShowPreview(false);
  };

  const handleBlur = () => {
    setShowPreview(true);
    if (updateTimerRef.current) {
      clearTimeout(updateTimerRef.current);
    }
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
      }
    };
  }, []);

  // Show preview when not editing
  useEffect(() => {
    if (currentValue === originalValue) {
      setShowPreview(false);
    }
  }, [currentValue, originalValue]);

  return (
    <div className={cn("space-y-2", className)}>
      <Label className="text-sm font-medium">{label}</Label>

      <div className="relative">
        <Textarea
          value={currentValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled}
          className={cn(
            "min-h-[120px] w-full resize-none",
            showPreview && "opacity-0"
          )}
        />
        
        {showPreview && (
          <div
            className={cn(
              "absolute inset-0 min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
              "overflow-auto whitespace-pre-wrap break-words pointer-events-none"
            )}
            dangerouslySetInnerHTML={{ __html: generateHTML() }}
          />
        )}
      </div>
    </div>
  );
};

export default EditableTrackChangesField;
