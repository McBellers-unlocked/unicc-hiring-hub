import { Plus, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ApplicationDetailActionBarProps {
  applicationStatus: string;
  canMoveToLonglist: boolean;
  onAddToLonglist: () => void;
  onReject: () => void;
}

export const ApplicationDetailActionBar = ({
  applicationStatus,
  canMoveToLonglist,
  onAddToLonglist,
  onReject,
}: ApplicationDetailActionBarProps) => {
  const showLonglistButton = applicationStatus === 'Application' && canMoveToLonglist;
  const showRejectButton = applicationStatus !== 'Rejected';

  // Don't render if no actions available
  if (!showLonglistButton && !showRejectButton) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-3 z-50 animate-in slide-in-from-bottom-4">
      {showLonglistButton && (
        <Button
          size="sm"
          onClick={onAddToLonglist}
          className="bg-green-600 hover:bg-green-700 gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Add to Longlist
        </Button>
      )}

      {showRejectButton && (
        <Button
          size="sm"
          variant="destructive"
          onClick={onReject}
          className="gap-1.5"
        >
          <Ban className="h-4 w-4" />
          Reject
        </Button>
      )}
    </div>
  );
};
