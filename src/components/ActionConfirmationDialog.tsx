import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Plus, X, AlertCircle } from 'lucide-react';

interface ActionConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: 'longlist' | 'shortlist' | 'reject';
  candidateName: string;
  currentStatus: string;
  isToggleAction?: boolean; // For longlist toggle
  onConfirm: (reason: string) => void;
}

export function ActionConfirmationDialog({
  open,
  onOpenChange,
  action,
  candidateName,
  currentStatus,
  isToggleAction = false,
  onConfirm
}: ActionConfirmationDialogProps) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm(reason);
      handleClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setReason('');
    onOpenChange(false);
  };

  const getActionConfig = (): {
    title: string;
    description: string;
    icon: JSX.Element;
    buttonText: string;
    buttonVariant: 'default' | 'destructive' | 'outline';
    placeholder: string;
  } => {
    switch (action) {
      case 'longlist':
        return {
          title: isToggleAction ? 'Remove from Longlist' : 'Add to Longlist',
          description: isToggleAction 
            ? `Remove ${candidateName} from the longlist?`
            : `Add ${candidateName} to the longlist?`,
          icon: isToggleAction ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />,
          buttonText: isToggleAction ? 'Remove' : 'Add to Longlist',
          buttonVariant: isToggleAction ? 'outline' : 'default',
          placeholder: isToggleAction 
            ? 'Optional: Reason for removal...'
            : 'Optional: Reason for adding to longlist...'
        };
      case 'shortlist':
        return {
          title: 'Direct Shortlist',
          description: `Move ${candidateName} directly to the shortlist?`,
          icon: <CheckCircle className="w-5 h-5" />,
          buttonText: 'Shortlist',
          buttonVariant: 'default',
          placeholder: 'Reason for shortlisting...'
        };
      case 'reject':
        return {
          title: 'Reject Application',
          description: `Reject ${candidateName}'s application?`,
          icon: <AlertCircle className="w-5 h-5" />,
          buttonText: 'Reject',
          buttonVariant: 'destructive',
          placeholder: 'Reason for rejection...'
        };
      default:
        return {
          title: 'Confirm Action',
          description: 'Please confirm this action',
          icon: <CheckCircle className="w-5 h-5" />,
          buttonText: 'Confirm',
          buttonVariant: 'default',
          placeholder: 'Reason...'
        };
    }
  };

  const config = getActionConfig();
  const isRequired = action === 'reject'; // Only rejection requires a reason

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {config.icon}
            {config.title}
          </DialogTitle>
          <DialogDescription>
            {config.description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Current status:</span>
            <Badge variant="outline" className="text-xs">
              {currentStatus}
            </Badge>
          </div>
          
          <div className="space-y-2">
            <label htmlFor="reason" className="text-sm font-medium">
              Rationale {isRequired && <span className="text-destructive">*</span>}
            </label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={config.placeholder}
              className="min-h-[100px] resize-none"
              maxLength={500}
            />
            <div className="text-xs text-muted-foreground text-right">
              {reason.length}/500 characters
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            variant={config.buttonVariant}
            onClick={handleConfirm}
            disabled={isSubmitting || (isRequired && !reason.trim())}
            className="min-w-[100px]"
          >
            {isSubmitting ? 'Processing...' : config.buttonText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}