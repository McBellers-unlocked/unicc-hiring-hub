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
  const [localValue, setLocalValue] = useState(currentValue);
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const cursorPositionRef = useRef<number>(0);

  // Save cursor position
  const saveCursorPosition = (): number => {
    const selection = window.getSelection();
    if (!selection || !contentRef.current || selection.rangeCount === 0) return 0;

    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(contentRef.current);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    
    const tempDiv = document.createElement('div');
    tempDiv.appendChild(preCaretRange.cloneContents());
    return tempDiv.innerText.length;
  };

  // Restore cursor position
  const restoreCursorPosition = (charOffset: number) => {
    if (!contentRef.current) return;

    const selection = window.getSelection();
    if (!selection) return;

    const textNodes: Node[] = [];
    const walker = document.createTreeWalker(
      contentRef.current,
      NodeFilter.SHOW_TEXT
    );

    let node;
    while ((node = walker.nextNode())) {
      textNodes.push(node);
    }

    let currentOffset = 0;
    for (const textNode of textNodes) {
      const textLength = textNode.textContent?.length || 0;
      if (currentOffset + textLength >= charOffset) {
        const range = document.createRange();
        const offset = Math.min(charOffset - currentOffset, textLength);
        range.setStart(textNode, offset);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        return;
      }
      currentOffset += textLength;
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
          html += text;
        }
      });
      
      return html || '<span style="color: #9ca3af;">No content</span>';
    }
    
    // No changes, show plain text
    return escapeHtml(currentValue || "") || '<span style="color: #9ca3af;">No content</span>';
  };

  // Handle input from contentEditable with debounced track changes
  const handleInput = () => {
    if (!contentRef.current) return;
    
    const plainText = contentRef.current.innerText || "";
    setLocalValue(plainText);
    onChange(plainText);
    
    // Save cursor position
    cursorPositionRef.current = saveCursorPosition();
    
    // Clear existing timer
    if (updateTimerRef.current) {
      clearTimeout(updateTimerRef.current);
    }
    
    // Set new timer to update track changes after brief pause (300ms)
    updateTimerRef.current = setTimeout(() => {
      if (contentRef.current && isEditing) {
        const savedPosition = cursorPositionRef.current;
        const html = generateHTML();
        contentRef.current.innerHTML = html;
        restoreCursorPosition(savedPosition);
      }
    }, 300);
  };

  // Handle focus
  const handleFocus = () => {
    setIsEditing(true);
  };

  // Handle blur
  const handleBlur = () => {
    setIsEditing(false);
    // Clear any pending updates
    if (updateTimerRef.current) {
      clearTimeout(updateTimerRef.current);
      updateTimerRef.current = null;
    }
  };

  // Update content when values change from outside or when not editing
  useEffect(() => {
    if (contentRef.current && !isEditing) {
      const html = generateHTML();
      contentRef.current.innerHTML = html;
    }
    setLocalValue(currentValue);
  }, [originalValue, currentValue, isEditing]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
      }
    };
  }, []);

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
