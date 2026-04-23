import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface EditableCellProps {
  value: any;
  rowId: string;
  column: string;
  isDate?: boolean;
  isRequired?: boolean;
  editable: boolean;
  onSave: (rowId: string, column: string, newValue: string | null) => Promise<boolean>;
}

export function EditableCell({
  value,
  rowId,
  column,
  isDate,
  isRequired,
  editable,
  onSave,
}: EditableCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>(value == null ? '' : String(value));
  const [flash, setFlash] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(value == null ? '' : String(value));
  }, [value]);

  useEffect(() => {
    if (editing) {
      // Focus on next tick
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [editing]);

  const blank = value == null || String(value).trim() === '';
  const showRequiredBorder = isRequired && blank;

  const commit = async () => {
    const original = value == null ? '' : String(value);
    const trimmed = draft.trim();
    if (trimmed === original.trim()) {
      setEditing(false);
      return;
    }
    const newValue = trimmed === '' ? null : trimmed;
    const ok = await onSave(rowId, column, newValue);
    setEditing(false);
    if (ok) {
      setFlash(true);
      setTimeout(() => setFlash(false), 600);
    } else {
      setDraft(original);
    }
  };

  const cancel = () => {
    setDraft(value == null ? '' : String(value));
    setEditing(false);
  };

  if (editing && editable) {
    return (
      <Input
        ref={inputRef}
        type={isDate ? 'date' : 'text'}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            cancel();
          }
        }}
        className="h-7 px-1.5 py-0 text-sm"
      />
    );
  }

  return (
    <div
      onDoubleClick={() => editable && setEditing(true)}
      className={cn(
        'min-h-[1.5rem] px-1 py-0.5 rounded text-sm transition-colors',
        editable && 'cursor-text hover:bg-muted/40',
        showRequiredBorder && 'border-l-2 border-destructive pl-1.5',
        flash && 'bg-primary/10',
      )}
      title={editable ? 'Double-click to edit' : undefined}
    >
      {value ?? <span className="text-muted-foreground italic">—</span>}
    </div>
  );
}
