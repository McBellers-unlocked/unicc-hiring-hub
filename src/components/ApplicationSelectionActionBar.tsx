import { Button } from "@/components/ui/button";
import { X, Ban } from "lucide-react";

interface ApplicationSelectionActionBarProps {
  selectedCount: number;
  onReject: () => void;
  onClearSelection: () => void;
}

export function ApplicationSelectionActionBar({
  selectedCount,
  onReject,
  onClearSelection,
}: ApplicationSelectionActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-6 py-3 rounded-full shadow-lg flex items-center gap-3 z-50 animate-in slide-in-from-bottom-4">
      <span className="font-medium text-sm">
        {selectedCount} selected
      </span>
      
      <Button
        size="sm"
        onClick={onReject}
        className="bg-red-100 hover:bg-red-200 text-red-800 gap-1.5"
      >
        <Ban className="h-4 w-4" />
        Reject
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