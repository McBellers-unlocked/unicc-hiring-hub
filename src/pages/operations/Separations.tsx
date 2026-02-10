import { useState, useMemo, Fragment } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserMinus, Plus, MoreHorizontal, CheckCircle, Pencil, Trash2, Calendar, Upload, ChevronRight, ChevronDown, Link2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { calculateCBReturnDate } from '@/lib/officialHolidays';
import { SeparationFilters, SeparationFiltersState } from '@/components/operations/SeparationFilters';
import { SeparationForm, SeparationFormData } from '@/components/operations/SeparationForm';
import { 
  SeparationStatusBadge, 
  SeparationTypeBadge,
  ReasonBadge,
  calculateDaysUntilSeparation 
} from '@/components/operations/SeparationStatusBadge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ImportSeparationsDialog } from '@/components/operations/ImportSeparationsDialog';
import { SeparationComments, LastSeparationCommentPreview } from '@/components/operations/SeparationComments';
import { SeparationLinkUserDialog } from '@/components/operations/SeparationLinkUserDialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { UserLinkBadge } from '@/components/operations/AppointmentStatusBadge';
import { Badge } from '@/components/ui/badge';

interface HrSeparation {
  id: string;
  email: string | null;
  user_id: string | null;
  last_name: string;
  first_name: string;
  operation_type: string;
  reason: string | null;
  status: string;
  tentative_date: string | null;
  effective_date: string | null;
  job_title: string | null;
  grade: string | null;
  contract_type: string | null;
  duty_station: string | null;
  pd_number: string | null;
  section_unit: string | null;
  supervisor: string | null;
  supervisor_staff_number: string | null;
  separation_type: string | null;
  event_type: string | null;
  staff_number: string | null;
  main_hr_focal_point: string | null;
  is_international: boolean;
  notice_days_required: number;
  comments: string | null;
  actions_in_hr_plan: string | null;
  clearance_status: string | null;
  linked_appointment_id: string | null;
  created_at: string;
  updated_at: string;
}

