import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, Eye } from "lucide-react";

interface ChiefHRReviewDialogProps {
  requisitionId: string;
  onComplete: () => void;
}

export function ChiefHRReviewDialog({ requisitionId, onComplete }: ChiefHRReviewDialogProps) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const handleReview = async (approved: boolean) => {
    setSubmitting(true);
    try {
      const updateData = {
        chief_hr_reviewed: true,
        chief_hr_reviewed_at: new Date().toISOString(),
        chief_hr_reviewed_by: (await supabase.auth.getUser()).data.user?.id,
        hr_internal_status: approved ? 'ready_for_manager' : 'pending_initial_review',
        chief_hr_comments: comments || null
      };

      const { error } = await supabase
        .from('job_requisitions')
        .update(updateData)
        .eq('id', requisitionId);

      if (error) throw error;

      toast({
        title: "Success",
        description: approved 
          ? "Position description approved by Chief HR" 
          : "Position description returned to HR with comments",
      });

      setOpen(false);
      setComments("");
      onComplete();
    } catch (error) {
      console.error('Error updating requisition:', error);
      toast({
        title: "Error",
        description: "Failed to update requisition",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="text-blue-600 border-blue-600 hover:bg-blue-50"
        >
          <Eye className="h-4 w-4 mr-1" />
          Review as Chief HR
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Chief HR Review</DialogTitle>
          <DialogDescription>
            Review the changes made by HR and approve or return with comments.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="comments">Comments (optional)</Label>
            <Textarea
              id="comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Add any comments or feedback..."
              className="min-h-24"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => handleReview(false)}
            disabled={submitting}
          >
            <XCircle className="h-4 w-4 mr-2" />
            Return to HR
          </Button>
          <Button
            onClick={() => handleReview(true)}
            disabled={submitting}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}