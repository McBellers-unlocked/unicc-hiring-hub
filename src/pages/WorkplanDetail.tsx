import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  ArrowLeft,
  Target, 
  Award, 
  BookOpen, 
  Users,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Save,
  Send,
  Calendar,
  User,
  MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';
import { WorkplanPhaseIndicator } from '@/components/performance/WorkplanPhaseIndicator';

const WorkplanDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, userName } = useAuth();
  const queryClient = useQueryClient();
  
  const initialTab = searchParams.get('tab') || 'objectives';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [editingObjective, setEditingObjective] = useState<string | null>(null);
  const [newObjective, setNewObjective] = useState({ title: '', description: '', planned_time_percent: 20 });
  const [showNewObjectiveForm, setShowNewObjectiveForm] = useState(false);

  // Sync tab with URL
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['objectives', 'competencies', 'learning', 'team-objectives', 'comments'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Fetch workplan data
  const { data: workplan, isLoading: workplanLoading } = useQuery({
    queryKey: ['workplan-detail', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workplans')
        .select(`
          *,
          staff:users!workplans_staff_id_fkey(id, name, email, job_title),
          supervisor1:users!workplans_supervisor1_id_fkey(id, name, email),
          supervisor2:users!workplans_supervisor2_id_fkey(id, name, email),
          cycle:performance_cycles(id, name, start_date, end_date, status)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id
  });

  // Fetch objectives
  const { data: objectives, isLoading: objectivesLoading } = useQuery({
    queryKey: ['workplan-objectives', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workplan_objectives')
        .select('*, output:budget_outputs(code, description)')
        .eq('workplan_id', id)
        .order('order_index', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!id
  });

  // Fetch competencies
  const { data: competencies } = useQuery({
    queryKey: ['workplan-competencies', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workplan_competencies')
        .select('*')
        .eq('workplan_id', id)
        .order('order_index', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!id
  });

  // Fetch learning plans
  const { data: learningPlans } = useQuery({
    queryKey: ['workplan-learning-plans', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workplan_learning_plans')
        .select('*')
        .eq('workplan_id', id)
        .order('order_index', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!id
  });

  // Fetch team objectives
  const { data: teamObjectives } = useQuery({
    queryKey: ['workplan-team-objectives', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workplan_team_objectives')
        .select('*')
        .eq('workplan_id', id)
        .order('order_index', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!id
  });

  // Add objective mutation
  const addObjective = useMutation({
    mutationFn: async (objective: { title: string; description: string; planned_time_percent: number }) => {
      const { data, error } = await supabase
        .from('workplan_objectives')
        .insert({
          workplan_id: id,
          title: objective.title,
          description: objective.description,
          planned_time_percent: objective.planned_time_percent,
          order_index: (objectives?.length || 0) + 1,
          status: 'not_started'
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workplan-objectives', id] });
      setNewObjective({ title: '', description: '', planned_time_percent: 20 });
      setShowNewObjectiveForm(false);
      toast.success('Objective added');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add objective');
    }
  });

  // Delete objective mutation
  const deleteObjective = useMutation({
    mutationFn: async (objectiveId: string) => {
      const { error } = await supabase
        .from('workplan_objectives')
        .delete()
        .eq('id', objectiveId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workplan-objectives', id] });
      toast.success('Objective deleted');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete objective');
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="outline">Draft</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">In Progress</Badge>;
      case 'pending_supervisor':
        return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">Pending Review</Badge>;
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Approved</Badge>;
      case 'completed':
        return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">Completed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getObjectiveStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'at_risk':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const isOwner = workplan?.staff_id === user?.id;
  const isSupervisor = workplan?.supervisor1_id === user?.id || workplan?.supervisor2_id === user?.id;
  const canEdit = isOwner && workplan?.status === 'draft';

  if (workplanLoading) {
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

  if (!workplan) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <Card className="text-center py-12">
            <CardContent>
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Workplan Not Found</h3>
              <p className="text-muted-foreground mb-4">The requested workplan could not be found.</p>
              <Button onClick={() => navigate('/performance')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Performance
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  const totalPlannedTime = objectives?.reduce((sum, obj) => sum + (obj.planned_time_percent || 0), 0) || 0;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/performance')} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Performance
          </Button>
          
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-foreground">
                  Performance Workplan
                </h1>
                {getStatusBadge(workplan.status)}
              </div>
              <p className="text-muted-foreground">
                {workplan.staff?.name || 'Staff Member'} • {workplan.cycle?.name}
              </p>
            </div>
            
            {canEdit && (
              <Button>
                <Send className="h-4 w-4 mr-2" />
                Submit for Review
              </Button>
            )}
          </div>
        </div>

        {/* Phase Indicator */}
        <WorkplanPhaseIndicator currentPhase={workplan.current_phase} workplan={workplan} />

        {/* Info Cards */}
        <div className="grid gap-4 md:grid-cols-3 mb-6 mt-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Staff Member</p>
                  <p className="font-medium">{workplan.staff?.name}</p>
                  <p className="text-xs text-muted-foreground">{workplan.staff?.job_title}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                  <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">1st Supervisor</p>
                  <p className="font-medium">{workplan.supervisor1?.name || 'Not assigned'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900">
                  <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">2nd Supervisor</p>
                  <p className="font-medium">{workplan.supervisor2?.name || 'Not assigned'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 w-full justify-start">
            <TabsTrigger value="objectives" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Objectives
            </TabsTrigger>
            <TabsTrigger value="competencies" className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              Competencies
            </TabsTrigger>
            <TabsTrigger value="learning" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              L&D Plan
            </TabsTrigger>
            <TabsTrigger value="team-objectives" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Team Objectives
            </TabsTrigger>
            <TabsTrigger value="comments" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Comments
            </TabsTrigger>
          </TabsList>

          {/* Objectives Tab */}
          <TabsContent value="objectives">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Individual Objectives</CardTitle>
                    <CardDescription>
                      Define your key objectives for this performance cycle
                    </CardDescription>
                  </div>
                  {canEdit && (
                    <Button onClick={() => setShowNewObjectiveForm(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Objective
                    </Button>
                  )}
                </div>
                
                {/* Time allocation summary */}
                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Time Allocation</span>
                    <span className={`text-sm font-medium ${totalPlannedTime > 100 ? 'text-red-600' : totalPlannedTime === 100 ? 'text-green-600' : ''}`}>
                      {totalPlannedTime}% allocated
                    </span>
                  </div>
                  <Progress value={Math.min(totalPlannedTime, 100)} className="h-2" />
                  {totalPlannedTime !== 100 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {totalPlannedTime < 100 
                        ? `${100 - totalPlannedTime}% remaining to allocate` 
                        : `${totalPlannedTime - 100}% over-allocated`}
                    </p>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {showNewObjectiveForm && (
                  <Card className="mb-4 border-primary/50">
                    <CardContent className="p-4">
                      <h4 className="font-medium mb-3">New Objective</h4>
                      <div className="space-y-3">
                        <Input
                          placeholder="Objective title"
                          value={newObjective.title}
                          onChange={(e) => setNewObjective(prev => ({ ...prev, title: e.target.value }))}
                        />
                        <Textarea
                          placeholder="Description and expected outcomes"
                          value={newObjective.description}
                          onChange={(e) => setNewObjective(prev => ({ ...prev, description: e.target.value }))}
                        />
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="5"
                            max="100"
                            value={newObjective.planned_time_percent}
                            onChange={(e) => setNewObjective(prev => ({ ...prev, planned_time_percent: parseInt(e.target.value) || 0 }))}
                            className="w-24"
                          />
                          <span className="text-sm text-muted-foreground">% of time</span>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            onClick={() => addObjective.mutate(newObjective)}
                            disabled={!newObjective.title || addObjective.isPending}
                          >
                            <Save className="h-4 w-4 mr-2" />
                            Save
                          </Button>
                          <Button variant="outline" onClick={() => setShowNewObjectiveForm(false)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {objectivesLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-24 bg-muted rounded animate-pulse"></div>
                    ))}
                  </div>
                ) : objectives && objectives.length > 0 ? (
                  <div className="space-y-3">
                    {objectives.map((objective: any, index: number) => (
                      <Card key={objective.id} className="border">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3 flex-1">
                              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                                {index + 1}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-medium">{objective.title}</h4>
                                  {getObjectiveStatusIcon(objective.status)}
                                </div>
                                {objective.description && (
                                  <p className="text-sm text-muted-foreground mb-2">{objective.description}</p>
                                )}
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  <span className="bg-muted px-2 py-1 rounded">
                                    {objective.planned_time_percent}% planned
                                  </span>
                                  {objective.actual_time_percent && (
                                    <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                                      {objective.actual_time_percent}% actual
                                    </span>
                                  )}
                                  {objective.output?.code && (
                                    <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded">
                                      {objective.output.code}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            {canEdit && (
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => deleteObjective.mutate(objective.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Target className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No objectives defined yet</p>
                    {canEdit && (
                      <Button className="mt-4" onClick={() => setShowNewObjectiveForm(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Your First Objective
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Competencies Tab */}
          <TabsContent value="competencies">
            <Card>
              <CardHeader>
                <CardTitle>Core Competencies</CardTitle>
                <CardDescription>
                  Rate yourself on key competencies required for your role
                </CardDescription>
              </CardHeader>
              <CardContent>
                {competencies && competencies.length > 0 ? (
                  <div className="space-y-4">
                    {competencies.map((comp: any) => (
                      <Card key={comp.id} className="border">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">{comp.competency_name}</h4>
                              {comp.description && (
                                <p className="text-sm text-muted-foreground">{comp.description}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-4">
                              {comp.staff_rating && (
                                <div className="text-center">
                                  <p className="text-xs text-muted-foreground">Self</p>
                                  <Badge variant="outline">{comp.staff_rating}/5</Badge>
                                </div>
                              )}
                              {comp.supervisor_rating && (
                                <div className="text-center">
                                  <p className="text-xs text-muted-foreground">Supervisor</p>
                                  <Badge className="bg-blue-100 text-blue-800">{comp.supervisor_rating}/5</Badge>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Award className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No competencies configured yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Learning & Development Tab */}
          <TabsContent value="learning">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Learning & Development Plan</CardTitle>
                    <CardDescription>
                      Track your professional development goals and activities
                    </CardDescription>
                  </div>
                  {canEdit && (
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Learning Goal
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {learningPlans && learningPlans.length > 0 ? (
                  <div className="space-y-4">
                    {learningPlans.map((plan: any) => (
                      <Card key={plan.id} className="border">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-medium">{plan.title}</h4>
                              {plan.description && (
                                <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                              )}
                              <div className="flex items-center gap-2 mt-2">
                                {plan.target_date && (
                                  <Badge variant="outline" className="text-xs">
                                    <Calendar className="h-3 w-3 mr-1" />
                                    {new Date(plan.target_date).toLocaleDateString()}
                                  </Badge>
                                )}
                                <Badge variant={plan.status === 'completed' ? 'default' : 'secondary'}>
                                  {plan.status}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No learning goals defined yet</p>
                    {canEdit && (
                      <Button className="mt-4">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Your First Learning Goal
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Team Objectives Tab */}
          <TabsContent value="team-objectives">
            <Card>
              <CardHeader>
                <CardTitle>Team Objectives</CardTitle>
                <CardDescription>
                  Shared objectives for your team or unit
                </CardDescription>
              </CardHeader>
              <CardContent>
                {teamObjectives && teamObjectives.length > 0 ? (
                  <div className="space-y-4">
                    {teamObjectives.map((obj: any) => (
                      <Card key={obj.id} className="border">
                        <CardContent className="p-4">
                          <h4 className="font-medium">{obj.title}</h4>
                          {obj.description && (
                            <p className="text-sm text-muted-foreground mt-1">{obj.description}</p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No team objectives defined yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Comments Tab */}
          <TabsContent value="comments">
            <Card>
              <CardHeader>
                <CardTitle>Discussion & Feedback</CardTitle>
                <CardDescription>
                  Comments and feedback from staff and supervisors
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Staff Comments Section */}
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Staff Comments
                    </h4>
                    <div className="space-y-3 pl-6">
                      {workplan.staff_achievements_comment && (
                        <div className="bg-muted/50 p-3 rounded-lg">
                          <p className="text-xs text-muted-foreground mb-1">Achievements</p>
                          <p className="text-sm">{workplan.staff_achievements_comment}</p>
                        </div>
                      )}
                      {workplan.staff_challenges_comment && (
                        <div className="bg-muted/50 p-3 rounded-lg">
                          <p className="text-xs text-muted-foreground mb-1">Challenges</p>
                          <p className="text-sm">{workplan.staff_challenges_comment}</p>
                        </div>
                      )}
                      {workplan.staff_support_comment && (
                        <div className="bg-muted/50 p-3 rounded-lg">
                          <p className="text-xs text-muted-foreground mb-1">Support Needed</p>
                          <p className="text-sm">{workplan.staff_support_comment}</p>
                        </div>
                      )}
                      {!workplan.staff_achievements_comment && !workplan.staff_challenges_comment && !workplan.staff_support_comment && (
                        <p className="text-sm text-muted-foreground">No staff comments yet</p>
                      )}
                    </div>
                  </div>

                  {/* Supervisor Comments Section */}
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Supervisor Comments
                    </h4>
                    <div className="space-y-3 pl-6">
                      {workplan.supervisor_achievements_comment && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                          <p className="text-xs text-muted-foreground mb-1">Achievements</p>
                          <p className="text-sm">{workplan.supervisor_achievements_comment}</p>
                        </div>
                      )}
                      {workplan.supervisor_challenges_comment && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                          <p className="text-xs text-muted-foreground mb-1">Challenges</p>
                          <p className="text-sm">{workplan.supervisor_challenges_comment}</p>
                        </div>
                      )}
                      {workplan.supervisor_support_comment && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                          <p className="text-xs text-muted-foreground mb-1">Support</p>
                          <p className="text-sm">{workplan.supervisor_support_comment}</p>
                        </div>
                      )}
                      {!workplan.supervisor_achievements_comment && !workplan.supervisor_challenges_comment && !workplan.supervisor_support_comment && (
                        <p className="text-sm text-muted-foreground">No supervisor comments yet</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default WorkplanDetail;
