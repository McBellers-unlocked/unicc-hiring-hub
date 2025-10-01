import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { VideoAssignmentManager } from "./VideoAssignmentManager";

interface VideoAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicationId: string;
  candidateName: string;
}

export function VideoAssignmentDialog({ 
  open, 
  onOpenChange, 
  applicationId,
  candidateName 
}: VideoAssignmentDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Video Assignment - {candidateName}</DialogTitle>
        </DialogHeader>
        <VideoAssignmentManager applicationId={applicationId} />
      </DialogContent>
    </Dialog>
  );
}
