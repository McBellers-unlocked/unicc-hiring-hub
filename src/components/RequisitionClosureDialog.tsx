import { useState } from "react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Pause } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface RequisitionClosureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: 'cancel' | 'postpone';
  requisitionId: string;
  requisitionTitle: string;
  onComplete: () => void;
  userId?: string;
}

export function RequisitionClosureDialog({
  open,
  onOpenChange,
  action,
  requisitionId,
  requisitionTitle,
  onComplete,
  userId
}: RequisitionClosureDialogProps) {
  const [reason, setReason] = useState("");
  const [postponeMonths, setPostponeMonths] = useState<string>("3");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast({
        title: "Reason required",
        description: "Please provide a reason for this action.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const postponedUntil = action === 'postpone'
        ? new Date(Date.now() + parseInt(postponeMonths) * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        : null;

      const { error } = await supabase
        .from('job_requisitions')
        .update({
          closed_status: action === 'cancel' ? 'cancelled' : 'postponed',
          closed_at: new Date().toISOString(),
          closed_by: userId,
          closure_reason: reason.trim(),
          postponed_until: postponedUntil
        })
        .eq('id', requisitionId);

      if (error) throw error;

      // Log to audit
      await supabase.from('audit_logs').insert({
        actor_id: userId,
        action: action === 'cancel' ? 'REQUISITION_CANCELLED' : 'REQUISITION_POSTPONED',
        entity: 'job_requisitions',
        entity_id: requisitionId,
        after: { 
          reason: reason.trim(), 
          postponed_until: postponedUntil,
          closed_status: action === 'cancel' ? 'cancelled' : 'postponed'
        }
      });

      toast({
        title: action === 'cancel' ? "Requisition Cancelled" : "Requisition Postponed",
        description: action === 'cancel' 
          ? "The position description has been cancelled and archived."
          : `The position description has been postponed for ${postponeMonths} months.`,
      });

      onComplete();
      onOpenChange(false);
      setReason("");
      setPostponeMonths("3");
    } catch (error: any) {
      console.error('Error closing requisition:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to close requisition",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onOpenChange(false);
      setReason("");
      setPostponeMonths("3");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {action === 'cancel' ? (
              <>
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Cancel Position Description
              </>
            ) : (
              <>
                <Pause className="h-5 w-5 text-amber-500" />
                Postpone Position Description
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {action === 'cancel' ? (
              <>
                This will permanently close "<strong>{requisitionTitle}</strong>". 
                The record will be preserved for audit purposes but cannot be reopened.
              </>
            ) : (
              <>
                Temporarily pause "<strong>{requisitionTitle}</strong>". 
                You can reactivate it later from the Closed tab.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {action === 'postpone' && (
            <div className="space-y-2">
              <Label>Postpone for how long?</Label>
              <RadioGroup 
                value={postponeMonths} 
                onValueChange={setPostponeMonths}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="3" id="3months" />
                  <Label htmlFor="3months" className="font-normal cursor-pointer">3 months</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="6" id="6months" />
                  <Label htmlFor="6months" className="font-normal cursor-pointer">6 months</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="9" id="9months" />
                  <Label htmlFor="9months" className="font-normal cursor-pointer">9 months</Label>
                </div>
              </RadioGroup>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="reason">
              Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="reason"
              placeholder={action === 'cancel' 
                ? "e.g., Funding withdrawn, role no longer required..."
                : "e.g., Budget review in progress, reorganisation pending..."
              }
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={isSubmitting}
          >
            {action === 'cancel' ? 'Keep Open' : 'Cancel'}
          </Button>
          <Button 
            variant={action === 'cancel' ? 'destructive' : 'default'}
            onClick={handleSubmit}
            disabled={isSubmitting || !reason.trim()}
          >
            {isSubmitting ? 'Processing...' : action === 'cancel' ? 'Cancel PD' : 'Postpone'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
