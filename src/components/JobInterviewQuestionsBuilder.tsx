import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Save, Wand2, Users, CheckCircle2, AlertCircle, GripVertical } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PanelInterviewSlotManager } from '@/components/PanelInterviewSlotManager';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface InterviewQuestion {
  id?: string;
  question_text: string;
  order_index: number;
  assigned_to?: string | null;
  requirement_ids: string[];
  competency_ids: string[];
}

interface PanelMember {
  panel_member_id: string;
  user_id: string;
  name: string;
  panel_role: string;
  gender?: string;
  duty_station?: string;
  nationality?: string;
  division?: string;
}

interface PanelValidation {
  valid: boolean;
  issues: Array<{ type: string; message: string }>;
  warnings: Array<{ type: string; message: string }>;
  summary: {
    total_members: number;
    gender_diversity: number;
    duty_stations: string[];
    nationalities: string[];
    divisions: string[];
  };
}

interface AvailableUser {
  id: string;
  name: string;
  email: string;
  gender?: string;
  duty_station?: string;
  nationality?: string;
  division?: string;
}

interface Requirement {
  id: string;
  title: string;
  category: string;
  description?: string;
}

interface Competency {
  id: string;
  competency_name: string;
  competency_type: string;
  description?: string;
}

interface JobInterviewQuestionsBuilderProps {
  jobId: string;
  jobTitle: string;
}

