import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Target, 
  Users, 
  BookOpen, 
  Award, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  ChevronRight,
  Calendar,
  FileText,
  Plus,
  ClipboardCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { WorkplanPhaseIndicator } from '@/components/performance/WorkplanPhaseIndicator';
import { WorkplanStatusCard } from '@/components/performance/WorkplanStatusCard';
import { EPMDSWorkflowTimeline } from '@/components/performance/EPMDSWorkflowTimeline';

const Performance = () => {
  const { user, userName } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('my-workplan');

  // Fetch active performance cycle - prioritize individual cycles
  const { data: activeCycle, isLoading: cycleLoading } = useQuery({
    queryKey: ['active-performance-cycle', user?.id],
    queryFn: async () => {
      // First, check for active individual cycle for this user
      const { data: individualCycle, error: indError } = await supabase
        .from('performance_cycles')
        .select('*')
        .eq('staff_id', user?.id)
        .eq('status', 'active')
        .maybeSingle();
      
      if (indError) throw indError;
      if (individualCycle) return { ...individualCycle, isIndividual: true };
      
      // Fall back to organization-wide active cycle
      const { data: orgCycle, error: orgError } = await supabase
        .from('performance_cycles')
        .select('*')
        .is('staff_id', null)
        .eq('status', 'active')
        .maybeSingle();
      
      if (orgError) throw orgError;
      return orgCycle ? { ...orgCycle, isIndividual: false } : null;
    },
    enabled: !!user
  });

  // Fetch current user's workplan
  const { data: myWorkplan, isLoading: workplanLoading } = useQuery({
    queryKey: ['my-workplan', activeCycle?.id],
    queryFn: async () => {
      if (!activeCycle?.id) return null;
      
      const { data, error } = await supabase
        .from('workplans')
        .select(`
          *,
          supervisor1:users!workplans_supervisor1_id_fkey(id, name, email),
          supervisor2:users!workplans_supervisor2_id_fkey(id, name, email)
        `)
        .eq('cycle_id', activeCycle.id)
        .eq('staff_id', user?.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!activeCycle?.id && !!user
  });

  // Fetch workplan objectives count
  const { data: objectivesCount } = useQuery({
    queryKey: ['workplan-objectives-count', myWorkplan?.id],
    queryFn: async () => {
      if (!myWorkplan?.id) return { total: 0, completed: 0 };
      
      const { data, error } = await supabase
        .from('workplan_objectives')
        .select('status')
        .eq('workplan_id', myWorkplan.id);
      
      if (error) throw error;
      
      return {
        total: data?.length || 0,
        completed: data?.filter(o => o.status === 'completed').length || 0
      };
    },
    enabled: !!myWorkplan?.id
  });

  // Fetch team workplans (for supervisors)
  const { data: teamWorkplans } = useQuery({
    queryKey: ['team-workplans', activeCycle?.id],
    queryFn: async () => {
      if (!activeCycle?.id) return [];
      
      const { data, error } = await supabase
        .from('workplans')
        .select(`
          *,
          staff:users!workplans_staff_id_fkey(id, name, email, position)
        `)
        .eq('cycle_id', activeCycle.id)
        .or(`supervisor1_id.eq.${user?.id},supervisor2_id.eq.${user?.id}`);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeCycle?.id && !!user
  });

  // Create workplan mutation
  const createWorkplan = useMutation({
    mutationFn: async () => {
      if (!activeCycle?.id || !user?.id) throw new Error('Missing cycle or user');
      
      // Get user's line manager name
      const { data: userData } = await supabase
        .from('users')
        .select('line_manager')
        .eq('id', user.id)
        .single();
      
      // Look up supervisor1 UUID AND their line_manager (for supervisor2)
      let supervisor1Id = null;
      let supervisor2Id = null;
      
      if (userData?.line_manager) {
        const { data: sup1Data } = await supabase
          .from('users')
          .select('id, line_manager')
          .eq('name', userData.line_manager)
          .maybeSingle();
        
        supervisor1Id = sup1Data?.id || null;
        
        // Traverse hierarchy: supervisor2 = supervisor1's line_manager
        if (sup1Data?.line_manager) {
          const { data: sup2Data } = await supabase
            .from('users')
            .select('id')
            .eq('name', sup1Data.line_manager)
            .maybeSingle();
          
          supervisor2Id = sup2Data?.id || null;
        }
      }
      
      const { data, error } = await supabase
        .from('workplans')
        .insert({
          cycle_id: activeCycle.id,
          staff_id: user.id,
          supervisor1_id: supervisor1Id,
          supervisor2_id: supervisor2Id,
          status: 'draft',
          current_phase: 'begin_year'
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['my-workplan'] });
      toast.success('Workplan created successfully');
      navigate(`/performance/workplan/${data.id}`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create workplan');
    }
  });

  const getPhaseStatus = (phase: string) => {
    if (!myWorkplan) return 'pending';
    
    const currentPhase = myWorkplan.current_phase;
    const phases = ['begin_year', 'mid_year', 'end_year', 'completed'];
    const currentIndex = phases.indexOf(currentPhase);
    const phaseIndex = phases.indexOf(phase);
    
    if (phaseIndex < currentIndex) return 'completed';
    if (phaseIndex === currentIndex) return 'current';
    return 'pending';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="outline">Draft</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-100 text-blue-800">In Progress</Badge>;
      case 'pending_supervisor':
        return <Badge className="bg-amber-100 text-amber-800">Pending Review</Badge>;
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case 'completed':
        return <Badge className="bg-emerald-100 text-emerald-800">Completed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (cycleLoading || workplanLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Performance Management (ePMDS)
          </h1>
          <p className="text-muted-foreground">
            Manage your objectives, competencies, and development plans
          </p>
        </div>

        {/* Active Cycle Info */}
        {activeCycle ? (
          <Card className="mb-6 border-primary/20 bg-primary/5">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">{activeCycle.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(activeCycle.start_date).toLocaleDateString()} - {new Date(activeCycle.end_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {activeCycle.isIndividual && (
                    <Badge className={activeCycle.cycle_type === 'probation' 
                      ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" 
                      : "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                    }>
                      {activeCycle.cycle_type === 'probation' ? 'Probation' : 'Transition'}
                    </Badge>
                  )}
                  <Badge className="bg-primary text-primary-foreground">Active Cycle</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-6 border-amber-200 bg-amber-50">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <p className="text-amber-800">No active performance cycle. Contact HR to set up a new cycle.</p>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="my-workplan" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              My Workplan
            </TabsTrigger>
            {teamWorkplans && teamWorkplans.length > 0 && (
              <TabsTrigger value="team" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Team Workplans ({teamWorkplans.length})
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="my-workplan">
            {myWorkplan ? (
              <div className="space-y-6">
                {/* ePMDS+ Workflow Timeline */}
                <EPMDSWorkflowTimeline 
                  workplan={myWorkplan}
                  staffName={userName || user?.email || 'Staff Member'}
                  supervisor1Name={myWorkplan?.supervisor1?.name || '1st Level Supervisor'}
                  supervisor2Name={myWorkplan?.supervisor2?.name || '2nd Level Supervisor'}
                />

                {/* Workplan Status Card */}
                <WorkplanStatusCard 
                  workplan={myWorkplan}
                  objectivesCount={objectivesCount}
                />

                {/* Quick Actions */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => navigate(`/performance/workplan/${myWorkplan.id}?tab=objectives`)}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-100">
                          <Target className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">Objectives</p>
                          <p className="text-sm text-muted-foreground">
                            {objectivesCount?.total || 0} objectives
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => navigate(`/performance/workplan/${myWorkplan.id}?tab=competencies`)}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-purple-100">
                          <Award className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-medium">Competencies</p>
                          <p className="text-sm text-muted-foreground">View & rate</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => navigate(`/performance/workplan/${myWorkplan.id}?tab=learning`)}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-green-100">
                          <BookOpen className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium">L&D Plan</p>
                          <p className="text-sm text-muted-foreground">Learning goals</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => navigate(`/performance/workplan/${myWorkplan.id}?tab=team-objectives`)}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-amber-100">
                          <Users className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                          <p className="font-medium">Team Objectives</p>
                          <p className="text-sm text-muted-foreground">Shared goals</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* View Full Workplan Button */}
                <div className="flex justify-center">
                  <Button size="lg" onClick={() => navigate(`/performance/workplan/${myWorkplan.id}`)}>
                    <FileText className="h-4 w-4 mr-2" />
                    Open Full Workplan
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            ) : activeCycle ? (
              <Card className="text-center py-12">
                <CardContent>
                  <div className="flex flex-col items-center gap-4">
                    <div className="p-4 rounded-full bg-primary/10">
                      <ClipboardCheck className="h-12 w-12 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-2">No Workplan Yet</h3>
                      <p className="text-muted-foreground mb-4">
                        Start your performance workplan for {activeCycle.name}
                      </p>
                    </div>
                    <Button 
                      size="lg" 
                      onClick={() => createWorkplan.mutate()}
                      disabled={createWorkplan.isPending}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {createWorkplan.isPending ? 'Creating...' : 'Create My Workplan'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </TabsContent>

          <TabsContent value="team">
            <Card>
              <CardHeader>
                <CardTitle>Team Workplans</CardTitle>
                <CardDescription>
                  Review and sign off on workplans from your team members
                </CardDescription>
              </CardHeader>
              <CardContent>
                {teamWorkplans && teamWorkplans.length > 0 ? (
                  <div className="space-y-4">
                    {teamWorkplans.map((workplan: any) => (
                      <div 
                        key={workplan.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-primary font-semibold">
                              {workplan.staff?.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">{workplan.staff?.name}</p>
                            <p className="text-sm text-muted-foreground">{workplan.staff?.position || 'Staff Member'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {getStatusBadge(workplan.status)}
                          <Badge variant="outline" className="capitalize">
                            {workplan.current_phase.replace('_', ' ')}
                          </Badge>
                          <Button variant="outline" size="sm" asChild>
                            <Link to={`/performance/workplan/${workplan.id}`}>
                              Review
                              <ChevronRight className="h-4 w-4 ml-1" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No team workplans to review
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Performance;
