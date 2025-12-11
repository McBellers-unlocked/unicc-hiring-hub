import { Button } from "@/components/ui/button";
import { Mail, X } from "lucide-react";

interface SelectionActionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onEmailSelected: () => void;
}

export function SelectionActionBar({
  selectedCount,
  onClearSelection,
  onEmailSelected,
}: SelectionActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-6 py-3 rounded-full shadow-lg flex items-center gap-4 z-50 animate-in slide-in-from-bottom-4">
      <span className="font-medium">
        {selectedCount} selected
      </span>
      <Button
        variant="secondary"
        size="sm"
        onClick={onEmailSelected}
        className="gap-2"
      >
        <Mail className="h-4 w-4" />
        Send Email
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onClearSelection}
        className="h-8 w-8 hover:bg-primary-foreground/20"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
