import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Briefcase } from 'lucide-react';
import { toast } from 'sonner';

const DUMMY_JOB_TITLES = [
  'Programme Analyst',
  'ICT Associate',
  'Administrative Assistant',
  'Finance Officer',
  'Security Coordinator',
  'Communications Specialist',
  'HR Associate',
  'Logistics Assistant',
  'Project Manager',
  'Data Analyst',
];

interface LinkJobDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  affiliateJobTitle: string | null;
}

export function LinkJobDialog({ open, onOpenChange, affiliateJobTitle }: LinkJobDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null);

  const filteredTitles = DUMMY_JOB_TITLES.filter(t =>
    t.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleLink = () => {
    toast.success('Job linked with Samsaran');
    setSearchQuery('');
    setSelectedTitle(null);
    onOpenChange(false);
  };

  const handleOpenChange = (val: boolean) => {
    if (!val) {
      setSearchQuery('');
      setSelectedTitle(null);
    }
    onOpenChange(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create/Link Job</DialogTitle>
        </DialogHeader>

        <div className="rounded-md border bg-muted/50 p-4 flex items-center gap-3">
          <Briefcase className="h-5 w-5 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Current Job Title</p>
            <p className="font-semibold">{affiliateJobTitle || 'Not specified'}</p>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Search Similar Titles</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search job titles..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="max-h-48 overflow-y-auto border rounded-md divide-y">
          {filteredTitles.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground text-center">No matching titles</p>
          ) : (
            filteredTitles.map(title => (
              <button
                key={title}
                type="button"
                className={`w-full text-left px-3 py-2.5 text-sm hover:bg-accent transition-colors ${
                  selectedTitle === title ? 'bg-primary/10 font-medium text-primary' : ''
                }`}
                onClick={() => setSelectedTitle(title)}
              >
                {title}
              </button>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
          <Button disabled={!selectedTitle} onClick={handleLink}>Link</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
