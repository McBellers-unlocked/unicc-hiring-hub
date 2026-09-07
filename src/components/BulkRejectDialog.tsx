import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle } from "lucide-react";

interface BulkRejectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  onConfirm: (reason: string) => void | Promise<void>;
  isLoading?: boolean;
}

export function BulkRejectDialog({
  open,
  onOpenChange,
  selectedCount,
  onConfirm,
  isLoading = false,
}: BulkRejectDialogProps) {
  const [reason, setReason] = useState("");

  useEffect(() => { if (!open) setReason(""); }, [open]);

  const handleConfirm = async () => {
    if (reason.trim()) await onConfirm(reason.trim());
  };
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setReason("");
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Reject {selectedCount} Application{selectedCount !== 1 ? "s" : ""}
          </DialogTitle>
          <DialogDescription>
            Record the evidence and criteria supporting your exclusion decision for every selected application. Each decision is saved against its assessment version. Missing evidence alone does not establish that a requirement is unmet.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Rejection Reason <span className="text-destructive">*</span>
            </label>
            <Textarea
              placeholder="Explain the criterion and source evidence supporting exclusion for each selected application..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">
              {reason.length}/500 characters
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={!reason.trim() || isLoading}
          >
            {isLoading ? "Rejecting..." : `Reject ${selectedCount} Application${selectedCount !== 1 ? "s" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
