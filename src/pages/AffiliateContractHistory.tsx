import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Plus, Pencil, Trash2, ExternalLink, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import AffiliateContractDocuments from '@/components/affiliate/AffiliateContractDocuments';

interface ContractHistoryRow {
  id: string;
  user_id: string;
  record_number: string;
  samsaran_pr: string | null;
  samsaran_po: string | null;
  gsm_reg_number: string | null;
  gsm_po: string | null;
  start_date: string | null;
  end_date: string | null;
  days_worked: number | null;
  unit_price: number | null;
  unit: string | null;
  currency: string | null;
  created_at: string;
}

interface FormData {
  samsaran_pr: string;
  samsaran_po: string;
  gsm_reg_number: string;
  gsm_po: string;
  start_date: string;
  end_date: string;
  days_worked: string;
  unit_price: string;
  unit: string;
  currency: string;
}

const emptyForm: FormData = { samsaran_pr: '', samsaran_po: '', gsm_reg_number: '', gsm_po: '', start_date: '', end_date: '', days_worked: '', unit_price: '', unit: '', currency: '' };

export default function AffiliateContractHistory() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<ContractHistoryRow | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [prFilter, setPrFilter] = useState('');
  const [sortColumn, setSortColumn] = useState<keyof ContractHistoryRow | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');



  const { data: affiliate } = useQuery({
    queryKey: ['affiliate-user', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, name')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: rows, isLoading } = useQuery({
    queryKey: ['affiliate-contract-history', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('affiliate_contract_history')
        .select('*')
        .eq('user_id', id!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ContractHistoryRow[];
    },
    enabled: !!id,
  });

  const availablePRs = useMemo(() => {
    if (!rows) return [];
    return [...new Set(rows.map(r => r.samsaran_pr).filter(Boolean))] as string[];
  }, [rows]);

  const totalDaysWorked = useMemo(() => {
    if (!rows) return 0;
    return rows.reduce((sum, r) => sum + (r.days_worked || 0), 0);
  }, [rows]);

  const daysInIteration = useMemo(() => totalDaysWorked % 220, [totalDaysWorked]);

  const contractBreakStart = useMemo(() => {
    if (totalDaysWorked > 0 && totalDaysWorked % 220 === 0 && rows?.length) {
      const latestEnd = rows
        .map(r => r.end_date)
        .filter(Boolean)
        .sort()
        .pop();
      if (latestEnd) {
        const d = new Date(latestEnd + 'T00:00:00');
        d.setDate(d.getDate() + 1);
        return d;
      }
    }
    return null;
  }, [totalDaysWorked, rows]);

  const oldestRecordId = useMemo(() => {
    if (!rows?.length) return null;
    const sorted = [...rows].sort((a, b) => (a.start_date || '').localeCompare(b.start_date || ''));
    return sorted[0].id;
  }, [rows]);

  const contractBreakEnd = useMemo(() => {
    if (!contractBreakStart) return null;
    const d = new Date(contractBreakStart);
    d.setDate(d.getDate() + 31);
    return d;
  }, [contractBreakStart]);

  const saveMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        samsaran_pr: data.samsaran_pr || null,
        samsaran_po: data.samsaran_po || null,
        gsm_reg_number: data.gsm_reg_number || null,
        gsm_po: data.gsm_po || null,
        start_date: data.start_date || null,
        end_date: data.end_date || null,
        days_worked: data.days_worked ? parseInt(data.days_worked, 10) : null,
        unit_price: data.unit_price ? parseFloat(data.unit_price) : null,
        unit: data.unit || null,
        currency: data.currency || null,
      };
      if (editingRow) {
        const { error } = await supabase
          .from('affiliate_contract_history')
          .update(payload)
          .eq('id', editingRow.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('affiliate_contract_history')
          .insert({ ...payload, user_id: id! } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['affiliate-contract-history', id] });
      toast.success(editingRow ? 'Row updated' : 'Row added');
      setDialogOpen(false);
    },
    onError: (err: any) => toast.error(err.message || 'Failed to save'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (rowId: string) => {
      const { error } = await supabase
        .from('affiliate_contract_history')
        .delete()
        .eq('id', rowId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['affiliate-contract-history', id] });
      toast.success('Row deleted');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to delete'),
  });

  const validateForm = (data: FormData): string[] => {
    const errors: string[] = [];
    const otherRows = (rows || []).filter(r => r.id !== editingRow?.id);

    const fields: { key: keyof FormData; label: string }[] = [
      { key: 'samsaran_pr', label: 'Samsaran PR' },
      { key: 'samsaran_po', label: 'Samsaran PO' },
      { key: 'gsm_reg_number', label: 'GSM Reg Number' },
      { key: 'gsm_po', label: 'GSM PO' },
    ];

    for (const { key, label } of fields) {
      const val = data[key].trim();
      if (val) {
        const match = otherRows.find(r => r[key as keyof ContractHistoryRow] === val);
        if (match) errors.push(`${label} value '${val}' already exists in another contract record.`);
      }
    }

    if (data.start_date) {
      const newStart = data.start_date;
      const newEnd = data.end_date || data.start_date;
      for (const row of otherRows) {
        if (row.start_date && row.end_date) {
          if (newStart <= row.end_date && newEnd >= row.start_date) {
            const s = new Date(row.start_date + 'T00:00:00').toLocaleDateString();
            const e = new Date(row.end_date + 'T00:00:00').toLocaleDateString();
            errors.push(`Contract dates overlap with an existing record (${s} - ${e}).`);
            break;
          }
        }
      }
    }

    return errors;
  };

  const handleSave = () => {
    const errors = validateForm(form);
    if (errors.length > 0) {
      errors.forEach(err => toast.error(err));
      return;
    }
    saveMutation.mutate(form);
  };

  const openAdd = () => {
    setEditingRow(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (row: ContractHistoryRow) => {
    setEditingRow(row);
    setForm({
      samsaran_pr: row.samsaran_pr || '',
      samsaran_po: row.samsaran_po || '',
      gsm_reg_number: row.gsm_reg_number || '',
      gsm_po: row.gsm_po || '',
      start_date: row.start_date || '',
      end_date: row.end_date || '',
      days_worked: row.days_worked != null ? String(row.days_worked) : '',
      unit_price: row.unit_price != null ? String(row.unit_price) : '',
      unit: row.unit || '',
      currency: row.currency || '',
    });
    setDialogOpen(true);
  };

  return (
    <Layout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/admin/affiliate-personnel">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              Contract History for {affiliate?.name || '...'}
            </h1>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <p className="text-sm font-medium text-muted-foreground">Total Days Worked</p>
              <h3 className="text-3xl font-bold mt-2">{totalDaysWorked}</h3>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm font-medium text-muted-foreground">Days Worked in This Iteration</p>
              <h3 className="text-3xl font-bold mt-2">{daysInIteration} <span className="text-sm font-normal text-muted-foreground">/ 220</span></h3>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm font-medium text-muted-foreground">Contract Break Starting On</p>
              <h3 className="text-3xl font-bold mt-2">{contractBreakStart ? contractBreakStart.toLocaleDateString() : '—'}</h3>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm font-medium text-muted-foreground">Contract Break Ending On</p>
              <h3 className="text-3xl font-bold mt-2">{contractBreakEnd ? contractBreakEnd.toLocaleDateString() : '—'}</h3>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Contract Records</span>
              <Button size="sm" onClick={openAdd}>
                <Plus className="h-4 w-4 mr-2" /> Add Row
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filter by Samsaran PR..."
                value={prFilter}
                onChange={(e) => setPrFilter(e.target.value)}
                className="pl-9"
              />
            </div>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : !rows?.length ? (
              <div className="text-center py-8 text-muted-foreground">
                No contract history records yet.
              </div>
            ) : (() => {
              const toggleSort = (col: keyof ContractHistoryRow) => {
                if (sortColumn === col) {
                  setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
                } else {
                  setSortColumn(col);
                  setSortDirection('asc');
                }
              };
              const SortIcon = ({ col }: { col: keyof ContractHistoryRow }) => {
                if (sortColumn !== col) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
                return sortDirection === 'asc' ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
              };
              const filtered = rows.filter(r => !prFilter || (r.samsaran_pr || '').toLowerCase().includes(prFilter.toLowerCase()));
              const sorted = sortColumn ? [...filtered].sort((a, b) => {
                const aVal = a[sortColumn];
                const bVal = b[sortColumn];
                if (aVal == null && bVal == null) return 0;
                if (aVal == null) return 1;
                if (bVal == null) return -1;
                const cmp = typeof aVal === 'number' && typeof bVal === 'number' ? aVal - bVal : String(aVal).localeCompare(String(bVal));
                return sortDirection === 'asc' ? cmp : -cmp;
              }) : filtered;
              return (
              <Table>
                <TableHeader>
                  <TableRow>
                    {([
                      ['record_number', 'Record #'],
                      ['samsaran_pr', 'Samsaran PR'],
                      ['samsaran_po', 'Samsaran PO'],
                      ['gsm_reg_number', 'GSM Reg Number'],
                      ['gsm_po', 'GSM PO'],
                      ['start_date', 'Start Date'],
                      ['end_date', 'End Date'],
                      ['days_worked', 'Days Worked'],
                      ['unit_price', 'Unit Price'],
                      ['unit', 'Unit'],
                      ['currency', 'Currency'],
                    ] as [keyof ContractHistoryRow, string][]).map(([key, label]) => (
                      <TableHead key={key}>
                        <button className="flex items-center hover:text-foreground" onClick={() => toggleSort(key)}>
                          {label}<SortIcon col={key} />
                        </button>
                      </TableHead>
                    ))}
                    <TableHead className="w-32">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-mono text-xs font-semibold">{row.record_number}</TableCell>
                      <TableCell>{row.samsaran_pr || '-'}</TableCell>
                      <TableCell>{row.samsaran_po || '-'}</TableCell>
                      <TableCell>{row.gsm_reg_number || '-'}</TableCell>
                      <TableCell>{row.gsm_po || '-'}</TableCell>
                      <TableCell>{row.start_date ? new Date(row.start_date + 'T00:00:00').toLocaleDateString() : '-'}</TableCell>
                      <TableCell>{row.end_date ? new Date(row.end_date + 'T00:00:00').toLocaleDateString() : '-'}</TableCell>
                      <TableCell>{row.days_worked != null ? row.days_worked : '-'}</TableCell>
                      <TableCell>{row.unit_price != null ? row.unit_price : '-'}</TableCell>
                      <TableCell>{row.unit || '-'}</TableCell>
                      <TableCell>{row.currency || '-'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(row)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(row.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" asChild>
                                  <Link to={row.id === oldestRecordId
                                    ? `/admin/affiliate-personnel/${id}/onboarding/${row.record_number}`
                                    : `/admin/affiliate-personnel/${id}/lifecycle/${row.record_number}`
                                  }>
                                    <ExternalLink className="h-4 w-4" />
                                  </Link>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{row.id === oldestRecordId ? 'Go to Onboarding' : 'Go to Lifecycle'}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              );
            })()}
          </CardContent>
        </Card>

        {id && (
          <AffiliateContractDocuments
            userId={id}
            affiliateName={affiliate?.name || ''}
            availablePRs={availablePRs}
            filterPR={prFilter}
          />
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingRow ? 'Edit Record' : 'Add Record'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Start Date</Label>
                <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
              </div>
              <div>
                <Label>End Date</Label>
                <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
              </div>
              <div>
                <Label>Samsaran PR</Label>
                <Input value={form.samsaran_pr} onChange={(e) => setForm({ ...form, samsaran_pr: e.target.value })} />
              </div>
              <div>
                <Label>Samsaran PO</Label>
                <Input value={form.samsaran_po} onChange={(e) => setForm({ ...form, samsaran_po: e.target.value })} />
              </div>
              <div>
                <Label>GSM Reg Number</Label>
                <Input value={form.gsm_reg_number} onChange={(e) => setForm({ ...form, gsm_reg_number: e.target.value })} />
              </div>
              <div>
                <Label>GSM PO</Label>
                <Input value={form.gsm_po} onChange={(e) => setForm({ ...form, gsm_po: e.target.value })} />
              </div>
              <div>
                <Label>Days Worked</Label>
                <Input type="number" value={form.days_worked} onChange={(e) => setForm({ ...form, days_worked: e.target.value })} placeholder="e.g. 220" />
              </div>
              <div>
                <Label>Unit Price</Label>
                <Input type="number" step="0.01" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })} placeholder="e.g. 350.00" />
              </div>
              <div>
                <Label>Unit</Label>
                <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Day</SelectItem>
                    <SelectItem value="hour">Hour</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Currency</Label>
                <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="CHF">CHF</SelectItem>
                    <SelectItem value="INR">INR</SelectItem>
                    <SelectItem value="PKR">PKR</SelectItem>
                    <SelectItem value="BRL">BRL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
