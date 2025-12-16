import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Plus, Calendar, Edit, Trash2, Play, CheckCircle, Building2, User, Users, AlertTriangle, Wand2, Check, ChevronsUpDown } from 'lucide-react';
import { toast } from 'sonner';
import { format, addYears, subDays, endOfYear } from 'date-fns';
import { cn } from '@/lib/utils';

const AdminPerformanceCycles = () => {
  const { user, userRoles } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('organization');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isIndividualDialogOpen, setIsIndividualDialogOpen] = useState(false);
  const [editingCycle, setEditingCycle] = useState<any>(null);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [staffSearchOpen, setStaffSearchOpen] = useState(false);
  const [cycleTypeFilter, setCycleTypeFilter] = useState<string>('all');
  
  const [formData, setFormData] = useState({
    name: '',
    start_date: '',
    end_date: '',
    begin_year_deadline: '',
    mid_year_deadline: '',
    end_year_deadline: '',
    status: 'draft'
  });

  const [individualFormData, setIndividualFormData] = useState({
    cycle_type: 'probation',
    start_date: '',
    end_date: '',
    begin_year_deadline: '',
    mid_year_deadline: '',
    end_year_deadline: '',
    status: 'active'
  });

  const isAdmin = userRoles.includes('Admin') || userRoles.includes('HR Assistant') || userRoles.includes('Chief of HR');

  // Fetch organization cycles
  const { data: orgCycles, isLoading: orgLoading } = useQuery({
    queryKey: ['performance-cycles-org'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('performance_cycles')
        .select('*')
        .is('staff_id', null)
        .order('start_date', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: isAdmin
  });

  // Fetch individual cycles
  const { data: individualCycles, isLoading: individualLoading } = useQuery({
    queryKey: ['performance-cycles-individual'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('performance_cycles')
        .select(`
          *,
          staff:users!performance_cycles_staff_id_fkey(id, name, email, entry_on_duty_date)
        `)
        .not('staff_id', 'is', null)
        .order('start_date', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: isAdmin
  });

  // Fetch all staff for selection
  const { data: allStaff } = useQuery({
    queryKey: ['all-staff-for-cycles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, entry_on_duty_date, probation_end_date')
        .order('name');
      
      if (error) throw error;
      return data;
    },
    enabled: isAdmin
  });

  // Fetch probationers without cycles
  const { data: probationersWithoutCycles } = useQuery({
    queryKey: ['probationers-without-cycles', individualCycles],
    queryFn: async () => {
      if (!allStaff) return [];
      
      const now = new Date();
      const oneYearAgo = subDays(now, 365);
      
      // Staff who joined within the last year (probationers)
      const probationers = allStaff.filter(s => {
        if (!s.entry_on_duty_date) return false;
        const eod = new Date(s.entry_on_duty_date);
        return eod >= oneYearAgo;
      });
      
      // Get IDs of staff who already have probation cycles
      const staffWithCycles = new Set(
        (individualCycles || [])
          .filter(c => c.cycle_type === 'probation')
          .map(c => c.staff_id)
      );
      
      return probationers.filter(p => !staffWithCycles.has(p.id));
    },
    enabled: isAdmin && !!allStaff
  });

  // Create/Update org cycle mutation
  const saveOrgCycle = useMutation({
    mutationFn: async (data: any) => {
      if (editingCycle) {
        const { error } = await supabase
          .from('performance_cycles')
          .update(data)
          .eq('id', editingCycle.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('performance_cycles')
          .insert({ ...data, created_by: user?.id, cycle_type: 'organization' });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance-cycles-org'] });
      toast.success(editingCycle ? 'Cycle updated' : 'Cycle created');
      resetOrgForm();
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });

  // Create individual cycle mutation
  const saveIndividualCycle = useMutation({
    mutationFn: async () => {
      if (!selectedStaff) throw new Error('Please select a staff member');
      
      const cycleName = individualFormData.cycle_type === 'probation' 
        ? `Probation - ${selectedStaff.name}`
        : `Transition - ${selectedStaff.name}`;
      
      const { error } = await supabase
        .from('performance_cycles')
        .insert({
          name: cycleName,
          staff_id: selectedStaff.id,
          cycle_type: individualFormData.cycle_type,
          start_date: individualFormData.start_date,
          end_date: individualFormData.end_date,
          begin_year_deadline: individualFormData.begin_year_deadline || null,
          mid_year_deadline: individualFormData.mid_year_deadline || null,
          end_year_deadline: individualFormData.end_year_deadline || null,
          status: individualFormData.status,
          is_auto_generated: false,
          created_by: user?.id
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance-cycles-individual'] });
      queryClient.invalidateQueries({ queryKey: ['probationers-without-cycles'] });
      toast.success('Individual cycle created');
      resetIndividualForm();
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });

  // Bulk generate probation cycles
  const bulkGenerateProbation = useMutation({
    mutationFn: async () => {
      if (!probationersWithoutCycles || probationersWithoutCycles.length === 0) {
        throw new Error('No probationers need cycles');
      }
      
      const cyclesToCreate = probationersWithoutCycles.map(staff => {
        const eod = new Date(staff.entry_on_duty_date!);
        const probationEnd = subDays(addYears(eod, 1), 1);
        
        return {
          name: `Probation - ${staff.name}`,
          staff_id: staff.id,
          cycle_type: 'probation',
          start_date: format(eod, 'yyyy-MM-dd'),
          end_date: format(probationEnd, 'yyyy-MM-dd'),
          status: 'active',
          is_auto_generated: true,
          created_by: user?.id
        };
      });
      
      const { error } = await supabase
        .from('performance_cycles')
        .insert(cyclesToCreate);
      
      if (error) throw error;
      return cyclesToCreate.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['performance-cycles-individual'] });
      queryClient.invalidateQueries({ queryKey: ['probationers-without-cycles'] });
      toast.success(`Created ${count} probation cycles`);
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });

  // Delete mutation
  const deleteCycle = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('performance_cycles')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance-cycles-org'] });
      queryClient.invalidateQueries({ queryKey: ['performance-cycles-individual'] });
      toast.success('Cycle deleted');
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });

  // Update status mutation
  const updateStatus = useMutation({
    mutationFn: async ({ id, status, isIndividual }: { id: string; status: string; isIndividual?: boolean }) => {
      // If setting org cycle to active, deactivate other org cycles
      if (status === 'active' && !isIndividual) {
        await supabase
          .from('performance_cycles')
          .update({ status: 'completed' })
          .eq('status', 'active')
          .is('staff_id', null);
      }
      
      const { error } = await supabase
        .from('performance_cycles')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance-cycles-org'] });
      queryClient.invalidateQueries({ queryKey: ['performance-cycles-individual'] });
      toast.success('Status updated');
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });

  const resetOrgForm = () => {
    setFormData({
      name: '',
      start_date: '',
      end_date: '',
      begin_year_deadline: '',
      mid_year_deadline: '',
      end_year_deadline: '',
      status: 'draft'
    });
    setEditingCycle(null);
    setIsDialogOpen(false);
  };

  const resetIndividualForm = () => {
    setIndividualFormData({
      cycle_type: 'probation',
      start_date: '',
      end_date: '',
      begin_year_deadline: '',
      mid_year_deadline: '',
      end_year_deadline: '',
      status: 'active'
    });
    setSelectedStaff(null);
    setIsIndividualDialogOpen(false);
  };

  const handleEditOrg = (cycle: any) => {
    setEditingCycle(cycle);
    setFormData({
      name: cycle.name,
      start_date: cycle.start_date,
      end_date: cycle.end_date,
      begin_year_deadline: cycle.begin_year_deadline || '',
      mid_year_deadline: cycle.mid_year_deadline || '',
      end_year_deadline: cycle.end_year_deadline || '',
      status: cycle.status
    });
    setIsDialogOpen(true);
  };

  const handleSubmitOrg = (e: React.FormEvent) => {
    e.preventDefault();
    saveOrgCycle.mutate(formData);
  };

  const handleSubmitIndividual = (e: React.FormEvent) => {
    e.preventDefault();
    saveIndividualCycle.mutate();
  };

  // Auto-calculate dates when staff is selected
  const handleStaffSelect = (staff: any) => {
    setSelectedStaff(staff);
    setStaffSearchOpen(false);
    
    if (staff.entry_on_duty_date) {
      const eod = new Date(staff.entry_on_duty_date);
      
      if (individualFormData.cycle_type === 'probation') {
        const probationEnd = subDays(addYears(eod, 1), 1);
        setIndividualFormData(prev => ({
          ...prev,
          start_date: format(eod, 'yyyy-MM-dd'),
          end_date: format(probationEnd, 'yyyy-MM-dd')
        }));
      } else {
        // Transition: starts day after probation ends, ends Dec 31 of following year
        const probationEnd = addYears(eod, 1);
        const transitionEnd = endOfYear(addYears(probationEnd, 1));
        setIndividualFormData(prev => ({
          ...prev,
          start_date: format(probationEnd, 'yyyy-MM-dd'),
          end_date: format(transitionEnd, 'yyyy-MM-dd')
        }));
      }
    }
  };

  // Recalculate dates when cycle type changes
  const handleCycleTypeChange = (type: string) => {
    setIndividualFormData(prev => ({ ...prev, cycle_type: type }));
    
    if (selectedStaff?.entry_on_duty_date) {
      const eod = new Date(selectedStaff.entry_on_duty_date);
      
      if (type === 'probation') {
        const probationEnd = subDays(addYears(eod, 1), 1);
        setIndividualFormData(prev => ({
          ...prev,
          cycle_type: type,
          start_date: format(eod, 'yyyy-MM-dd'),
          end_date: format(probationEnd, 'yyyy-MM-dd')
        }));
      } else {
        const probationEnd = addYears(eod, 1);
        const transitionEnd = endOfYear(addYears(probationEnd, 1));
        setIndividualFormData(prev => ({
          ...prev,
          cycle_type: type,
          start_date: format(probationEnd, 'yyyy-MM-dd'),
          end_date: format(transitionEnd, 'yyyy-MM-dd')
        }));
      }
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="outline">Draft</Badge>;
      case 'active':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Active</Badge>;
      case 'completed':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Completed</Badge>;
      case 'archived':
        return <Badge variant="secondary">Archived</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getCycleTypeBadge = (type: string) => {
    switch (type) {
      case 'probation':
        return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">Probation</Badge>;
      case 'transition':
        return <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">Transition</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const filteredIndividualCycles = individualCycles?.filter(c => 
    cycleTypeFilter === 'all' || c.cycle_type === cycleTypeFilter
  );

  if (!isAdmin) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">You don't have permission to access this page.</p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Performance Cycles</h1>
          <p className="text-muted-foreground">Manage organization-wide and individual ePMDS performance cycles</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="organization" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Organization Cycles
            </TabsTrigger>
            <TabsTrigger value="individual" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Individual Cycles
              {individualCycles && individualCycles.length > 0 && (
                <Badge variant="secondary" className="ml-1">{individualCycles.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Organization Cycles Tab */}
          <TabsContent value="organization">
            <div className="flex justify-end mb-4">
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={resetOrgForm}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Organization Cycle
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <form onSubmit={handleSubmitOrg}>
                    <DialogHeader>
                      <DialogTitle>{editingCycle ? 'Edit Cycle' : 'Create Organization Cycle'}</DialogTitle>
                      <DialogDescription>
                        Set up a new annual performance cycle for all staff (Jan - Dec)
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Cycle Name</Label>
                        <Input
                          id="name"
                          placeholder="e.g., 2025 Performance Cycle"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          required
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="start_date">Start Date</Label>
                          <Input
                            id="start_date"
                            type="date"
                            value={formData.start_date}
                            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="end_date">End Date</Label>
                          <Input
                            id="end_date"
                            type="date"
                            value={formData.end_date}
                            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="begin_year_deadline">Begin Year Deadline</Label>
                        <Input
                          id="begin_year_deadline"
                          type="date"
                          value={formData.begin_year_deadline}
                          onChange={(e) => setFormData({ ...formData, begin_year_deadline: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="mid_year_deadline">Mid Year Deadline</Label>
                        <Input
                          id="mid_year_deadline"
                          type="date"
                          value={formData.mid_year_deadline}
                          onChange={(e) => setFormData({ ...formData, mid_year_deadline: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="end_year_deadline">End Year Deadline</Label>
                        <Input
                          id="end_year_deadline"
                          type="date"
                          value={formData.end_year_deadline}
                          onChange={(e) => setFormData({ ...formData, end_year_deadline: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="status">Status</Label>
                        <Select
                          value={formData.status}
                          onValueChange={(value) => setFormData({ ...formData, status: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="archived">Archived</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={resetOrgForm}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={saveOrgCycle.isPending}>
                        {saveOrgCycle.isPending ? 'Saving...' : editingCycle ? 'Update' : 'Create'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Organization-wide Cycles</CardTitle>
                <CardDescription>
                  Annual cycles for all regular staff (typically Jan - Dec)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {orgLoading ? (
                  <div className="animate-pulse space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-16 bg-muted rounded" />
                    ))}
                  </div>
                ) : orgCycles && orgCycles.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cycle Name</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Deadlines</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orgCycles.map((cycle) => (
                        <TableRow key={cycle.id}>
                          <TableCell className="font-medium">{cycle.name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              {format(new Date(cycle.start_date), 'MMM d, yyyy')} - {format(new Date(cycle.end_date), 'MMM d, yyyy')}
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(cycle.status)}</TableCell>
                          <TableCell>
                            <div className="text-xs space-y-1">
                              {cycle.begin_year_deadline && (
                                <div>Begin: {format(new Date(cycle.begin_year_deadline), 'MMM d')}</div>
                              )}
                              {cycle.mid_year_deadline && (
                                <div>Mid: {format(new Date(cycle.mid_year_deadline), 'MMM d')}</div>
                              )}
                              {cycle.end_year_deadline && (
                                <div>End: {format(new Date(cycle.end_year_deadline), 'MMM d')}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {cycle.status === 'draft' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => updateStatus.mutate({ id: cycle.id, status: 'active' })}
                                >
                                  <Play className="h-4 w-4" />
                                </Button>
                              )}
                              {cycle.status === 'active' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => updateStatus.mutate({ id: cycle.id, status: 'completed' })}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditOrg(cycle)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              {cycle.status === 'draft' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive"
                                  onClick={() => deleteCycle.mutate(cycle.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No organization cycles created yet
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Individual Cycles Tab */}
          <TabsContent value="individual">
            {/* Warning banner for probationers without cycles */}
            {probationersWithoutCycles && probationersWithoutCycles.length > 0 && (
              <Card className="mb-4 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5 text-amber-600" />
                      <div>
                        <p className="font-medium text-amber-800 dark:text-amber-200">
                          {probationersWithoutCycles.length} probationary staff without performance cycles
                        </p>
                        <p className="text-sm text-amber-700 dark:text-amber-300">
                          {probationersWithoutCycles.slice(0, 3).map(s => s.name).join(', ')}
                          {probationersWithoutCycles.length > 3 && ` and ${probationersWithoutCycles.length - 3} more`}
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      className="border-amber-600 text-amber-700 hover:bg-amber-100"
                      onClick={() => bulkGenerateProbation.mutate()}
                      disabled={bulkGenerateProbation.isPending}
                    >
                      <Wand2 className="h-4 w-4 mr-2" />
                      {bulkGenerateProbation.isPending ? 'Generating...' : 'Generate All'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Label className="text-sm text-muted-foreground">Filter:</Label>
                <Select value={cycleTypeFilter} onValueChange={setCycleTypeFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="probation">Probation</SelectItem>
                    <SelectItem value="transition">Transition</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Dialog open={isIndividualDialogOpen} onOpenChange={setIsIndividualDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={resetIndividualForm}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Individual Cycle
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <form onSubmit={handleSubmitIndividual}>
                    <DialogHeader>
                      <DialogTitle>Create Individual Cycle</DialogTitle>
                      <DialogDescription>
                        Create a probation or transition cycle for a specific staff member
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="grid gap-4 py-4">
                      {/* Staff Selector */}
                      <div className="space-y-2">
                        <Label>Staff Member</Label>
                        <Popover open={staffSearchOpen} onOpenChange={setStaffSearchOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={staffSearchOpen}
                              className="w-full justify-between"
                            >
                              {selectedStaff ? selectedStaff.name : "Select staff member..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0">
                            <Command>
                              <CommandInput placeholder="Search staff..." />
                              <CommandList>
                                <CommandEmpty>No staff found.</CommandEmpty>
                                <CommandGroup>
                                  {allStaff?.map((staff) => (
                                    <CommandItem
                                      key={staff.id}
                                      value={staff.name}
                                      onSelect={() => handleStaffSelect(staff)}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          selectedStaff?.id === staff.id ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      <div>
                                        <p>{staff.name}</p>
                                        <p className="text-xs text-muted-foreground">{staff.email}</p>
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>

                      {/* Cycle Type */}
                      <div className="space-y-2">
                        <Label>Cycle Type</Label>
                        <Select
                          value={individualFormData.cycle_type}
                          onValueChange={handleCycleTypeChange}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="probation">Probation (12 months from EOD)</SelectItem>
                            <SelectItem value="transition">Transition (until Dec 31 of EOD+2 years)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Entry on Duty Info */}
                      {selectedStaff?.entry_on_duty_date && (
                        <div className="text-sm text-muted-foreground bg-muted p-3 rounded">
                          Entry on Duty: {format(new Date(selectedStaff.entry_on_duty_date), 'MMM d, yyyy')}
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="ind_start_date">Start Date</Label>
                          <Input
                            id="ind_start_date"
                            type="date"
                            value={individualFormData.start_date}
                            onChange={(e) => setIndividualFormData({ ...individualFormData, start_date: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="ind_end_date">End Date</Label>
                          <Input
                            id="ind_end_date"
                            type="date"
                            value={individualFormData.end_date}
                            onChange={(e) => setIndividualFormData({ ...individualFormData, end_date: e.target.value })}
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="ind_status">Status</Label>
                        <Select
                          value={individualFormData.status}
                          onValueChange={(value) => setIndividualFormData({ ...individualFormData, status: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={resetIndividualForm}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={saveIndividualCycle.isPending || !selectedStaff}>
                        {saveIndividualCycle.isPending ? 'Creating...' : 'Create Cycle'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Individual Cycles</CardTitle>
                <CardDescription>
                  Probation and transition cycles for new joiners
                </CardDescription>
              </CardHeader>
              <CardContent>
                {individualLoading ? (
                  <div className="animate-pulse space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-16 bg-muted rounded" />
                    ))}
                  </div>
                ) : filteredIndividualCycles && filteredIndividualCycles.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Staff Member</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredIndividualCycles.map((cycle) => (
                        <TableRow key={cycle.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{cycle.staff?.name || 'Unknown'}</p>
                              <p className="text-xs text-muted-foreground">{cycle.staff?.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>{getCycleTypeBadge(cycle.cycle_type)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              {format(new Date(cycle.start_date), 'MMM d, yyyy')} - {format(new Date(cycle.end_date), 'MMM d, yyyy')}
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(cycle.status)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {cycle.status === 'draft' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => updateStatus.mutate({ id: cycle.id, status: 'active', isIndividual: true })}
                                >
                                  <Play className="h-4 w-4" />
                                </Button>
                              )}
                              {cycle.status === 'active' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => updateStatus.mutate({ id: cycle.id, status: 'completed', isIndividual: true })}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                              )}
                              {(cycle.status === 'draft' || cycle.status === 'completed') && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive"
                                  onClick={() => deleteCycle.mutate(cycle.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No individual cycles created yet
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default AdminPerformanceCycles;