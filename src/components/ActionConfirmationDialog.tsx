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
import { CheckCircle, Plus, X, AlertCircle, Video, Check, Award, Users, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActionConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: 'longlist' | 'reject' | 'clarify' | 'add-to-video' | 'move-to-panel-interview' | 'move-to-panel-from-longlist' | 'move-to-recommended' | 'move-to-roster';
  candidateName: string;
  currentStatus: string;
  isToggleAction?: boolean; // For longlist toggle
  onConfirm: (reason: string, rating?: string) => void | Promise<void>;
}

const ratingOptions = [
  { 
    value: 'eligible', 
    label: 'Eligible', 
    description: 'Meets the minimum requirements for the position',
    bgColor: 'bg-blue-50 hover:bg-blue-100 border-blue-200',
    selectedBg: 'bg-blue-100 border-blue-500 ring-2 ring-blue-500/20',
    textColor: 'text-blue-700'
  },
  { 
    value: 'tier_2', 
    label: 'Tier 2', 
    description: 'Strong candidate with relevant experience and competencies',
    bgColor: 'bg-amber-50 hover:bg-amber-100 border-amber-200',
    selectedBg: 'bg-amber-100 border-amber-500 ring-2 ring-amber-500/20',
    textColor: 'text-amber-700'
  },
  { 
    value: 'tier_1', 
    label: 'Tier 1', 
    description: 'Exceptional candidate; highly recommended for shortlisting',
    bgColor: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200',
    selectedBg: 'bg-emerald-100 border-emerald-500 ring-2 ring-emerald-500/20',
    textColor: 'text-emerald-700',
    icon: Star
  }
];

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
  const [rating, setRating] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if ((action === 'longlist' || action === 'reject' || action === 'clarify') && !reason.trim()) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await onConfirm(reason, rating || undefined);
      handleClose();
    } catch (err) {
      setError(err && typeof err === 'object' && 'message' in err ? String(err.message) : 'The decision could not be saved. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setError(null);
    setReason('');
    setRating(null);
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
      case 'clarify':
        return { title: 'Request clarification', description: `Record why ${candidateName}'s application needs further review.`, icon: <AlertCircle className="w-5 h-5" />, buttonText: 'Save review decision', buttonVariant: 'outline', placeholder: 'Which evidence or criterion needs clarification?' };
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
            ? 'Explain why this application needs further review...'
            : 'Explain your inclusion decision with reference to the criteria and evidence...'
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
      case 'add-to-video':
        return {
          title: 'Add to Video Interview',
          description: `Move ${candidateName} from Longlist to Video Interview stage?`,
          icon: <Video className="w-5 h-5" />,
          buttonText: 'Add to Video',
          buttonVariant: 'default',
          placeholder: 'Reason for moving to video interview...'
        };
      case 'move-to-panel-from-longlist':
        return {
          title: 'Move to Panel Interview',
          description: `Move ${candidateName} directly from Longlist to Panel Interview stage (skipping video)?`,
          icon: <Users className="w-5 h-5 text-orange-600" />,
          buttonText: 'Move to Panel Interview',
          buttonVariant: 'default',
          placeholder: 'Reason for moving to panel interview (optional)...'
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
      case 'move-to-recommended':
        return {
          title: 'Recommend Candidate',
          description: `Recommend ${candidateName} for this position? This candidate scored highest (≥80%) in their interview.`,
          icon: <Award className="w-5 h-5 text-emerald-600" />,
          buttonText: 'Recommend',
          buttonVariant: 'default',
          placeholder: 'Reason for recommendation (optional)...'
        };
      case 'move-to-roster':
        return {
          title: 'Add to Roster as Alternate',
          description: `Add ${candidateName} to the talent roster as an alternate? This candidate scored ≥80% and qualifies for future opportunities.`,
          icon: <Users className="w-5 h-5 text-teal-600" />,
          buttonText: 'Add to Roster',
          buttonVariant: 'default',
          placeholder: 'Reason for adding to roster (optional)...'
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
  const isRequired = action === 'reject' || action === 'longlist' || action === 'clarify';
  const showRatingSelector = action === 'longlist' && !isToggleAction;

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
          
          {showRatingSelector && (
            <div className="space-y-3">
              <label className="text-sm font-medium">
                Reviewer priority (optional)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {ratingOptions.map((option) => {
                  const isSelected = rating === option.value;
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setRating(isSelected ? null : option.value)}
                      className={cn(
                        "flex flex-col items-center p-3 rounded-lg border transition-all text-center",
                        isSelected ? option.selectedBg : option.bgColor
                      )}
                    >
                      <div className="flex items-center gap-1">
                        {Icon && <Icon className={cn("h-3.5 w-3.5", option.textColor)} />}
                        <span className={cn("text-sm font-medium", option.textColor)}>
                          {option.label}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground mt-0.5">
                        {option.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          
          {isRequired && <p className="text-sm text-muted-foreground">This records your decision separately from the AI assessment. Missing evidence alone is not evidence that a requirement is unmet.</p>}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
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
