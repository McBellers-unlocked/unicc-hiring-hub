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
import { UserPlus, Plus, MoreHorizontal, CheckCircle, Pencil, Trash2, Calendar, Upload, ChevronRight, ChevronDown, Link2, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { AppointmentFilters, AppointmentFiltersState } from '@/components/operations/AppointmentFilters';
import { AppointmentForm, AppointmentFormData } from '@/components/operations/AppointmentForm';
import { 
  AppointmentStatusBadge, 
  UserLinkBadge, 
  OperationTypeBadge,
  calculateDaysUntilStart 
} from '@/components/operations/AppointmentStatusBadge';
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
import { ImportAppointmentsDialog } from '@/components/operations/ImportAppointmentsDialog';
import { AppointmentComments, LastCommentPreview } from '@/components/operations/AppointmentComments';
import { LinkUserDialog } from '@/components/operations/LinkUserDialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface HrAppointment {
  id: string;
  email: string | null;
  user_id: string | null;
  last_name: string;
  first_name: string;
  operation_type: string;
  status: string;
  tentative_date: string | null;
  effective_date: string | null;
  job_title: string | null;
  grade: string | null;
  contract_type: string | null;
  duty_station: string | null;
  section_unit: string | null;
  supervisor: string | null;
  old_po: string | null;
  new_po: string | null;
  vacancy_reference: string | null;
  main_hr_focal_point: string | null;
  recruitment_type: string | null;
  is_international: boolean;
  notice_days_required: number;
  comments: string | null;
  onboarding_comments: string | null;
  actions_in_hr_plan: string | null;
  created_at: string;
  updated_at: string;
}

