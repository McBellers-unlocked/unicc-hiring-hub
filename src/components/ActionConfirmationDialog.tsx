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
import { CheckCircle, Plus, X, AlertCircle, Video, Check } from 'lucide-react';

interface ActionConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: 'longlist' | 'shortlist' | 'reject' | 'add-to-shortlist' | 'add-to-video' | 'move-to-panel-interview';
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
      case 'add-to-shortlist':
        return {
          title: 'Add to Shortlist',
          description: `Move ${candidateName} from Longlist to Shortlist?`,
          icon: <CheckCircle className="w-5 h-5" />,
          buttonText: 'Add to Shortlist',
          buttonVariant: 'default',
          placeholder: 'Reason for moving to shortlist...'
        };
      case 'add-to-video':
        return {
          title: 'Add to Video Interview',
          description: `Move ${candidateName} from Longlist to Video Interview stage?`,
          icon: <Video className="w-5 h-5" />,
          buttonText: 'Add to Video',
          buttonVariant: 'default',
          placeholder: 'Reason for moving to video interview...'
        };
      case 'move-to-panel-interview':
        return {
          title: 'Move to Panel Interview',
          description: `Move ${candidateName} from Video Interview to Panel Interview stage?`,
          icon: <Check className="w-5 h-5 text-primary" />,
          buttonText: 'Move to Panel Interview',
          buttonVariant: 'default',
          placeholder: 'Reason for moving to panel interview (optional)...'
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