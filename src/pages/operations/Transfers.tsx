import { useState, useMemo, Fragment } from 'react';
import { ArrowRight } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ArrowRightLeft, Plus, MoreHorizontal, CheckCircle, Pencil, Trash2, Calendar, ChevronRight, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { TransferFilters, TransferFiltersState } from '@/components/operations/TransferFilters';
import { TransferForm, TransferFormData } from '@/components/operations/TransferForm';
import { TransferStatusBadge, TransferTypeBadge, TransferUserLinkBadge, calculateDaysUntilEnd } from '@/components/operations/TransferStatusBadge';
import { TransferComments, LastTransferCommentPreview } from '@/components/operations/TransferComments';
import { Badge } from '@/components/ui/badge';

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface HrTransfer {
  id: string;
  user_id: string | null;
  last_name: string;
  first_name: string;
  email: string | null;
  staff_number: string | null;
  operation_type: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  job_title: string | null;
  grade: string | null;
  contract_type: string | null;
  duty_station: string | null;
  section_unit: string | null;
  supervisor: string | null;
  main_hr_focal_point: string | null;
  comments: string | null;
  change_types: string[] | null;
  new_duty_station: string | null;
  new_section_unit: string | null;
  new_supervisor: string | null;
  new_job_title: string | null;
  new_grade: string | null;
  new_contract_type: string | null;
  created_at: string;
  updated_at: string;
}

