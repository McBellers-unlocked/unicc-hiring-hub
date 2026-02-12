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
import { Label } from '@/components/ui/label';
import { ArrowLeft, Plus, Pencil, Trash2, ExternalLink } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import AffiliateContractDocuments from '@/components/affiliate/AffiliateContractDocuments';

interface ContractHistoryRow {
  id: string;
  user_id: string;
  samsaran_pr: string | null;
  samsaran_po: string | null;
  gsm_reg_number: string | null;
  gsm_po: string | null;
  created_at: string;
}

interface FormData {
  samsaran_pr: string;
  samsaran_po: string;
  gsm_reg_number: string;
  gsm_po: string;
}

const emptyForm: FormData = { samsaran_pr: '', samsaran_po: '', gsm_reg_number: '', gsm_po: '' };

export default function AffiliateContractHistory() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<ContractHistoryRow | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);



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

  const saveMutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (editingRow) {
        const { error } = await supabase
          .from('affiliate_contract_history')
          .update(data)
          .eq('id', editingRow.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('affiliate_contract_history')
          .insert({ ...data, user_id: id! });
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Contract Records</span>
              <Button size="sm" onClick={openAdd}>
                <Plus className="h-4 w-4 mr-2" /> Add Row
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : !rows?.length ? (
              <div className="text-center py-8 text-muted-foreground">
                No contract history records yet.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Samsaran PR</TableHead>
                    <TableHead>Samsaran PO</TableHead>
                    <TableHead>GSM Reg Number</TableHead>
                    <TableHead>GSM PO</TableHead>
                    <TableHead className="w-32">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.samsaran_pr || '-'}</TableCell>
                      <TableCell>{row.samsaran_po || '-'}</TableCell>
                      <TableCell>{row.gsm_reg_number || '-'}</TableCell>
                      <TableCell>{row.gsm_po || '-'}</TableCell>
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
                                  <Link to={`/admin/affiliate-personnel/${id}/lifecycle`}>
                                    <ExternalLink className="h-4 w-4" />
                                  </Link>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Go to Lifecycle</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {id && (
          <AffiliateContractDocuments
            userId={id}
            affiliateName={affiliate?.name || ''}
            availablePRs={availablePRs}
          />
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingRow ? 'Edit Record' : 'Add Record'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
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
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