const Appointments = () => {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<HrAppointment | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [linkUserDialog, setLinkUserDialog] = useState<{ open: boolean; appointmentId: string; name: string } | null>(null);
  const [filters, setFilters] = useState<AppointmentFiltersState>({
    search: '',
    operationType: '',
    status: '',
    dutyStation: '',
    hrFocalPoint: '',
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

  // Fetch appointments
  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['hr-appointments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_appointments')
        .select('*')
        .order('tentative_date', { ascending: true });
      
      if (error) throw error;
      return data as HrAppointment[];
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: AppointmentFormData) => {
      // Check if user exists by email
      let userId: string | null = null;
      if (data.email) {
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', data.email)
          .maybeSingle();
        userId = existingUser?.id || null;
      }

      const insertData = {
        last_name: data.last_name,
        first_name: data.first_name,
        email: data.email || null,
        operation_type: data.operation_type,
        status: data.status,
        tentative_date: data.tentative_date || null,
        effective_date: data.effective_date || null,
        job_title: data.job_title || null,
        grade: data.grade || null,
        contract_type: data.contract_type || null,
        duty_station: data.duty_station || null,
        section_unit: data.section_unit || null,
        supervisor: data.supervisor || null,
        old_po: data.old_po || null,
        new_po: data.new_po || null,
        vacancy_reference: data.vacancy_reference || null,
        main_hr_focal_point: data.main_hr_focal_point || null,
        recruitment_type: data.recruitment_type || 'Newcomer',
        is_international: data.is_international,
        notice_days_required: data.notice_days_required,
        comments: data.comments || null,
        onboarding_comments: data.onboarding_comments || null,
        actions_in_hr_plan: data.actions_in_hr_plan || null,
      };

      const { error } = await supabase
        .from('hr_appointments')
        .insert(insertData);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-appointments'] });
      setFormOpen(false);
      toast.success('Appointment created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create appointment: ' + error.message);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: AppointmentFormData }) => {
      const { error } = await supabase
        .from('hr_appointments')
        .update({
          ...data,
          tentative_date: data.tentative_date || null,
          effective_date: data.effective_date || null,
        })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-appointments'] });
      setEditingAppointment(null);
      setFormOpen(false);
      toast.success('Appointment updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update appointment: ' + error.message);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('hr_appointments')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-appointments'] });
      setDeleteConfirmId(null);
      toast.success('Appointment deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete appointment: ' + error.message);
    },
  });

  // Mark as complete mutation
  const markCompleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('hr_appointments')
        .update({ status: 'Completed' })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-appointments'] });
      toast.success('Marked as complete');
    },
  });

  // Extract unique values for filters
  const dutyStations = useMemo(() => 
    [...new Set(appointments.map(a => a.duty_station).filter(Boolean) as string[])].sort(),
    [appointments]
  );

  const hrFocalPoints = useMemo(() => 
    [...new Set(appointments.map(a => a.main_hr_focal_point).filter(Boolean) as string[])].sort(),
    [appointments]
  );

  // Filter appointments
  const filteredAppointments = useMemo(() => {
    return appointments.filter(apt => {
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const fullName = `${apt.last_name} ${apt.first_name}`.toLowerCase();
        if (!fullName.includes(searchLower)) return false;
      }
      if (filters.operationType && filters.operationType !== 'all' && apt.operation_type !== filters.operationType) return false;
      
      // Hide completed by default unless explicitly filtering for them
      if (!filters.status || filters.status === 'all') {
        if (apt.status === 'Completed') return false;
      } else if (apt.status !== filters.status) {
        return false;
      }
      
      if (filters.dutyStation && filters.dutyStation !== 'all' && apt.duty_station !== filters.dutyStation) return false;
      if (filters.hrFocalPoint && filters.hrFocalPoint !== 'all' && apt.main_hr_focal_point !== filters.hrFocalPoint) return false;
      return true;
    });
  }, [appointments, filters]);

  // Stats
  const stats = useMemo(() => {
    const now = new Date();
    return {
      total: appointments.length,
      inProgress: appointments.filter(a => a.status === 'In progress').length,
      completed: appointments.filter(a => a.status === 'Completed').length,
      overdue: appointments.filter(a => {
        if (a.status !== 'In progress') return false;
        const days = calculateDaysUntilStart(a.tentative_date);
        return days !== null && days < 0;
      }).length,
      newcomers: appointments.filter(a => a.recruitment_type === 'Newcomer').length,
      cbReturns: appointments.filter(a => a.operation_type === 'Appointment (CB)').length,
    };
  }, [appointments]);

  const handleFormSubmit = async (data: AppointmentFormData) => {
    if (editingAppointment) {
      await updateMutation.mutateAsync({ id: editingAppointment.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const handleEdit = (appointment: HrAppointment) => {
    setEditingAppointment(appointment);
    setFormOpen(true);
  };

  const handleCloseForm = (open: boolean) => {
    if (!open) {
      setEditingAppointment(null);
    }
    setFormOpen(open);
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <UserPlus className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Appointments</h1>
              <p className="text-muted-foreground mt-1">
                Track and manage new staff appointments
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Import CSV
            </Button>
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Appointment
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
              <CardTitle className="text-sm font-medium text-muted-foreground">Newcomers</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.newcomers}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">CB Returns</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-purple-600">{stats.cbReturns}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <AppointmentFilters
              filters={filters}
              onFiltersChange={setFilters}
              dutyStations={dutyStations}
              hrFocalPoints={hrFocalPoints}
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
                  <TableHead>Tentative Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>HR Focal Point</TableHead>
                  <TableHead>In System</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      Loading appointments...
                    </TableCell>
                  </TableRow>
                ) : filteredAppointments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      No appointments found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAppointments.map((apt) => {
                    const isExpanded = expandedRows.has(apt.id);
                    return (
                      <Fragment key={apt.id}>
                        <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => toggleRow(apt.id)}>
                          <TableCell className="w-[40px]">
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); toggleRow(apt.id); }}>
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{apt.last_name}</p>
                              <p className="text-sm text-muted-foreground">{apt.first_name}</p>
                              {!isExpanded && <LastCommentPreview appointmentId={apt.id} />}
                            </div>
                          </TableCell>
                          <TableCell>
                            <OperationTypeBadge type={apt.operation_type} />
                          </TableCell>
                          <TableCell>
                            {apt.tentative_date ? (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                <span className="text-sm">
                                  {format(parseISO(apt.tentative_date), 'dd MMM yyyy')}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <AppointmentStatusBadge
                              status={apt.status}
                              tentativeDate={apt.tentative_date}
                            />
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm">{apt.job_title || '—'}</p>
                              <p className="text-xs text-muted-foreground">
                                {[apt.grade, apt.section_unit].filter(Boolean).join(' • ')}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{apt.duty_station || '—'}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{apt.main_hr_focal_point || '—'}</span>
                          </TableCell>
                          <TableCell>
                            <UserLinkBadge userId={apt.user_id} email={apt.email} />
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {apt.status !== 'Completed' && (
                                  <DropdownMenuItem onClick={() => markCompleteMutation.mutate(apt.id)}>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Mark Complete
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => handleEdit(apt)}>
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                {!apt.user_id && (
                                  <DropdownMenuItem onClick={() => setLinkUserDialog({ 
                                    open: true, 
                                    appointmentId: apt.id, 
                                    name: `${apt.first_name} ${apt.last_name}` 
                                  })}>
                                    <Link2 className="h-4 w-4 mr-2" />
                                    Link to User
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => toggleRow(apt.id)}>
                                  <MessageSquare className="h-4 w-4 mr-2" />
                                  {isExpanded ? 'Hide Comments' : 'View Comments'}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => setDeleteConfirmId(apt.id)}
                                  className="text-destructive"
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
                            <TableCell colSpan={10} className="bg-muted/20 p-0">
                              <div className="p-4">
                                <AppointmentComments appointmentId={apt.id} />
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
      <AppointmentForm
        open={formOpen}
        onOpenChange={handleCloseForm}
        onSubmit={handleFormSubmit}
        initialData={editingAppointment ? {
          last_name: editingAppointment.last_name,
          first_name: editingAppointment.first_name,
          email: editingAppointment.email || '',
          operation_type: editingAppointment.operation_type as 'Appointment' | 'Appointment (CB)' | 'Direct Appointment',
          status: editingAppointment.status as 'Not started' | 'In progress' | 'Completed' | 'Cancelled',
          tentative_date: editingAppointment.tentative_date || '',
          effective_date: editingAppointment.effective_date || '',
          job_title: editingAppointment.job_title || '',
          grade: editingAppointment.grade || '',
          contract_type: editingAppointment.contract_type || '',
          duty_station: editingAppointment.duty_station || '',
          section_unit: editingAppointment.section_unit || '',
          supervisor: editingAppointment.supervisor || '',
          old_po: editingAppointment.old_po || '',
          new_po: editingAppointment.new_po || '',
          vacancy_reference: editingAppointment.vacancy_reference || '',
          main_hr_focal_point: editingAppointment.main_hr_focal_point || '',
          recruitment_type: editingAppointment.recruitment_type || 'Newcomer',
          is_international: editingAppointment.is_international,
          notice_days_required: editingAppointment.notice_days_required,
          comments: editingAppointment.comments || '',
          onboarding_comments: editingAppointment.onboarding_comments || '',
          actions_in_hr_plan: editingAppointment.actions_in_hr_plan || '',
        } : undefined}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Appointment?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the appointment record.
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

      {/* Import Dialog */}
      <ImportAppointmentsDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImportComplete={() => {
          queryClient.invalidateQueries({ queryKey: ['hr-appointments'] });
        }}
      />

      {/* Link User Dialog */}
      {linkUserDialog && (
        <LinkUserDialog
          open={linkUserDialog.open}
          onOpenChange={(open) => !open && setLinkUserDialog(null)}
          appointmentId={linkUserDialog.appointmentId}
          appointmentName={linkUserDialog.name}
        />
      )}
    </Layout>
  );
};

export default Appointments;