export function JobInterviewQuestionsBuilder({ jobId, jobTitle }: JobInterviewQuestionsBuilderProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [panelMembers, setPanelMembers] = useState<PanelMember[]>([]);
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [panelValidation, setPanelValidation] = useState<PanelValidation | null>(null);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [userComboboxOpen, setUserComboboxOpen] = useState(false);
  const [addingMember, setAddingMember] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (jobId) {
      loadData();
    }
  }, [jobId]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchQuestions(),
        fetchRequirements(),
        fetchCompetencies(),
        fetchPanelMembers(),
        fetchAvailableUsers()
      ]);
      await validatePanel();
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load interview management data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchQuestions = async () => {
    const { data: questionsData, error: questionsError } = await supabase
      .from('job_interview_questions' as any)
      .select('*')
      .eq('job_id', jobId)
      .order('order_index');

    if (questionsError) throw questionsError;

    // Fetch associated requirements and competencies for each question
    const questionsWithAssociations = await Promise.all(
      (questionsData || []).map(async (q: any) => {
        const [reqData, compData] = await Promise.all([
          supabase
            .from('job_interview_question_requirements' as any)
            .select('requirement_id')
            .eq('question_id', q.id),
          supabase
            .from('job_interview_question_competencies' as any)
            .select('competency_id')
            .eq('question_id', q.id)
        ]);

        return {
          id: q.id,
          question_text: q.question_text,
          order_index: q.order_index,
          assigned_to: q.assigned_to,
          requirement_ids: reqData.data?.map((r: any) => r.requirement_id) || [],
          competency_ids: compData.data?.map((c: any) => c.competency_id) || []
        };
      })
    );

    setQuestions(questionsWithAssociations);
  };

  const fetchRequirements = async () => {
    const { data, error } = await supabase
      .from('job_requirements')
      .select('*')
      .eq('job_id', jobId)
      .order('category, order_index');

    if (error) throw error;
    setRequirements(data || []);
  };

  const fetchCompetencies = async () => {
    const { data, error } = await supabase
      .from('job_competencies')
      .select('*')
      .eq('job_id', jobId)
      .order('competency_type, order_index');

    if (error) throw error;
    setCompetencies(data || []);
  };

  const fetchPanelMembers = async () => {
    const { data, error } = await supabase
      .from('job_interview_panel_members' as any)
      .select(`
        id,
        job_id,
        user_id,
        panel_role,
        users!inner (
          id,
          name,
          gender,
          duty_station,
          nationality,
          division
        )
      `)
      .eq('job_id', jobId);

    if (error) throw error;

    const formattedMembers = (data || []).map((member: any) => ({
      panel_member_id: member.id,
      user_id: member.user_id,
      name: member.users?.name || '',
      panel_role: member.panel_role,
      gender: member.users?.gender,
      duty_station: member.users?.duty_station,
      nationality: member.users?.nationality,
      division: member.users?.division,
    }));

    setPanelMembers(formattedMembers);
  };

  const fetchAvailableUsers = async () => {
    const { data, error } = await supabase
      .from('users' as any)
      .select('id, name, email, gender, duty_station, nationality, division')
      .in('role', ['Panel Member', 'Hiring Manager', 'HR Assistant', 'Chief of HR', 'Admin'])
      .order('name');

    if (error) throw error;
    setAvailableUsers((data as any) || []);
  };

  const validatePanel = async () => {
    try {
      const { data, error } = await (supabase.rpc as any)('validate_panel_composition', {
        p_job_id: jobId
      });

      if (error) throw error;
      if (data) {
        setPanelValidation(data as unknown as PanelValidation);
      }
    } catch (error) {
      console.error('Panel validation error:', error);
    }
  };

  const addPanelMember = async () => {
    if (!selectedUser || !selectedRole) {
      toast({
        title: "Error",
        description: "Please select both a user and a role",
        variant: "destructive",
      });
      return;
    }

    setAddingMember(true);
    try {
      const { error } = await supabase
        .from('job_interview_panel_members' as any)
        .insert([{
          job_id: jobId,
          user_id: selectedUser,
          panel_role: selectedRole
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Panel member added successfully",
      });

      setSelectedUser('');
      setSelectedRole('');
      await loadData();
    } catch (error) {
      console.error('Error adding panel member:', error);
      toast({
        title: "Error",
        description: "Failed to add panel member",
        variant: "destructive",
      });
    } finally {
      setAddingMember(false);
    }
  };

  const removePanelMember = async (panelMemberId: string) => {
    try {
      const { error } = await supabase
        .from('job_interview_panel_members' as any)
        .delete()
        .eq('id', panelMemberId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Panel member removed",
      });

      await loadData();
    } catch (error) {
      console.error('Error removing panel member:', error);
      toast({
        title: "Error",
        description: "Failed to remove panel member",
        variant: "destructive",
      });
    }
  };

  const addQuestion = () => {
    const newQuestion: InterviewQuestion = {
      question_text: '',
      order_index: questions.length,
      assigned_to: null,
      requirement_ids: [],
      competency_ids: []
    };
    setQuestions([...questions, newQuestion]);
  };

  const updateQuestion = (index: number, field: keyof InterviewQuestion, value: any) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const removeQuestion = (index: number) => {
    const updated = questions.filter((_, i) => i !== index);
    // Reindex
    updated.forEach((q, i) => q.order_index = i);
    setQuestions(updated);
  };

  const saveQuestions = async () => {
    setSaving(true);
    try {
      // Delete existing questions for this job
      const { error: deleteError } = await supabase
        .from('job_interview_questions')
        .delete()
        .eq('job_id', jobId);

      if (deleteError) throw deleteError;

      // Insert new questions
      const questionsToInsert = questions.map(q => ({
        job_id: jobId,
        question_text: q.question_text,
        order_index: q.order_index,
        assigned_to: q.assigned_to,
        created_by: user?.id
      }));

      const { data: insertedQuestions, error: insertError } = await supabase
        .from('job_interview_questions')
        .insert(questionsToInsert)
        .select();

      if (insertError) throw insertError;

      // Insert requirement associations
      const requirementAssociations = insertedQuestions.flatMap((q: any, idx) => 
        questions[idx].requirement_ids.map(reqId => ({
          question_id: q.id,
          requirement_id: reqId
        }))
      );

      if (requirementAssociations.length > 0) {
        const { error: reqError } = await supabase
          .from('job_interview_question_requirements' as any)
          .insert(requirementAssociations);

        if (reqError) throw reqError;
      }

      // Insert competency associations
      const competencyAssociations = insertedQuestions.flatMap((q: any, idx) => 
        questions[idx].competency_ids.map(compId => ({
          question_id: q.id,
          competency_id: compId
        }))
      );

      if (competencyAssociations.length > 0) {
        const { error: compError } = await supabase
          .from('job_interview_question_competencies' as any)
          .insert(competencyAssociations);

        if (compError) throw compError;
      }

      toast({
        title: "Success",
        description: "Interview questions saved successfully",
      });

      await fetchQuestions();
    } catch (error) {
      console.error('Error saving questions:', error);
      toast({
        title: "Error",
        description: "Failed to save interview questions",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const generateFeedbackTemplate = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-feedback-template', {
        body: { jobId }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Feedback template generated successfully",
      });
    } catch (error) {
      console.error('Error generating template:', error);
      toast({
        title: "Error",
        description: "Failed to generate feedback template",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const getCoverageStats = () => {
    const coveredRequirements = new Set<string>();
    const coveredCompetencies = new Set<string>();

    questions.forEach(q => {
      q.requirement_ids.forEach(id => coveredRequirements.add(id));
      q.competency_ids.forEach(id => coveredCompetencies.add(id));
    });

    const essentialRequirements = requirements.filter(r => r.category === 'Essential Criteria');
    const desirableRequirements = requirements.filter(r => r.category === 'Desirable Criteria');

    const coveredEssential = essentialRequirements.filter(r => coveredRequirements.has(r.id)).length;
    const coveredDesirable = desirableRequirements.filter(r => coveredRequirements.has(r.id)).length;

    return {
      totalQuestions: questions.length,
      essentialCovered: coveredEssential,
      essentialTotal: essentialRequirements.length,
      desirableCovered: coveredDesirable,
      desirableTotal: desirableRequirements.length,
      competenciesCovered: coveredCompetencies.size,
      competenciesTotal: competencies.length
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading interview management...</div>
      </div>
    );
  }

  const stats = getCoverageStats();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Interview Management</h1>
        <p className="text-muted-foreground">{jobTitle}</p>
      </div>

      {/* Panel Composition Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Interview Panel Composition
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {panelValidation && (
            <div className="space-y-2">
              {panelValidation.issues.map((issue, idx) => (
                <Alert key={idx} variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{issue.message}</AlertDescription>
                </Alert>
              ))}
              {panelValidation.warnings.map((warning, idx) => (
                <Alert key={idx}>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{warning.message}</AlertDescription>
                </Alert>
              ))}
              {panelValidation.valid && panelValidation.issues.length === 0 && (
                <Alert className="border-green-500 bg-green-50">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700">
                    Panel composition meets all requirements
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Current Panel Members */}
          {panelMembers.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">Current Panel Members</h4>
              <div className="grid gap-2">
                {panelMembers.map(member => (
                  <div key={member.panel_member_id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>{member.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{member.name}</div>
                        <div className="text-sm text-muted-foreground">{member.panel_role}</div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removePanelMember(member.panel_member_id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add Panel Member */}
          <div className="space-y-3">
            <h4 className="font-medium">Add Panel Member</h4>
            <div className="grid grid-cols-2 gap-3">
              <Popover open={userComboboxOpen} onOpenChange={setUserComboboxOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-between">
                    {selectedUser
                      ? availableUsers.find(u => u.id === selectedUser)?.name
                      : "Select user..."}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0">
                  <Command>
                    <CommandInput placeholder="Search users..." />
                    <CommandList>
                      <CommandEmpty>No user found.</CommandEmpty>
                      <CommandGroup>
                        {availableUsers.map(user => (
                          <CommandItem
                            key={user.id}
                            value={user.name}
                            onSelect={() => {
                              setSelectedUser(user.id);
                              setUserComboboxOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedUser === user.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {user.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Hiring Manager">Hiring Manager</SelectItem>
                  <SelectItem value="HR Rep">HR Rep</SelectItem>
                  <SelectItem value="Technical Expert">Technical Expert</SelectItem>
                  <SelectItem value="Observer">Observer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={addPanelMember} disabled={addingMember || !selectedUser || !selectedRole}>
              <Plus className="w-4 h-4 mr-2" />
              Add Member
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Interview Slot Manager */}
      {panelMembers.length > 0 && (
        <PanelInterviewSlotManager jobId={jobId} panelMembers={panelMembers} />
      )}

      {/* Coverage Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Question Coverage Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <div className="text-2xl font-bold">{stats.totalQuestions}</div>
              <div className="text-sm text-muted-foreground">Total Questions</div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="text-2xl font-bold">{stats.essentialCovered}/{stats.essentialTotal}</div>
                {stats.essentialCovered === stats.essentialTotal && stats.essentialTotal > 0 && (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                )}
              </div>
              <div className="text-sm text-muted-foreground">Essential Criteria</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold">{stats.desirableCovered}/{stats.desirableTotal}</div>
              <div className="text-sm text-muted-foreground">Desirable Criteria</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold">{stats.competenciesCovered}/{stats.competenciesTotal}</div>
              <div className="text-sm text-muted-foreground">Competencies</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interview Questions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Interview Questions</CardTitle>
          <div className="flex gap-2">
            <Button onClick={addQuestion} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Add Question
            </Button>
            <Button onClick={generateFeedbackTemplate} variant="outline" disabled={generating || questions.length === 0}>
              <Wand2 className="w-4 h-4 mr-2" />
              Generate Feedback Form
            </Button>
            <Button onClick={saveQuestions} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              Save Questions
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {questions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No questions yet. Click "Add Question" to get started.
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((question, index) => (
                <Card key={index}>
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex items-start gap-3">
                      <GripVertical className="w-5 h-5 text-muted-foreground mt-2 flex-shrink-0" />
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">Q{index + 1}</Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeQuestion(index)}
                            className="ml-auto"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        <Textarea
                          placeholder="Enter interview question..."
                          value={question.question_text}
                          onChange={(e) => updateQuestion(index, 'question_text', e.target.value)}
                          className="min-h-[80px]"
                        />

                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Assigned To</label>
                            <Select
                              value={question.assigned_to || ''}
                              onValueChange={(value) => updateQuestion(index, 'assigned_to', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select panelist..." />
                              </SelectTrigger>
                              <SelectContent>
                                {panelMembers.map(member => (
                                  <SelectItem key={member.user_id} value={member.user_id}>
                                    {member.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium">Skills Assessed</label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-between">
                                  {question.requirement_ids.length > 0
                                    ? `${question.requirement_ids.length} selected`
                                    : "Select skills..."}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[300px] p-0">
                                <Command>
                                  <CommandInput placeholder="Search skills..." />
                                  <CommandList>
                                    <CommandEmpty>No skills found.</CommandEmpty>
                                    <CommandGroup>
                                      {requirements.map(req => (
                                        <CommandItem
                                          key={req.id}
                                          onSelect={() => {
                                            const ids = question.requirement_ids.includes(req.id)
                                              ? question.requirement_ids.filter(id => id !== req.id)
                                              : [...question.requirement_ids, req.id];
                                            updateQuestion(index, 'requirement_ids', ids);
                                          }}
                                        >
                                          <Check
                                            className={cn(
                                              "mr-2 h-4 w-4",
                                              question.requirement_ids.includes(req.id) ? "opacity-100" : "opacity-0"
                                            )}
                                          />
                                          <div className="flex-1">
                                            <div className="font-medium">{req.title}</div>
                                            <div className="text-xs text-muted-foreground">{req.category}</div>
                                          </div>
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium">Competencies</label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-between">
                                  {question.competency_ids.length > 0
                                    ? `${question.competency_ids.length} selected`
                                    : "Select competencies..."}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[300px] p-0">
                                <Command>
                                  <CommandInput placeholder="Search competencies..." />
                                  <CommandList>
                                    <CommandEmpty>No competencies found.</CommandEmpty>
                                    <CommandGroup>
                                      {competencies.map(comp => (
                                        <CommandItem
                                          key={comp.id}
                                          onSelect={() => {
                                            const ids = question.competency_ids.includes(comp.id)
                                              ? question.competency_ids.filter(id => id !== comp.id)
                                              : [...question.competency_ids, comp.id];
                                            updateQuestion(index, 'competency_ids', ids);
                                          }}
                                        >
                                          <Check
                                            className={cn(
                                              "mr-2 h-4 w-4",
                                              question.competency_ids.includes(comp.id) ? "opacity-100" : "opacity-0"
                                            )}
                                          />
                                          <div className="flex-1">
                                            <div className="font-medium">{comp.competency_name}</div>
                                            <div className="text-xs text-muted-foreground">{comp.competency_type}</div>
                                          </div>
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>

                        {/* Display selected tags */}
                        <div className="flex flex-wrap gap-2">
                          {question.requirement_ids.map(reqId => {
                            const req = requirements.find(r => r.id === reqId);
                            return req ? (
                              <Badge key={reqId} variant="secondary" className="text-xs">
                                {req.title}
                              </Badge>
                            ) : null;
                          })}
                          {question.competency_ids.map(compId => {
                            const comp = competencies.find(c => c.id === compId);
                            return comp ? (
                              <Badge key={compId} variant="outline" className="text-xs">
                                {comp.competency_name}
                              </Badge>
                            ) : null;
                          })}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
