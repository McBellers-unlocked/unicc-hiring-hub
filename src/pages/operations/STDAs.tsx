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
import { Clock, Plus, MoreHorizontal, CheckCircle, Pencil, Trash2, Calendar, Upload, ChevronRight, ChevronDown, Link2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, parseISO, differenceInDays, addWeeks } from 'date-fns';
import { STDAFilters, STDAFiltersState } from '@/components/operations/STDAFilters';
import { STDAForm, STDAFormData } from '@/components/operations/STDAForm';
import { 
  STDAStatusBadge, 
  UserLinkBadge, 
  OperationTypeBadge,
  calculateDaysUntilEnd 
} from '@/components/operations/STDAStatusBadge';
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
import { STDAComments, LastSTDACommentPreview } from '@/components/operations/STDAComments';
import { LinkUserDialog } from '@/components/operations/LinkUserDialog';
import { Badge } from '@/components/ui/badge';

interface HrSTDA {
  id: string;
  email: string | null;
  user_id: string | null;
  staff_number: string | null;
  last_name: string;
  first_name: string;
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
  old_pd: string | null;
  new_pd: string | null;
  vacancy_reference: string | null;
  main_hr_focal_point: string | null;
  comments: string | null;
  actions_in_hr_plan: string | null;
  original_job_title: string | null;
  original_grade: string | null;
  original_unit: string | null;
  created_at: string;
  updated_at: string;
}

