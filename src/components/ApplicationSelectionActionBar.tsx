import { Button } from "@/components/ui/button";
import { Plus, X, Video } from "lucide-react";

interface ApplicationSelectionActionBarProps {
  selectedCount: number;
  showLonglistActions: boolean;
  onAddToLonglist: () => void;
  onRemoveFromLonglist: () => void;
  onBulkVideoAssignment: () => void;
  onClearSelection: () => void;
}

export function ApplicationSelectionActionBar({
  selectedCount,
  showLonglistActions,
  onAddToLonglist,
  onRemoveFromLonglist,
  onBulkVideoAssignment,
  onClearSelection,
}: ApplicationSelectionActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-3 z-50 animate-in slide-in-from-bottom-4">
      <span className="font-medium text-sm">
        {selectedCount} selected
      </span>
      
      {showLonglistActions && (
        <>
          <Button
            size="sm"
            onClick={onAddToLonglist}
            className="bg-green-600 hover:bg-green-700 gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Add to Longlist
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={onRemoveFromLonglist}
            className="gap-1.5"
          >
            <X className="h-4 w-4" />
            Remove
          </Button>
        </>
      )}
      
      <Button
        size="sm"
        onClick={onBulkVideoAssignment}
        className="bg-purple-600 hover:bg-purple-700 gap-1.5"
      >
        <Video className="h-4 w-4" />
        Bulk Video
      </Button>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={onClearSelection}
        className="h-8 w-8 hover:bg-white/20 text-white"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
