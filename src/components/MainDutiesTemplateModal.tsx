import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

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

  const commonSupervisors = [
    'Hiring Manager',
    'Chief',
    'Director',
    'Team Lead',
    'Section Chief',
    'Unit Head'
  ];

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
            <Label htmlFor="supervisor">Supervisor Title *</Label>
            <div className="space-y-2">
              <Select value={supervisorTitle} onValueChange={setSupervisorTitle}>
                <SelectTrigger>
                  <SelectValue placeholder="Select or type custom..." />
                </SelectTrigger>
                <SelectContent>
                  {commonSupervisors.map((title) => (
                    <SelectItem key={title} value={title}>
                      {title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                id="supervisor"
                placeholder="Or type custom supervisor title..."
                value={supervisorTitle}
                onChange={(e) => setSupervisorTitle(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {commonSupervisors.map((title) => (
                <Badge
                  key={title}
                  variant="outline"
                  className="cursor-pointer hover:bg-muted"
                  onClick={() => setSupervisorTitle(title)}
                >
                  {title}
                </Badge>
              ))}
            </div>
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