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
  natureOfPosition?: string;
}

export function MainDutiesTemplateModal({ open, onClose, onApply, currentContent, natureOfPosition }: Props) {
  const isIntern = natureOfPosition === 'Intern';
  
  // Fields for regular positions
  const [supervisorTitle, setSupervisorTitle] = useState('');
  const [divisionName, setDivisionName] = useState('');
  const [sectionName, setSectionName] = useState('');

  // Fields for interns
  const [numberOfDays, setNumberOfDays] = useState('');
  const [numberOfHours, setNumberOfHours] = useState('');
  const [supervisorTitleIntern, setSupervisorTitleIntern] = useState('');

  const handleApply = () => {
    let filledTemplate = '';
    
    if (isIntern) {
      filledTemplate = `The incumbent(s) will work ${numberOfDays} days per week for ${numberOfHours} hours under the supervision of the ${supervisorTitleIntern}, and will receive the guidance and support necessary to carry out the responsibilities outlined below.

`;
    } else {
      filledTemplate = `The incumbent will work under the direct supervision and guidance of the ${supervisorTitle} within the ${divisionName} and in close collaboration with the ${sectionName} team members. The incumbent will perform the following duties:

`;
    }
    
    onApply(filledTemplate);
    onClose();
  };

  const canApply = isIntern 
    ? numberOfDays.trim() && numberOfHours.trim() && supervisorTitleIntern.trim()
    : supervisorTitle.trim() && divisionName.trim() && sectionName.trim();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Fill Template Blanks</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {isIntern ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="numberOfDays">Number of days *</Label>
                <Input
                  id="numberOfDays"
                  placeholder="e.g., 5, 3-4"
                  value={numberOfDays}
                  onChange={(e) => setNumberOfDays(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="numberOfHours">Number of hours *</Label>
                <Input
                  id="numberOfHours"
                  placeholder="e.g., 40, 20-30"
                  value={numberOfHours}
                  onChange={(e) => setNumberOfHours(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="supervisorIntern">Title of supervisor *</Label>
                <Input
                  id="supervisorIntern"
                  placeholder="e.g., Chief of Digital Solutions, HR Manager"
                  value={supervisorTitleIntern}
                  onChange={(e) => setSupervisorTitleIntern(e.target.value)}
                />
              </div>

              {canApply && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">Preview:</p>
                  <p className="text-sm">
                    The incumbent(s) will work{' '}
                    <span className="font-medium text-primary">{numberOfDays}</span> days per week for{' '}
                    <span className="font-medium text-primary">{numberOfHours}</span> hours under the supervision of the{' '}
                    <span className="font-medium text-primary">{supervisorTitleIntern}</span>, and will receive the guidance and support necessary to carry out the responsibilities outlined below.
                  </p>
                </div>
              )}
            </>
          ) : (
            <>
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
            </>
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