import { useState, useRef, useEffect, useCallback, Fragment } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { HR_FOCAL_POINTS } from '@/lib/hrFocalPoints';
import { cn } from '@/lib/utils';

interface MentionableTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const MentionableTextarea = ({
  value,
  onChange,
  placeholder,
  className,
}: MentionableTextareaProps) => {
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [mentionStartPos, setMentionStartPos] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const filteredMentions = HR_FOCAL_POINTS.filter((name) =>
    name.toLowerCase().includes(mentionFilter.toLowerCase())
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    setCursorPosition(cursorPos);

    // Check for @ character trigger
    const textBeforeCursor = newValue.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      // If there's no space after @ and we're still typing the mention
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
        setShowMentions(true);
        setMentionStartPos(lastAtIndex);
        setMentionFilter(textAfterAt);
      } else {
        setShowMentions(false);
        setMentionStartPos(null);
        setMentionFilter('');
      }
    } else {
      setShowMentions(false);
      setMentionStartPos(null);
      setMentionFilter('');
    }

    onChange(newValue);
  };

  const handleMentionSelect = useCallback((name: string) => {
    if (mentionStartPos === null) return;

    const before = value.slice(0, mentionStartPos);
    const after = value.slice(cursorPosition);
    const newValue = `${before}@${name} ${after}`;

    onChange(newValue);
    setShowMentions(false);
    setMentionStartPos(null);
    setMentionFilter('');

    // Focus back to textarea
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = mentionStartPos + name.length + 2; // +2 for @ and space
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  }, [mentionStartPos, cursorPosition, value, onChange]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentions && filteredMentions.length > 0) {
      if (e.key === 'Escape') {
        setShowMentions(false);
        e.preventDefault();
      } else if (e.key === 'Tab' || e.key === 'Enter') {
        handleMentionSelect(filteredMentions[0]);
        e.preventDefault();
      }
    }
  };

  return (
    <div className="relative w-full">
      <Popover open={showMentions && filteredMentions.length > 0} onOpenChange={setShowMentions}>
        <PopoverTrigger asChild>
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={cn('min-h-[60px] resize-none text-sm', className)}
          />
        </PopoverTrigger>
        <PopoverContent 
          className="w-56 p-1 max-h-48 overflow-y-auto z-50 bg-popover border shadow-md" 
          align="start"
          side="bottom"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="text-xs text-muted-foreground px-2 py-1 font-medium">
            Mention HR Team Member
          </div>
          {filteredMentions.map((name) => (
            <Button
              key={name}
              variant="ghost"
              size="sm"
              className="w-full justify-start text-sm h-8"
              onClick={() => handleMentionSelect(name)}
            >
              @{name}
            </Button>
          ))}
        </PopoverContent>
      </Popover>
    </div>
  );
};

// Helper function to render comment text with highlighted mentions
export const renderCommentWithMentions = (text: string) => {
  // Match @Name SURNAME pattern
  const mentionPattern = new RegExp(
    `@(${HR_FOCAL_POINTS.map(name => name.replace(/\s/g, '\\s')).join('|')})`,
    'g'
  );

  const parts: (string | JSX.Element)[] = [];
  let lastIndex = 0;
  let match;

  while ((match = mentionPattern.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    // Add the mention as a badge
    parts.push(
      <Badge 
        key={match.index} 
        variant="secondary" 
        className="text-xs font-normal mx-0.5"
      >
        @{match[1]}
      </Badge>
    );
    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? (
    <Fragment>
      {parts.map((part, i) => (
        <Fragment key={i}>{part}</Fragment>
      ))}
    </Fragment>
  ) : text;
};
