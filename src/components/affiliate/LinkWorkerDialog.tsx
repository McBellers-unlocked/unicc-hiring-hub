import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

const DUMMY_WORKERS = [
  'Maria Garcia',
  'James Smith',
  'Aisha Patel',
  'Chen Wei',
  'Fatima Al-Hassan',
  'Lucas Müller',
  'Yuki Tanaka',
  'Priya Sharma',
];

interface LinkWorkerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  affiliateName: string;
  contractStartDate: string | null;
  affiliateDutyStation: string | null;
  affiliateFirstIncumbency: string | null;
  affiliateGender: string | null;
  onWorkerCreated?: () => void;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  try {
    return format(parseISO(dateStr), 'dd MMM yyyy');
  } catch {
    return dateStr;
  }
}

export function LinkWorkerDialog({
  open,
  onOpenChange,
  affiliateName,
  contractStartDate,
  affiliateDutyStation,
  affiliateFirstIncumbency,
  affiliateGender,
  onWorkerCreated,
}: LinkWorkerDialogProps) {
  const nameParts = affiliateName.split(' ');
  const defaultFirstName = nameParts[0] || '';
  const defaultLastName = nameParts.slice(1).join(' ') || '';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWorker, setSelectedWorker] = useState<string | null>(null);
  const [firstName, setFirstName] = useState(defaultFirstName);
  const [lastName, setLastName] = useState(defaultLastName);
  const [startDate, setStartDate] = useState(formatDate(contractStartDate));
  const [location, setLocation] = useState(affiliateDutyStation || '');
  const [hireDate, setHireDate] = useState(formatDate(affiliateFirstIncumbency));
  const [gender, setGender] = useState(affiliateGender || '');

  useEffect(() => {
    if (open) {
      const parts = affiliateName.split(' ');
      setFirstName(parts[0] || '');
      setLastName(parts.slice(1).join(' ') || '');
      setStartDate(formatDate(contractStartDate));
      setLocation(affiliateDutyStation || '');
      setHireDate(formatDate(affiliateFirstIncumbency));
      setGender(affiliateGender || '');
    }
  }, [open, affiliateName, contractStartDate, affiliateDutyStation, affiliateFirstIncumbency, affiliateGender]);

  const filteredWorkers = DUMMY_WORKERS.filter(w =>
    w.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const resetState = () => {
    setSearchQuery('');
    setSelectedWorker(null);
  };

  const handleLink = () => {
    toast.success('Worker linked to Samsaran');
    resetState();
    onWorkerCreated?.();
    onOpenChange(false);
  };

  const handleCreate = () => {
    toast.success('Worker created in Samsaran');
    resetState();
    onWorkerCreated?.();
    onOpenChange(false);
  };

  const handleOpenChange = (val: boolean) => {
    if (!val) resetState();
    onOpenChange(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create/Link Worker</DialogTitle>
        </DialogHeader>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Search workers in Samsaran</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search workers..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="max-h-36 overflow-y-auto border rounded-md divide-y">
          {filteredWorkers.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground text-center">No matching workers</p>
          ) : (
            filteredWorkers.map(worker => (
              <button
                key={worker}
                type="button"
                className={`w-full text-left px-3 py-2.5 text-sm hover:bg-accent transition-colors ${
                  selectedWorker === worker ? 'bg-primary/10 font-medium text-primary' : ''
                }`}
                onClick={() => setSelectedWorker(worker)}
              >
                {worker}
              </button>
            ))
          )}
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block">First Name</label>
              <Input value={firstName} onChange={e => setFirstName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Last Name</label>
              <Input value={lastName} onChange={e => setLastName(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Contract Employment Start Date</label>
            <Input value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Office Location</label>
            <Input value={location} onChange={e => setLocation(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Original Hire Date</label>
            <Input value={hireDate} onChange={e => setHireDate(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Gender</label>
            <Input value={gender} onChange={e => setGender(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
          <Button variant="outline" onClick={handleCreate}>Create new record</Button>
          <Button disabled={!selectedWorker} onClick={handleLink}>Link</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