const Separations = () => {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingSeparation, setEditingSeparation] = useState<HrSeparation | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [linkUserDialog, setLinkUserDialog] = useState<{ open: boolean; separationId: string; name: string } | null>(null);
  const [filters, setFilters] = useState<SeparationFiltersState>({
    search: '',
    operationType: '',
    status: '',
    dutyStation: '',
    hrFocalPoint: '',
    reason: '',
  });
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  // Toggle row expansion
  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Fetch separations
  const { data: separations = [], isLoading } = useQuery({
    queryKey: ['hr-separations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_separations')
        .select('*')
        .order('tentative_date', { ascending: true });
      
      if (error) throw error;
      return data as HrSeparation[];
    },
  });

  // Create mutation with CB workflow automation
  const createMutation = useMutation({
    mutationFn: async (data: SeparationFormData) => {
      // Check if user exists by email or use selected user ID
      let userId: string | null = data.selectedUserId || null;
      if (!userId && data.email) {
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', data.email)
          .maybeSingle();
        userId = existingUser?.id || null;
      }

      const insertData = {
        user_id: userId,
        last_name: data.last_name,
        first_name: data.first_name,
        email: data.email || null,
        operation_type: data.operation_type,
        reason: data.reason || null,
        status: data.status,
        tentative_date: data.tentative_date || null,
        effective_date: data.effective_date || null,
        job_title: data.job_title || null,
        grade: data.grade || null,
        contract_type: data.contract_type || null,
        duty_station: data.duty_station || null,
        pd_number: data.pd_number || null,
        section_unit: data.section_unit || null,
        supervisor: data.supervisor || null,
        supervisor_staff_number: data.supervisor_staff_number || null,
        separation_type: data.separation_type || null,
        event_type: data.event_type || null,
        staff_number: data.staff_number || null,
        main_hr_focal_point: data.main_hr_focal_point || null,
        is_international: data.is_international,
        notice_days_required: data.notice_days_required,
        comments: data.comments || null,
        actions_in_hr_plan: data.actions_in_hr_plan || null,
        clearance_status: data.clearance_status || null,
      };

      // Create the separation
      const { data: separation, error } = await supabase
        .from('hr_separations')
        .insert(insertData)
        .select()
        .single();
      
      if (error) throw error;

      // CB Workflow: If this is a CB type, create linked appointment
      const isCBType = data.operation_type.includes('(CB)');
      if (isCBType && separation) {
        // Calculate return date: separation date + 31 days, skipping weekends & holidays
        const returnDate = data.tentative_date
          ? calculateCBReturnDate(data.tentative_date, data.duty_station || '')
          : null;

        // Create the appointment record
        const { data: appointment, error: appointmentError } = await supabase
          .from('hr_appointments')
          .insert({
            user_id: userId,
            last_name: data.last_name,
            first_name: data.first_name,
            email: data.email || null,
            operation_type: 'Appointment (CB)',
            status: 'Not started',
            tentative_date: returnDate,
            job_title: data.job_title || null,
            grade: data.grade || null,
            duty_station: data.duty_station || null,
            section_unit: data.section_unit || null,
            supervisor: data.supervisor || null,
            main_hr_focal_point: data.main_hr_focal_point || null,
            is_international: data.is_international,
            recruitment_type: 'CB Return',
            linked_separation_id: separation.id,
            comments: `Auto-created from contract break separation on ${format(new Date(), 'dd MMM yyyy')}`,
          })
          .select()
          .single();

        if (appointmentError) {
          console.error('Failed to create CB appointment:', appointmentError);
        } else if (appointment) {
          // Update separation with the appointment link
          await supabase
            .from('hr_separations')
            .update({ linked_appointment_id: appointment.id })
            .eq('id', separation.id);
        }

        return { separation, appointment, isCB: true, returnDate };
      }

      return { separation, isCB: false };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['hr-separations'] });
      queryClient.invalidateQueries({ queryKey: ['hr-appointments'] });
      setFormOpen(false);
      
      if (result.isCB && result.returnDate) {
        toast.success(
          `Separation created. Appointment (CB) for return scheduled for ${format(parseISO(result.returnDate), 'dd MMM yyyy')}.`,
          { duration: 5000 }
        );
      } else {
        toast.success('Separation created successfully');
      }
    },
    onError: (error) => {
      toast.error('Failed to create separation: ' + error.message);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: SeparationFormData }) => {
      const { error } = await supabase
        .from('hr_separations')
        .update({
          ...data,
          tentative_date: data.tentative_date || null,
          effective_date: data.effective_date || null,
        })
        .eq('id', id);
      
      if (error) throw error;

      // Recalculate linked appointment return date for CB separations
      if (
        editingSeparation?.operation_type?.includes('(CB)') &&
        editingSeparation.linked_appointment_id &&
        data.tentative_date
      ) {
        const newReturnDate = calculateCBReturnDate(data.tentative_date, data.duty_station || '');
        const { error: aptError } = await supabase
          .from('hr_appointments')
          .update({ tentative_date: newReturnDate })
          .eq('id', editingSeparation.linked_appointment_id);
        if (aptError) throw aptError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-separations'] });
      queryClient.invalidateQueries({ queryKey: ['hr-appointments'] });
      setEditingSeparation(null);
      setFormOpen(false);
      toast.success('Separation updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update separation: ' + error.message);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('hr_separations')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-separations'] });
      setDeleteConfirmId(null);
      toast.success('Separation deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete separation: ' + error.message);
    },
  });

  // Mark as complete mutation
  const markCompleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('hr_separations')
        .update({ status: 'Completed' })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-separations'] });
      toast.success('Marked as complete');
    },
  });

  // Link user mutation
  const linkUserMutation = useMutation({
    mutationFn: async ({ separationId, userId }: { separationId: string; userId: string }) => {
      // Get the user's email first
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('email')
        .eq('id', userId)
        .single();
      
      if (userError) throw userError;

      const { error } = await supabase
        .from('hr_separations')
        .update({ user_id: userId, email: userData.email })
        .eq('id', separationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-separations'] });
      setLinkUserDialog(null);
      toast.success('User linked successfully');
    },
    onError: (error) => {
      toast.error('Failed to link user: ' + error.message);
    },
  });

  // Extract unique values for filters
  const dutyStations = useMemo(() => 
    [...new Set(separations.map(s => s.duty_station).filter(Boolean) as string[])].sort(),
    [separations]
  );


  // Filter separations
  const filteredSeparations = useMemo(() => {
    return separations.filter(sep => {
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const fullName = `${sep.last_name} ${sep.first_name}`.toLowerCase();
        if (!fullName.includes(searchLower)) return false;
      }
      if (filters.operationType && filters.operationType !== 'all' && sep.operation_type !== filters.operationType) return false;
      
      // Hide completed by default unless explicitly filtering for them
      if (!filters.status || filters.status === 'all') {
        if (sep.status === 'Completed') return false;
      } else if (sep.status !== filters.status) {
        return false;
      }
      
      if (filters.dutyStation && filters.dutyStation !== 'all' && sep.duty_station !== filters.dutyStation) return false;
      if (filters.hrFocalPoint && filters.hrFocalPoint !== 'all' && sep.main_hr_focal_point !== filters.hrFocalPoint) return false;
      if (filters.reason && filters.reason !== 'all' && sep.reason !== filters.reason) return false;
      return true;
    });
  }, [separations, filters]);

  // Stats
  const stats = useMemo(() => {
    return {
      total: separations.length,
      inProgress: separations.filter(s => s.status === 'In progress').length,
      completed: separations.filter(s => s.status === 'Completed').length,
      overdue: separations.filter(s => {
        if (s.status !== 'In progress') return false;
        const days = calculateDaysUntilSeparation(s.tentative_date);
        return days !== null && days < 0;
      }).length,
      voluntary: separations.filter(s => s.reason?.toLowerCase().includes('voluntary') && !s.reason?.toLowerCase().includes('non')).length,
      contractBreaks: separations.filter(s => s.operation_type.includes('CB')).length,
    };
  }, [separations]);

  const handleFormSubmit = async (data: SeparationFormData) => {
    if (editingSeparation) {
      await updateMutation.mutateAsync({ id: editingSeparation.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const handleEdit = (separation: HrSeparation) => {
    setEditingSeparation(separation);
    setFormOpen(true);
  };

  const handleCloseForm = (open: boolean) => {
    if (!open) {
      setEditingSeparation(null);
    }
    setFormOpen(open);
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <UserMinus className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Separations</h1>
              <p className="text-muted-foreground mt-1">
                Manage staff separations and offboarding processes
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Import Excel
            </Button>
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Separation
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-amber-600">{stats.inProgress}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Overdue</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-destructive">{stats.overdue}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Voluntary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-600">{stats.voluntary}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Contract Breaks</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-orange-600">{stats.contractBreaks}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <SeparationFilters
              filters={filters}
              onFiltersChange={setFilters}
              dutyStations={dutyStations}
            />
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
                  <TableHead>Reason</TableHead>
                  <TableHead>Separation Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>HR Focal Point</TableHead>
                  <TableHead>In System</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      Loading separations...
                    </TableCell>
                  </TableRow>
                ) : filteredSeparations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      No separations found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSeparations.map((sep) => {
                    const isExpanded = expandedRows.has(sep.id);
                    return (
                      <Fragment key={sep.id}>
                        <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => toggleRow(sep.id)}>
                          <TableCell className="w-[40px]">
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); toggleRow(sep.id); }}>
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{sep.last_name}</p>
                              <p className="text-sm text-muted-foreground">{sep.first_name}</p>
                              {!isExpanded && <LastSeparationCommentPreview separationId={sep.id} />}
                            </div>
                          </TableCell>
                          <TableCell>
                            <SeparationTypeBadge type={sep.operation_type} />
                          </TableCell>
                          <TableCell>
                            <ReasonBadge reason={sep.reason} />
                          </TableCell>
                          <TableCell>
                            {sep.tentative_date ? (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                <span className="text-sm">
                                  {format(parseISO(sep.tentative_date), 'dd MMM yyyy')}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <SeparationStatusBadge
                              status={sep.status}
                              tentativeDate={sep.tentative_date}
                            />
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm">{sep.job_title || '—'}</p>
                              <p className="text-xs text-muted-foreground">
                                {[sep.grade, sep.section_unit].filter(Boolean).join(' • ')}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{sep.main_hr_focal_point || '—'}</span>
                          </TableCell>
                          <TableCell>
                            <UserLinkBadge userId={sep.user_id} email={sep.email} />
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEdit(sep)}>
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                {!sep.user_id && (
                                  <DropdownMenuItem onClick={() => setLinkUserDialog({ open: true, separationId: sep.id, name: `${sep.first_name} ${sep.last_name}` })}>
                                    <Link2 className="h-4 w-4 mr-2" />
                                    Link to User
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                {sep.status !== 'Completed' && (
                                  <DropdownMenuItem onClick={() => markCompleteMutation.mutate(sep.id)}>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Mark Complete
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem 
                                  className="text-destructive"
                                  onClick={() => setDeleteConfirmId(sep.id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow>
                            <TableCell colSpan={10} className="bg-muted/20 p-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                      <span className="text-muted-foreground">Duty Station:</span>
                                      <span className="ml-2 font-medium">{sep.duty_station || '—'}</span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Contract:</span>
                                      <span className="ml-2 font-medium">{sep.contract_type || '—'}</span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Staff #:</span>
                                      <span className="ml-2 font-medium">{sep.staff_number || '—'}</span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">PD:</span>
                                      <span className="ml-2 font-medium">{sep.pd_number || '—'}</span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Supervisor:</span>
                                      <span className="ml-2 font-medium">{sep.supervisor || '—'}</span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Event Type:</span>
                                      <span className="ml-2 font-medium">{sep.separation_type || sep.event_type || '—'}</span>
                                    </div>
                                  </div>
                                  {sep.comments && (
                                    <div className="mt-3 p-2 bg-muted/50 rounded text-sm">
                                      <span className="text-muted-foreground block mb-1">Notes:</span>
                                      {sep.comments}
                                    </div>
                                  )}
                                  {sep.actions_in_hr_plan && (
                                    <div className="p-2 bg-muted/50 rounded text-sm">
                                      <span className="text-muted-foreground block mb-1">Actions in HR Plan:</span>
                                      {sep.actions_in_hr_plan}
                                    </div>
                                  )}
                                </div>
                                <SeparationComments separationId={sep.id} />
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

      {/* Form Dialog */}
      <SeparationForm
        open={formOpen}
        onOpenChange={handleCloseForm}
        onSubmit={handleFormSubmit}
        initialData={editingSeparation ? {
          ...editingSeparation,
          status: editingSeparation.status as 'Not started' | 'In progress' | 'Completed' | 'Cancelled',
        } : undefined}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Import Dialog */}
      <ImportSeparationsDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Separation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this separation record? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Link User Dialog - Using SeparationLinkUserDialog */}
      {linkUserDialog && (
        <SeparationLinkUserDialog
          open={linkUserDialog.open}
          onOpenChange={(open) => !open && setLinkUserDialog(null)}
          separationId={linkUserDialog.separationId}
          separationName={linkUserDialog.name}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['hr-separations'] });
            setLinkUserDialog(null);
          }}
        />
      )}
    </Layout>
  );
};

export default Separations;
