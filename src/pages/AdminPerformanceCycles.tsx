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
import { Plus, Calendar, Edit, Trash2, Play, Pause, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const AdminPerformanceCycles = () => {
  const { user, userRoles } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCycle, setEditingCycle] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    start_date: '',
    end_date: '',
    begin_year_deadline: '',
    mid_year_deadline: '',
    end_year_deadline: '',
    status: 'draft'
  });

  const isAdmin = userRoles.includes('Admin') || userRoles.includes('HR Assistant') || userRoles.includes('Chief of HR');

  // Fetch all cycles
  const { data: cycles, isLoading } = useQuery({
    queryKey: ['performance-cycles-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('performance_cycles')
        .select('*')
        .order('start_date', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: isAdmin
  });

  // Create/Update mutation
  const saveCycle = useMutation({
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
          .insert({ ...data, created_by: user?.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance-cycles-admin'] });
      toast.success(editingCycle ? 'Cycle updated' : 'Cycle created');
      resetForm();
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
      queryClient.invalidateQueries({ queryKey: ['performance-cycles-admin'] });
      toast.success('Cycle deleted');
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });

  // Update status mutation
  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      // If setting to active, deactivate all other cycles first
      if (status === 'active') {
        await supabase
          .from('performance_cycles')
          .update({ status: 'completed' })
          .eq('status', 'active');
      }
      
      const { error } = await supabase
        .from('performance_cycles')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance-cycles-admin'] });
      toast.success('Status updated');
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });

  const resetForm = () => {
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

  const handleEdit = (cycle: any) => {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveCycle.mutate(formData);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="outline">Draft</Badge>;
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'completed':
        return <Badge className="bg-blue-100 text-blue-800">Completed</Badge>;
      case 'archived':
        return <Badge variant="secondary">Archived</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Performance Cycles</h1>
            <p className="text-muted-foreground">Manage annual ePMDS performance cycles</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
                <Plus className="h-4 w-4 mr-2" />
                New Cycle
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>{editingCycle ? 'Edit Cycle' : 'Create Performance Cycle'}</DialogTitle>
                  <DialogDescription>
                    Set up a new annual performance cycle with deadlines
                  </DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Cycle Name</Label>
                    <Input
                      id="name"
                      placeholder="e.g., 2024-2025 Performance Cycle"
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
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saveCycle.isPending}>
                    {saveCycle.isPending ? 'Saving...' : editingCycle ? 'Update' : 'Create'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Cycles</CardTitle>
            <CardDescription>
              Manage performance cycles and their deadlines
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="animate-pulse space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-muted rounded" />
                ))}
              </div>
            ) : cycles && cycles.length > 0 ? (
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
                  {cycles.map((cycle) => (
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
                            onClick={() => handleEdit(cycle)}
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
                No performance cycles created yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default AdminPerformanceCycles;