const STDAs = () => {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingSTDA, setEditingSTDA] = useState<HrSTDA | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [linkUserDialog, setLinkUserDialog] = useState<{ open: boolean; stdaId: string; name: string } | null>(null);
  const [filters, setFilters] = useState<STDAFiltersState>({
    search: '',
    operationType: '',
    status: '',
    dutyStation: '',
    hrFocalPoint: '',
  });

  // Toggle row expansion
  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Fetch STDAs
  const { data: stdas = [], isLoading } = useQuery({
    queryKey: ['hr-stdas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_stdas')
        .select('*')
        .order('end_date', { ascending: true });
      
      if (error) throw error;
      return data as HrSTDA[];
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: STDAFormData) => {
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
        staff_number: data.staff_number || null,
        user_id: userId,
        operation_type: data.operation_type,
        status: data.status,
        start_date: data.start_date || null,
        end_date: data.end_date || null,
        job_title: data.job_title || null,
        grade: data.grade || null,
        contract_type: data.contract_type || null,
        duty_station: data.duty_station || null,
        section_unit: data.section_unit || null,
        supervisor: data.supervisor || null,
        old_pd: data.old_pd || null,
        new_pd: data.new_pd || null,
        vacancy_reference: data.vacancy_reference || null,
        main_hr_focal_point: data.main_hr_focal_point || null,
        comments: data.comments || null,
        actions_in_hr_plan: data.actions_in_hr_plan || null,
        original_job_title: data.original_job_title || null,
        original_grade: data.original_grade || null,
        original_unit: data.original_unit || null,
      };

      const { error } = await supabase
        .from('hr_stdas')
        .insert(insertData);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-stdas'] });
      setFormOpen(false);
      toast.success('STDA created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create STDA: ' + error.message);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: STDAFormData }) => {
      const { error } = await supabase
        .from('hr_stdas')
        .update({
          ...data,
          start_date: data.start_date || null,
          end_date: data.end_date || null,
        })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-stdas'] });
      setEditingSTDA(null);
      setFormOpen(false);
      toast.success('STDA updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update STDA: ' + error.message);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('hr_stdas')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-stdas'] });
      setDeleteConfirmId(null);
      toast.success('STDA deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete STDA: ' + error.message);
    },
  });

  // Mark as complete mutation
  const markCompleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('hr_stdas')
        .update({ status: 'Completed' })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-stdas'] });
      toast.success('Marked as complete');
    },
  });

  // Extract unique values for filters
  const dutyStations = useMemo(() => 
    [...new Set(stdas.map(a => a.duty_station).filter(Boolean) as string[])].sort(),
    [stdas]
  );

  const hrFocalPoints = useMemo(() => 
    [...new Set(stdas.map(a => a.main_hr_focal_point).filter(Boolean) as string[])].sort(),
    [stdas]
  );

  // Filter STDAs
  const filteredSTDAs = useMemo(() => {
    return stdas.filter(stda => {
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const fullName = `${stda.last_name} ${stda.first_name}`.toLowerCase();
        if (!fullName.includes(searchLower)) return false;
      }
      if (filters.operationType && filters.operationType !== 'all' && stda.operation_type !== filters.operationType) return false;
      if (filters.status && filters.status !== 'all' && stda.status !== filters.status) return false;
      if (filters.dutyStation && filters.dutyStation !== 'all' && stda.duty_station !== filters.dutyStation) return false;
      if (filters.hrFocalPoint && filters.hrFocalPoint !== 'all' && stda.main_hr_focal_point !== filters.hrFocalPoint) return false;
      return true;
    });
  }, [stdas, filters]);

  // Stats
  const stats = useMemo(() => {
    const now = new Date();
    const eightWeeksFromNow = addWeeks(now, 8);
    
    return {
      total: stdas.length,
      active: stdas.filter(a => a.status === 'In progress').length,
      completed: stdas.filter(a => a.status === 'Completed').length,
      endingSoon: stdas.filter(a => {
        if (a.status === 'Completed') return false;
        const daysUntil = calculateDaysUntilEnd(a.end_date);
        return daysUntil !== null && daysUntil >= 0 && daysUntil <= 56; // 8 weeks
      }).length,
      stda: stdas.filter(a => a.operation_type === 'STDA' && a.status !== 'Completed').length,
      oic: stdas.filter(a => a.operation_type === 'OIC' && a.status !== 'Completed').length,
    };
  }, [stdas]);

  const handleFormSubmit = async (data: STDAFormData) => {
    if (editingSTDA) {
      await updateMutation.mutateAsync({ id: editingSTDA.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const handleEdit = (stda: HrSTDA) => {
    setEditingSTDA(stda);
    setFormOpen(true);
  };

  const handleCloseForm = (open: boolean) => {
    if (!open) {
      setEditingSTDA(null);
    }
    setFormOpen(open);
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">STDAs</h1>
              <p className="text-muted-foreground mt-1">
                Short-Term Duty Assignments, OICs, and Reassignments
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add STDA
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
              <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-600">{stats.active}</p>
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
          <Card className={stats.endingSoon > 0 ? 'border-orange-300 bg-orange-50' : ''}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                {stats.endingSoon > 0 && <AlertTriangle className="h-3 w-3 text-orange-600" />}
                Ending in 8 Weeks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${stats.endingSoon > 0 ? 'text-orange-600' : ''}`}>
                {stats.endingSoon}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">STDAs</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-purple-600">{stats.stda}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">OICs</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-indigo-600">{stats.oic}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <STDAFilters
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
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>New Position</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>HR Focal Point</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      Loading STDAs...
                    </TableCell>
                  </TableRow>
                ) : filteredSTDAs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      No STDAs found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSTDAs.map((stda) => {
                    const isExpanded = expandedRows.has(stda.id);
                    const daysUntilEnd = calculateDaysUntilEnd(stda.end_date);
                    const isEndingSoon = daysUntilEnd !== null && daysUntilEnd >= 0 && daysUntilEnd <= 56;
                    
                    return (
                      <Fragment key={stda.id}>
                        <TableRow 
                          className={`cursor-pointer hover:bg-muted/50 ${isEndingSoon && stda.status !== 'Completed' ? 'bg-orange-50/50' : ''}`} 
                          onClick={() => toggleRow(stda.id)}
                        >
                          <TableCell className="w-[40px]">
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); toggleRow(stda.id); }}>
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{stda.last_name}</p>
                              <p className="text-sm text-muted-foreground">{stda.first_name}</p>
                              {!isExpanded && <LastSTDACommentPreview stdaId={stda.id} />}
                            </div>
                          </TableCell>
                          <TableCell>
                            <OperationTypeBadge type={stda.operation_type} />
                          </TableCell>
                          <TableCell>
                            {stda.start_date ? (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                <span className="text-sm">
                                  {format(parseISO(stda.start_date), 'dd MMM yyyy')}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {stda.end_date ? (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                <span className="text-sm">
                                  {format(parseISO(stda.end_date), 'dd MMM yyyy')}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <STDAStatusBadge
                              status={stda.status}
                              endDate={stda.end_date}
                            />
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm">{stda.job_title || '—'}</p>
                              <p className="text-xs text-muted-foreground">
                                {[stda.grade, stda.section_unit].filter(Boolean).join(' • ')}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{stda.duty_station || '—'}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{stda.main_hr_focal_point || '—'}</span>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEdit(stda)}>
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                {stda.status !== 'Completed' && (
                                  <DropdownMenuItem onClick={() => markCompleteMutation.mutate(stda.id)}>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Mark Complete
                                  </DropdownMenuItem>
                                )}
                                {!stda.user_id && (
                                  <DropdownMenuItem onClick={() => setLinkUserDialog({ 
                                    open: true, 
                                    stdaId: stda.id, 
                                    name: `${stda.first_name} ${stda.last_name}` 
                                  })}>
                                    <Link2 className="h-4 w-4 mr-2" />
                                    Link to User
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="text-destructive"
                                  onClick={() => setDeleteConfirmId(stda.id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                        
                        {/* Expanded Row Details */}
                        {isExpanded && (
                          <TableRow>
                            <TableCell colSpan={10} className="bg-muted/30 p-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {/* Staff Details */}
                                <div className="space-y-2">
                                  <h4 className="text-sm font-semibold">Staff Details</h4>
                                  <div className="text-sm space-y-1">
                                    <p><span className="text-muted-foreground">Email:</span> {stda.email || '—'}</p>
                                    <p><span className="text-muted-foreground">Staff #:</span> {stda.staff_number || '—'}</p>
                                    <p><span className="text-muted-foreground">Linked:</span> <UserLinkBadge isLinked={!!stda.user_id} /></p>
                                  </div>
                                </div>
                                
                                {/* Original Position */}
                                <div className="space-y-2">
                                  <h4 className="text-sm font-semibold">Original Position</h4>
                                  <div className="text-sm space-y-1">
                                    <p><span className="text-muted-foreground">Title:</span> {stda.original_job_title || '—'}</p>
                                    <p><span className="text-muted-foreground">Grade:</span> {stda.original_grade || '—'}</p>
                                    <p><span className="text-muted-foreground">Unit:</span> {stda.original_unit || '—'}</p>
                                  </div>
                                </div>
                                
                                {/* Position References */}
                                <div className="space-y-2">
                                  <h4 className="text-sm font-semibold">Position References</h4>
                                  <div className="text-sm space-y-1">
                                    <p><span className="text-muted-foreground">Old PD:</span> {stda.old_pd || '—'}</p>
                                    <p><span className="text-muted-foreground">New PD:</span> {stda.new_pd || '—'}</p>
                                    <p><span className="text-muted-foreground">Vacancy:</span> {stda.vacancy_reference || '—'}</p>
                                  </div>
                                </div>

                                {/* Assignment Details */}
                                <div className="space-y-2">
                                  <h4 className="text-sm font-semibold">New Assignment</h4>
                                  <div className="text-sm space-y-1">
                                    <p><span className="text-muted-foreground">Supervisor:</span> {stda.supervisor || '—'}</p>
                                    <p><span className="text-muted-foreground">Contract:</span> {stda.contract_type || '—'}</p>
                                  </div>
                                </div>
                                
                                {/* HR Notes */}
                                {(stda.comments || stda.actions_in_hr_plan) && (
                                  <div className="space-y-2 md:col-span-2">
                                    <h4 className="text-sm font-semibold">HR Notes</h4>
                                    <div className="text-sm space-y-2">
                                      {stda.comments && (
                                        <p className="text-muted-foreground whitespace-pre-wrap">{stda.comments}</p>
                                      )}
                                      {stda.actions_in_hr_plan && (
                                        <div>
                                          <span className="text-muted-foreground font-medium">Actions in HR Plan:</span>
                                          <p className="text-muted-foreground whitespace-pre-wrap">{stda.actions_in_hr_plan}</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                              
                              {/* Comments Section */}
                              <div className="mt-4">
                                <STDAComments stdaId={stda.id} />
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
      <STDAForm
        open={formOpen}
        onOpenChange={handleCloseForm}
        onSubmit={handleFormSubmit}
        initialData={editingSTDA ? {
          ...editingSTDA,
          operation_type: editingSTDA.operation_type as 'STDA' | 'OIC' | 'Reassignment',
          status: editingSTDA.status as 'Not started' | 'In progress' | 'Completed' | 'Cancelled',
          selectedUserId: editingSTDA.user_id,
        } : undefined}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete STDA</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this STDA record? This action cannot be undone.
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
    </Layout>
  );
};

export default STDAs;
