import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface Props {
  open: boolean;
  onClose: () => void;
  onApply: (filledTemplate: string) => void;
  currentContent: string;
}

export function MainDutiesTemplateModal({ open, onClose, onApply, currentContent }: Props) {
  const [supervisorTitle, setSupervisorTitle] = useState('');
  const [divisionName, setDivisionName] = useState('');
  const [sectionName, setSectionName] = useState('');


  const handleApply = () => {
    const filledTemplate = `The incumbent will work under the direct supervision and guidance of the ${supervisorTitle} within the ${divisionName} and in close collaboration with the ${sectionName} team members. The incumbent will perform the following duties:

`;
    onApply(filledTemplate);
    onClose();
  };

  const canApply = supervisorTitle.trim() && divisionName.trim() && sectionName.trim();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Fill Template Blanks</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="supervisor">Supervisor Job Title *</Label>
            <Input
              id="supervisor"
              placeholder="e.g., Chief of Digital Solutions, Hiring Manager, Team Lead"
              value={supervisorTitle}
              onChange={(e) => setSupervisorTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="division">Division Name *</Label>
            <Input
              id="division"
              placeholder="e.g., Information Technology Division"
              value={divisionName}
              onChange={(e) => setDivisionName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="section">Section Name *</Label>
            <Input
              id="section"
              placeholder="e.g., Application Development Section"
              value={sectionName}
              onChange={(e) => setSectionName(e.target.value)}
            />
          </div>

          {canApply && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Preview:</p>
              <p className="text-sm">
                The incumbent will work under the direct supervision and guidance of the{' '}
                <span className="font-medium text-primary">{supervisorTitle}</span> within the{' '}
                <span className="font-medium text-primary">{divisionName}</span> and in close collaboration with the{' '}
                <span className="font-medium text-primary">{sectionName}</span> team members.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={!canApply}>
            Apply Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}