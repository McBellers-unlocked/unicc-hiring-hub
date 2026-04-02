import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Building2 } from 'lucide-react';
import { toast } from 'sonner';

const DUMMY_VENDORS = [
  'Accenture',
  'Deloitte Consulting',
  'McKinsey & Company',
  'PwC Advisory',
  'KPMG International',
  'Capgemini',
  'IBM Consulting',
  'Booz Allen Hamilton',
];

interface LinkVendorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVendorCreated?: () => void;
}

export function LinkVendorDialog({ open, onOpenChange, onVendorCreated }: LinkVendorDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVendor, setSelectedVendor] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [gsmSupplierNumber, setGsmSupplierNumber] = useState('');

  const filteredVendors = DUMMY_VENDORS.filter(v =>
    v.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const resetState = () => {
    setSearchQuery('');
    setSelectedVendor(null);
    setName('');
    setGsmSupplierNumber('');
  };

  const handleLink = () => {
    toast.success('Vendor linked to Samsaran');
    resetState();
    onVendorCreated?.();
    onOpenChange(false);
  };

  const handleCreate = () => {
    toast.success('Vendor created in Samsaran');
    resetState();
    onVendorCreated?.();
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
          <DialogTitle>Create/Link Vendor</DialogTitle>
        </DialogHeader>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Search vendors in Samsaran</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search vendors..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="max-h-36 overflow-y-auto border rounded-md divide-y">
          {filteredVendors.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground text-center">No matching vendors</p>
          ) : (
            filteredVendors.map(vendor => (
              <button
                key={vendor}
                type="button"
                className={`w-full text-left px-3 py-2.5 text-sm hover:bg-accent transition-colors ${
                  selectedVendor === vendor ? 'bg-primary/10 font-medium text-primary' : ''
                }`}
                onClick={() => setSelectedVendor(vendor)}
              >
                {vendor}
              </button>
            ))
          )}
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium mb-1 block">Name</label>
            <Input placeholder="Vendor name" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Group</label>
            <Input value="Individual service contractor" readOnly className="bg-muted" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">GSM Supplier Number</label>
            <Input placeholder="Enter GSM supplier number" value={gsmSupplierNumber} onChange={e => setGsmSupplierNumber(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
          <Button variant="outline" onClick={handleCreate}>Create new record</Button>
          <Button disabled={!selectedVendor} onClick={handleLink}>Link</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
