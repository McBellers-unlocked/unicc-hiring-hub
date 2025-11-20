import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface Props {
  open: boolean;
  onClose: () => void;
  onApply: (fieldArea: string) => void;
  educationLevel: string;
  isGPosition?: boolean;
}

export function StaffEssentialEducationTemplateModal({ open, onClose, onApply, educationLevel, isGPosition = false }: Props) {
  const [fieldArea, setFieldArea] = useState('');

  const handleApply = () => {
    onApply(fieldArea);
    onClose();
    setFieldArea('');
  };

  const canApply = fieldArea.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Fill Template Blanks</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fieldArea">Specify field/area *</Label>
            <Input
              id="fieldArea"
              placeholder="e.g., Computer Science, Business Administration, Engineering"
              value={fieldArea}
              onChange={(e) => setFieldArea(e.target.value)}
            />
          </div>

          {canApply && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Preview:</p>
              <p className="text-sm">
                {isGPosition ? (
                  <>
                    - Completion of secondary school supplemented by technical training in{' '}
                    <span className="font-medium text-primary">{fieldArea}</span>
                    . A completed university degree from an accredited institution will be counted towards minimum work experience requirements
                  </>
                ) : (
                  <>
                    - {educationLevel} degree in{' '}
                    <span className="font-medium text-primary">{fieldArea}</span>
                  </>
                )}
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
