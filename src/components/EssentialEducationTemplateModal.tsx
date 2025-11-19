import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface Props {
  open: boolean;
  onClose: () => void;
  onApply: (areasOfExpertise: string) => void;
}

export function EssentialEducationTemplateModal({ open, onClose, onApply }: Props) {
  const [areasOfExpertise, setAreasOfExpertise] = useState('');

  const handleApply = () => {
    onApply(areasOfExpertise);
    onClose();
    setAreasOfExpertise('');
  };

  const canApply = areasOfExpertise.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Fill Template Blanks</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="areasOfExpertise">Areas of expertise *</Label>
            <Input
              id="areasOfExpertise"
              placeholder="e.g., Computer Science, Information Technology, Business Administration"
              value={areasOfExpertise}
              onChange={(e) => setAreasOfExpertise(e.target.value)}
            />
          </div>

          {canApply && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Preview:</p>
              <p className="text-sm">
                Be currently enrolled in a University programme (final year of a bachelor's degree, master's degree or equivalent) specializing in areas that are relevant to UNICC's line of business such as{' '}
                <span className="font-medium text-primary">{areasOfExpertise}</span>.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            type="button" 
            onClick={handleApply}
            disabled={!canApply}
          >
            Apply Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
