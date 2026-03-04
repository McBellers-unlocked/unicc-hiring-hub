import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CustomDatePicker } from '@/components/ui/date-picker';
import { differenceInDays, parseISO } from 'date-fns';
import { toast } from 'sonner';

interface LaunchPRDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recordNumber: string;
  contract: {
    start_date: string | null;
    end_date: string | null;
    unit_price: number | null;
    unit: string | null;
    currency: string | null;
    days_worked: number | null;
  } | null;
}

const CURRENCIES = ['USD', 'EUR', 'CHF', 'INR', 'PKR', 'BRL'];
const UNITS = ['day', 'hour'];

export function LaunchPRDialog({ open, onOpenChange, recordNumber, contract }: LaunchPRDialogProps) {
  const queryClient = useQueryClient();

  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [unitPrice, setUnitPrice] = useState('');
  const [unit, setUnit] = useState('');
  const [currency, setCurrency] = useState('');

  // Sync form state when contract data loads or dialog opens
  useEffect(() => {
    if (open && contract) {
      setStartDate(contract.start_date ? parseISO(contract.start_date) : null);
      setEndDate(contract.end_date ? parseISO(contract.end_date) : null);
      setUnitPrice(contract.unit_price != null ? String(contract.unit_price) : '');
      setUnit(contract.unit || '');
      setCurrency(contract.currency || '');
    }
  }, [open, contract]);

  const daysWorked = startDate && endDate
    ? differenceInDays(endDate, startDate)
    : contract?.days_worked ?? null;

  const allFieldsFilled = startDate && endDate && unitPrice !== '' && unit !== '' && currency !== '' && daysWorked != null;

  const updateContract = useMutation({
    mutationFn: async (fields: Record<string, any>) => {
      const { error } = await supabase
        .from('affiliate_contract_history')
        .update(fields)
        .eq('record_number', recordNumber);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['affiliate-contract-record'] });
      toast.success('Contract record updated');
    },
    onError: () => toast.error('Failed to update record'),
  });

  const handleFieldChange = (field: string, value: any) => {
    // Update local state
    switch (field) {
      case 'start_date': setStartDate(value); break;
      case 'end_date': setEndDate(value); break;
      case 'unit_price': setUnitPrice(value); return; // don't save on every keystroke
      case 'unit': setUnit(value); break;
      case 'currency': setCurrency(value); break;
    }

    // Persist to DB
    if (field === 'start_date' || field === 'end_date') {
      const dateStr = value ? (value as Date).toISOString().split('T')[0] : null;
      updateContract.mutate({ [field]: dateStr });
    } else if (field !== 'unit_price') {
      updateContract.mutate({ [field]: value });
    }
  };

  const handleUnitPriceBlur = () => {
    const num = parseFloat(unitPrice);
    if (!isNaN(num)) {
      updateContract.mutate({ unit_price: num });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Launch PR — {recordNumber}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          {/* Start Date */}
          <div className="space-y-2">
            <Label>Start Date</Label>
            <CustomDatePicker
              selected={startDate}
              onChange={(d) => handleFieldChange('start_date', d)}
              placeholderText="Start date"
            />
          </div>

          {/* End Date */}
          <div className="space-y-2">
            <Label>End Date</Label>
            <CustomDatePicker
              selected={endDate}
              onChange={(d) => handleFieldChange('end_date', d)}
              placeholderText="End date"
            />
          </div>

          {/* Days Worked (read-only) */}
          <div className="space-y-2">
            <Label>Days Worked</Label>
            <Input
              value={daysWorked != null ? String(daysWorked) : ''}
              readOnly
              className="bg-muted"
            />
          </div>

          {/* Unit Price */}
          <div className="space-y-2">
            <Label>Unit Price</Label>
            <Input
              type="number"
              step="0.01"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              onBlur={handleUnitPriceBlur}
              placeholder="0.00"
            />
          </div>

          {/* Unit */}
          <div className="space-y-2">
            <Label>Unit</Label>
            <Select value={unit} onValueChange={(v) => handleFieldChange('unit', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select unit" />
              </SelectTrigger>
              <SelectContent>
                {UNITS.map((u) => (
                  <SelectItem key={u} value={u}>{u}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Currency */}
          <div className="space-y-2">
            <Label>Currency</Label>
            <Select value={currency} onValueChange={(v) => handleFieldChange('currency', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!allFieldsFilled}>Next</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
