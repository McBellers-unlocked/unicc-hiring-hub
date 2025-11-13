import React, { useRef, useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
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
  const contentRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const isUpdatingRef = useRef(false);

  // Save cursor position
  const saveCursorPosition = () => {
    const selection = window.getSelection();
    if (!selection || !contentRef.current) return null;

    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(contentRef.current);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    return preCaretRange.toString().length;
  };

  // Restore cursor position
  const restoreCursorPosition = (position: number) => {
    if (!contentRef.current) return;

    const selection = window.getSelection();
    if (!selection) return;

    const textNodes: Text[] = [];
    const walker = document.createTreeWalker(
      contentRef.current,
      NodeFilter.SHOW_TEXT,
      null
    );

    let node;
    while ((node = walker.nextNode())) {
      textNodes.push(node as Text);
    }

    let currentPos = 0;
    for (const textNode of textNodes) {
      const textLength = textNode.textContent?.length || 0;
      if (currentPos + textLength >= position) {
        const range = document.createRange();
        range.setStart(textNode, position - currentPos);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        return;
      }
      currentPos += textLength;
    }

    // If we couldn't find the exact position, place at end
    const range = document.createRange();
    range.selectNodeContents(contentRef.current);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
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
    if (contentRef.current && !isUpdatingRef.current) {
      const cursorPosition = saveCursorPosition();
      const plainText = contentRef.current.innerText || "";
      onChange(plainText);
      
      // Schedule cursor restoration after React updates
      setTimeout(() => {
        if (cursorPosition !== null) {
          restoreCursorPosition(cursorPosition);
        }
      }, 0);
    }
  };

  // Handle focus
  const handleFocus = () => {
    setIsEditing(true);
    // Keep track changes visible during editing
  };

  // Handle blur
  const handleBlur = () => {
    setIsEditing(false);
  };

  // Update content when values change
  useEffect(() => {
    if (contentRef.current) {
      isUpdatingRef.current = true;
      const cursorPosition = isEditing ? saveCursorPosition() : null;
      const html = generateHTML();
      contentRef.current.innerHTML = html;
      
      if (isEditing && cursorPosition !== null) {
        restoreCursorPosition(cursorPosition);
      }
      isUpdatingRef.current = false;
    }
  }, [originalValue, currentValue, isEditing]);

  return (
    <div className={cn("space-y-2", className)}>
      <Label className="text-sm font-medium">{label}</Label>

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
    </div>
  );
};

export default EditableTrackChangesField;