const Transfers = () => {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState<HrTransfer | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  // Link user mutation
  const linkUserMutation = useMutation({
    mutationFn: async ({ transferId, userId, email }: { transferId: string; userId: string; email: string }) => {
      const { error } = await supabase.from('hr_transfers').update({ user_id: userId, email }).eq('id', transferId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['hr-transfers'] }); toast.success('User linked'); },
    onError: (error) => { toast.error('Failed: ' + error.message); },
  });
  const [filters, setFilters] = useState<TransferFiltersState>({
    search: '', operationType: '', status: '', dutyStation: '', hrFocalPoint: '',
  });

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const { data: transfers = [], isLoading } = useQuery({
    queryKey: ['hr-transfers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_transfers')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as HrTransfer[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: TransferFormData) => {
      let userId: string | null = null;
      if (data.email) {
        const { data: existingUser } = await supabase.from('users').select('id').eq('email', data.email).maybeSingle();
        userId = existingUser?.id || null;
      }
      const { selectedUserId, ...formData } = data;
      const { error } = await supabase.from('hr_transfers').insert({
        ...Object.fromEntries(Object.entries(formData).map(([k, v]) => [k, v || null])),
        user_id: selectedUserId || userId || null,
        last_name: formData.last_name,
        first_name: formData.first_name,
        operation_type: formData.operation_type,
        status: formData.status,
      });
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['hr-transfers'] });
      setFormOpen(false);
      toast.success('Transfer created');

      // Fire-and-forget notification to duty station admin
      supabase.functions.invoke('notify-local-admin', {
        body: {
          eventType: 'transfer',
          dutyStation: variables.duty_station || '',
          firstName: variables.first_name,
          lastName: variables.last_name,
          grade: variables.grade || undefined,
          contractType: variables.contract_type || undefined,
          jobTitle: variables.job_title || undefined,
          divisionUnit: variables.section_unit || undefined,
          supervisor: variables.supervisor || undefined,
          startDate: variables.start_date || undefined,
          endDate: variables.end_date || undefined,
          newDutyStation: variables.new_duty_station || undefined,
          newDivisionUnit: variables.new_section_unit || undefined,
        },
      }).catch((err) => console.warn('notify-local-admin failed (non-blocking):', err));
    },
    onError: (error) => { toast.error('Failed: ' + error.message); },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TransferFormData }) => {
      const { selectedUserId, ...formData } = data;
      const { error } = await supabase.from('hr_transfers').update({
        ...Object.fromEntries(Object.entries(formData).map(([k, v]) => [k, v || null])),
        user_id: selectedUserId || null,
        last_name: formData.last_name,
        first_name: formData.first_name,
        operation_type: formData.operation_type,
        status: formData.status,
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['hr-transfers'] }); setEditingTransfer(null); setFormOpen(false); toast.success('Transfer updated'); },
    onError: (error) => { toast.error('Failed: ' + error.message); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('hr_transfers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['hr-transfers'] }); setDeleteConfirmId(null); toast.success('Transfer deleted'); },
    onError: (error) => { toast.error('Failed: ' + error.message); },
  });

  const markCompleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('hr_transfers').update({ status: 'Completed' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['hr-transfers'] }); toast.success('Marked as complete'); },
  });

  const dutyStations = useMemo(() =>
    [...new Set(transfers.map(t => t.duty_station).filter(Boolean) as string[])].sort(), [transfers]);

  const filteredTransfers = useMemo(() => {
    return transfers.filter(t => {
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const fullName = `${t.last_name} ${t.first_name}`.toLowerCase();
        if (!fullName.includes(searchLower)) return false;
      }
      if (filters.operationType && filters.operationType !== 'all' && t.operation_type !== filters.operationType) return false;
      if (filters.status && filters.status !== 'all' && t.status !== filters.status) return false;
      if (filters.dutyStation && filters.dutyStation !== 'all' && t.duty_station !== filters.dutyStation) return false;
      if (filters.hrFocalPoint && filters.hrFocalPoint !== 'all' && t.main_hr_focal_point !== filters.hrFocalPoint) return false;
      return true;
    });
  }, [transfers, filters]);

  const stats = useMemo(() => ({
    total: transfers.length,
    inProgress: transfers.filter(t => t.status === 'In progress').length,
    pending: transfers.filter(t => t.status.startsWith('Pending')).length,
    completed: transfers.filter(t => t.status === 'Completed').length,
    cancelled: transfers.filter(t => t.status === 'Cancelled').length,
    followUp: transfers.filter(t => t.status === 'Follow up').length,
  }), [transfers]);

  const handleFormSubmit = async (data: TransferFormData) => {
    if (editingTransfer) {
      await updateMutation.mutateAsync({ id: editingTransfer.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const handleEdit = (transfer: HrTransfer) => {
    setEditingTransfer(transfer);
    setFormOpen(true);
  };

  const handleCloseForm = (open: boolean) => {
    if (!open) setEditingTransfer(null);
    setFormOpen(open);
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ArrowRightLeft className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Transfers</h1>
              <p className="text-muted-foreground mt-1">Reassignments, STDAs, OICs, Transfers, and Extensions</p>
            </div>
          </div>
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Transfer
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.total}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-amber-600">{stats.pending}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-green-600">{stats.completed}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Cancelled</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-muted-foreground">{stats.cancelled}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Follow Up</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-purple-600">{stats.followUp}</p></CardContent></Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <TransferFilters filters={filters} onFiltersChange={setFilters} dutyStations={dutyStations} />
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>HR Focal Point</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Loading transfers...</TableCell></TableRow>
                ) : filteredTransfers.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No transfers found</TableCell></TableRow>
                ) : (
                  filteredTransfers.map((transfer) => {
                    const isExpanded = expandedRows.has(transfer.id);
                    return (
                      <Fragment key={transfer.id}>
                        <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => toggleRow(transfer.id)}>
                          <TableCell className="w-[40px]">
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); toggleRow(transfer.id); }}>
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </Button>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{transfer.last_name}</p>
                              <p className="text-sm text-muted-foreground">{transfer.first_name}</p>
                              {!isExpanded && <LastTransferCommentPreview transferId={transfer.id} />}
                            </div>
                          </TableCell>
                          <TableCell><TransferTypeBadge type={transfer.operation_type} /></TableCell>
                          <TableCell>
                            {transfer.start_date ? (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                <span className="text-sm">{format(parseISO(transfer.start_date), 'dd MMM yyyy')}</span>
                              </div>
                            ) : <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell>
                            {transfer.end_date ? (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                <span className="text-sm">{format(parseISO(transfer.end_date), 'dd MMM yyyy')}</span>
                              </div>
                            ) : <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell><TransferStatusBadge status={transfer.status} endDate={transfer.end_date} /></TableCell>
                          <TableCell><span className="text-sm">{transfer.duty_station || '—'}</span></TableCell>
                          <TableCell><span className="text-sm">{transfer.main_hr_focal_point || '—'}</span></TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEdit(transfer)}><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
                                {transfer.status !== 'Completed' && (
                                  <DropdownMenuItem onClick={() => markCompleteMutation.mutate(transfer.id)}><CheckCircle className="h-4 w-4 mr-2" />Mark Complete</DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive" onClick={() => setDeleteConfirmId(transfer.id)}>
                                  <Trash2 className="h-4 w-4 mr-2" />Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>

                        {isExpanded && (
                          <TableRow>
                            <TableCell colSpan={9} className="bg-muted/30 p-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                  <h4 className="text-sm font-semibold">Staff Details</h4>
                                  <div className="text-sm space-y-1">
                                    <p><span className="text-muted-foreground">Email:</span> {transfer.email || '—'}</p>
                                    <p><span className="text-muted-foreground">Staff #:</span> {transfer.staff_number || '—'}</p>
                                    <p><span className="text-muted-foreground">Linked:</span> <TransferUserLinkBadge isLinked={!!transfer.user_id} /></p>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <h4 className="text-sm font-semibold">Position Details</h4>
                                  <div className="text-sm space-y-1">
                                    <p><span className="text-muted-foreground">Job Title:</span> {transfer.job_title || '—'}</p>
                                    <p><span className="text-muted-foreground">Grade:</span> {transfer.grade || '—'}</p>
                                    <p><span className="text-muted-foreground">Contract:</span> {transfer.contract_type || '—'}</p>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <h4 className="text-sm font-semibold">Assignment Details</h4>
                                  <div className="text-sm space-y-1">
                                    <p><span className="text-muted-foreground">Unit:</span> {transfer.section_unit || '—'}</p>
                                    <p><span className="text-muted-foreground">Supervisor:</span> {transfer.supervisor || '—'}</p>
                                  </div>
                                </div>
                                {/* Change Types for Transfer/Reassignment */}
                                {transfer.change_types && transfer.change_types.length > 0 && (
                                  <div className="space-y-2 md:col-span-2 lg:col-span-3">
                                    <h4 className="text-sm font-semibold">Changes</h4>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                      {transfer.change_types.map(ct => {
                                        const labels: Record<string, string> = {
                                          unit_division: 'Unit / Division',
                                          supervisor: 'Supervisor',
                                          duty_station: 'Duty Station',
                                          job_title: 'Job Title',
                                          grade: 'Grade',
                                          contract_type: 'Contract Type',
                                        };
                                        return <Badge key={ct} variant="secondary">{labels[ct] || ct} Change</Badge>;
                                      })}
                                    </div>
                                    <div className="text-sm space-y-1">
                                      {transfer.change_types.includes('unit_division') && transfer.new_section_unit && (
                                        <p className="flex items-center gap-1">
                                          <span className="text-muted-foreground">Unit:</span> {transfer.section_unit || '—'} <ArrowRight className="h-3 w-3 text-muted-foreground" /> <span className="font-medium">{transfer.new_section_unit}</span>
                                        </p>
                                      )}
                                      {transfer.change_types.includes('supervisor') && transfer.new_supervisor && (
                                        <p className="flex items-center gap-1">
                                          <span className="text-muted-foreground">Supervisor:</span> {transfer.supervisor || '—'} <ArrowRight className="h-3 w-3 text-muted-foreground" /> <span className="font-medium">{transfer.new_supervisor}</span>
                                        </p>
                                      )}
                                      {transfer.change_types.includes('duty_station') && transfer.new_duty_station && (
                                        <p className="flex items-center gap-1">
                                          <span className="text-muted-foreground">Duty Station:</span> {transfer.duty_station || '—'} <ArrowRight className="h-3 w-3 text-muted-foreground" /> <span className="font-medium">{transfer.new_duty_station}</span>
                                        </p>
                                      )}
                                      {transfer.change_types.includes('job_title') && transfer.new_job_title && (
                                        <p className="flex items-center gap-1">
                                          <span className="text-muted-foreground">Job Title:</span> {transfer.job_title || '—'} <ArrowRight className="h-3 w-3 text-muted-foreground" /> <span className="font-medium">{transfer.new_job_title}</span>
                                        </p>
                                      )}
                                      {transfer.change_types.includes('grade') && transfer.new_grade && (
                                        <p className="flex items-center gap-1">
                                          <span className="text-muted-foreground">Grade:</span> {transfer.grade || '—'} <ArrowRight className="h-3 w-3 text-muted-foreground" /> <span className="font-medium">{transfer.new_grade}</span>
                                        </p>
                                      )}
                                      {transfer.change_types.includes('contract_type') && transfer.new_contract_type && (
                                        <p className="flex items-center gap-1">
                                          <span className="text-muted-foreground">Contract Type:</span> {transfer.contract_type || '—'} <ArrowRight className="h-3 w-3 text-muted-foreground" /> <span className="font-medium">{transfer.new_contract_type}</span>
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                )}
                                {transfer.comments && (
                                  <div className="space-y-2 md:col-span-2 lg:col-span-3">
                                    <h4 className="text-sm font-semibold">Comments</h4>
                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{transfer.comments}</p>
                                  </div>
                                )}
                              </div>
                              <div className="mt-4">
                                <TransferComments transferId={transfer.id} />
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <TransferForm
        open={formOpen}
        onOpenChange={handleCloseForm}
        onSubmit={handleFormSubmit}
        initialData={editingTransfer ? { ...editingTransfer, selectedUserId: editingTransfer.user_id, change_types: editingTransfer.change_types || [] } : undefined}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transfer</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this transfer record? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </Layout>
  );
};

export default Transfers;
