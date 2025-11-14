import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Save, Wand2, Users, ChevronDown, ChevronRight, CheckCircle2, AlertCircle, XCircle, Info, Folder, FolderOpen, Search, Check } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PanelInterviewSlotManager } from '@/components/PanelInterviewSlotManager';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface InterviewQuestion {
  id?: string;
  question_text: string;
  requirement_id?: string | null;
  competency_id?: string | null;
  language_requirement_id?: string | null;
  order_index: number;
  assigned_to?: string | null;
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

interface LanguageRequirement {
  id: string;
  language: string;
  level: string;
  is_essential: boolean;
}

interface Contributor {
  user_id: string;
  name: string;
  contribution_type: string;
  contributed_at: string;
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
  const [languages, setLanguages] = useState<LanguageRequirement[]>([]);
  const [contributors, setContributors] = useState<Contributor[]>([]);
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
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, [jobId]);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchQuestions(),
        fetchRequirements(),
        fetchCompetencies(),
        fetchLanguages(),
        fetchContributors(),
        fetchPanelMembers(),
        fetchAvailableUsers(),
        validatePanel()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load interview questions data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchQuestions = async () => {
    const { data, error } = await supabase
      .from('job_interview_questions')
      .select('*')
      .eq('job_id', jobId)
      .order('order_index');

    if (error) throw error;
    if (data) {
      setQuestions(data);
      if (data.length > 0) {
        const mostRecent = data.reduce((latest, current) => 
          new Date(current.updated_at || 0) > new Date(latest.updated_at || 0) ? current : latest
        );
        setLastUpdated(mostRecent.updated_at || null);
      }
    }
  };

  const fetchRequirements = async () => {
    const { data, error } = await supabase
      .from('job_requirements')
      .select('*')
      .eq('job_id', jobId)
      .order('category, order_index');

    if (error) throw error;
    if (data) setRequirements(data);
  };

  const fetchCompetencies = async () => {
    const { data, error } = await supabase
      .from('job_competencies')
      .select('*')
      .eq('job_id', jobId)
      .order('competency_type, order_index');

    if (error) throw error;
    if (data) setCompetencies(data);
  };

  const fetchLanguages = async () => {
    const { data, error } = await supabase
      .from('job_language_requirements')
      .select('*')
      .eq('job_id', jobId)
      .eq('is_essential', true)
      .order('order_index');

    if (error) throw error;
    if (data) setLanguages(data);
  };

  const fetchContributors = async () => {
    try {
      const { data: questionIds } = await supabase
        .from('job_interview_questions')
        .select('id')
        .eq('job_id', jobId);

      if (!questionIds || questionIds.length === 0) return;

      const { data, error } = await supabase
        .from('job_interview_question_contributors')
        .select(`
          user_id,
          contribution_type,
          contributed_at,
          user:users(name)
        `)
        .in('question_id', questionIds.map(q => q.id));

      if (error) throw error;

      const uniqueContributors = data?.reduce((acc: Contributor[], curr: any) => {
        const existing = acc.find(c => c.user_id === curr.user_id);
        if (!existing) {
          acc.push({
            user_id: curr.user_id,
            name: curr.user?.name || 'Unknown',
            contribution_type: curr.contribution_type,
            contributed_at: curr.contributed_at
          });
        }
        return acc;
      }, []) || [];

      setContributors(uniqueContributors);
    } catch (error) {
      console.error('Error fetching contributors:', error);
    }
  };

  const fetchPanelMembers = async () => {
    const { data, error } = await supabase
      .from('job_interview_panel_members' as any)
      .select(`
        id,
        panel_role,
        user:users(id, name, duty_station, nationality, division)
      `)
      .eq('job_id', jobId);

    if (error) throw error;
    if (data) {
      setPanelMembers(data.map((pm: any) => ({
        panel_member_id: pm.id,
        user_id: pm.user.id,
        name: pm.user.name,
        panel_role: pm.panel_role,
        duty_station: pm.user.duty_station,
        nationality: pm.user.nationality,
        division: pm.user.division
      })));
    }
  };

  const fetchAvailableUsers = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email')
      .or('role.eq.Admin,role.eq.HR Assistant,role.eq.Hiring Manager,role.eq.Panel Member')
      .order('name');

    if (error) throw error;
    if (data) setAvailableUsers(data as any);
  };

  const validatePanel = async () => {
    const { data, error } = await supabase.rpc('validate_panel_composition' as any, {
      p_job_id: jobId
    });

    if (error) {
      console.error('Validation error:', error);
      return;
    }
    if (data) {
      setPanelValidation(data as unknown as PanelValidation);
    }
  };

  const addPanelMember = async () => {
    if (!selectedUser || !selectedRole) return;

    try {
      setAddingMember(true);
      const { error } = await supabase
        .from('job_interview_panel_members' as any)
        .insert([{
          job_id: jobId,
          user_id: selectedUser,
          panel_role: selectedRole as any
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
        description: "Panel member removed successfully",
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

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const addQuestion = (requirementId?: string, competencyId?: string, languageId?: string) => {
    const newQuestion: InterviewQuestion = {
      question_text: '',
      requirement_id: requirementId || null,
      competency_id: competencyId || null,
      language_requirement_id: languageId || null,
      order_index: questions.filter(q => 
        q.requirement_id === (requirementId || null) && 
        q.competency_id === (competencyId || null) && 
        q.language_requirement_id === (languageId || null)
      ).length
    };
    setQuestions([...questions, newQuestion]);
    
    // Auto-expand the parent section if it's not already expanded
    if (requirementId) {
      const requirement = requirements.find(r => r.id === requirementId);
      if (requirement) {
        const sectionId = `req-${requirement.category}`;
        if (!expandedSections.has(sectionId)) {
          const newExpanded = new Set(expandedSections);
          newExpanded.add(sectionId);
          setExpandedSections(newExpanded);
        }
      }
    } else if (competencyId) {
      const competency = competencies.find(c => c.id === competencyId);
      if (competency) {
        const sectionId = `comp-${competency.competency_type}`;
        if (!expandedSections.has(sectionId)) {
          const newExpanded = new Set(expandedSections);
          newExpanded.add(sectionId);
          setExpandedSections(newExpanded);
        }
      }
    }
  };

  const updateQuestion = (index: number, text: string) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], question_text: text };
    setQuestions(updated);
  };

  const updateQuestionAssignment = (index: number, assignedTo: string | null) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], assigned_to: assignedTo };
    setQuestions(updated);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const saveQuestions = async () => {
    if (!user?.id) return;

    try {
      setSaving(true);

      const invalidQuestions = questions.filter(q => !q.question_text.trim());
      if (invalidQuestions.length > 0) {
        toast({
          title: "Validation Error",
          description: "All questions must have text",
          variant: "destructive",
        });
        return;
      }

      await supabase
        .from('job_interview_questions')
        .delete()
        .eq('job_id', jobId);

      const questionsToInsert = questions.map((q, index) => ({
        job_id: jobId,
        question_text: q.question_text,
        requirement_id: q.requirement_id,
        competency_id: q.competency_id,
        language_requirement_id: q.language_requirement_id,
        order_index: index,
        created_by: user.id
      }));

      const { data: insertedQuestions, error: insertError } = await supabase
        .from('job_interview_questions')
        .insert(questionsToInsert)
        .select();

      if (insertError) throw insertError;

      if (insertedQuestions && insertedQuestions.length > 0) {
        await supabase
          .from('job_interview_question_contributors')
          .insert(
            insertedQuestions.map(q => ({
              question_id: q.id,
              user_id: user.id,
              contribution_type: 'created'
            }))
          );
      }

      toast({
        title: "Success",
        description: "Interview questions saved successfully",
      });

      await loadData();
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
    if (questions.length === 0) {
      toast({
        title: "No Questions",
        description: "Please add some interview questions first",
        variant: "destructive",
      });
      return;
    }

    try {
      setGenerating(true);
      const { error } = await supabase.functions.invoke('generate-feedback-template', {
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

  const getQuestionsForItem = (requirementId?: string, competencyId?: string, languageId?: string) => {
    return questions.filter(q => 
      q.requirement_id === (requirementId || null) &&
      q.competency_id === (competencyId || null) &&
      q.language_requirement_id === (languageId || null)
    );
  };

  const getCoveragePercentage = () => {
    // Only count Essential Criteria (not Essential Education) and Competencies
    const essentialCriteria = requirements.filter(r => 
      r.category === 'Essential Criteria'
    );
    const totalItems = essentialCriteria.length + competencies.length;
    if (totalItems === 0) return 0;

    const itemsWithQuestions = new Set([
      ...questions.filter(q => q.requirement_id && essentialCriteria.some(r => r.id === q.requirement_id)).map(q => q.requirement_id),
      ...questions.filter(q => q.competency_id).map(q => q.competency_id)
    ]).size;

    return Math.round((itemsWithQuestions / totalItems) * 100);
  };

  const getCoverageIcon = (itemId: string, type: 'requirement' | 'competency' | 'language') => {
    const count = type === 'requirement' 
      ? getQuestionsForItem(itemId).length
      : type === 'competency'
      ? getQuestionsForItem(undefined, itemId).length
      : getQuestionsForItem(undefined, undefined, itemId).length;
    
    // Check if this is a desirable requirement
    const item = type === 'requirement' ? requirements.find(r => r.id === itemId) : null;
    const isDesirable = item?.category === 'Desirable Criteria';
    
    if (count === 0) {
      // Desirable criteria don't require questions
      return isDesirable ? 
        <Info className="w-4 h-4 text-muted-foreground" /> : 
        <XCircle className="w-4 h-4 text-destructive" />;
    }
    if (count < 2) return <AlertCircle className="w-4 h-4 text-yellow-600" />;
    return <CheckCircle2 className="w-4 h-4 text-green-600" />;
  };

  const renderRequirementSection = (category: string, items: Requirement[]) => {
    const sectionId = `req-${category}`;
    const isExpanded = expandedSections.has(sectionId);
    const questionsCount = items.reduce((sum, item) => 
      sum + getQuestionsForItem(item.id).length, 0
    );

    return (
      <Collapsible
        key={sectionId}
        open={isExpanded}
        onOpenChange={() => toggleSection(sectionId)}
        className="border rounded-lg"
      >
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between p-3 hover:bg-muted/50">
            <div className="flex items-center gap-2">
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              <span className="font-medium">{category}</span>
              <Badge variant="secondary">{items.length}</Badge>
              {questionsCount > 0 && (
                <Badge variant="outline">{questionsCount} questions</Badge>
              )}
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-3 pt-0 space-y-3">
            {items.map(item => {
              const itemQuestions = getQuestionsForItem(item.id);
              return (
                <div key={item.id} className="border rounded-lg p-3 bg-card space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.title}</p>
                      {item.description && (
                        <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => addQuestion(item.id)}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                  
                  {itemQuestions.length > 0 && (
                    <div className="space-y-2 mt-2">
                      {itemQuestions.map((q, qIndex) => {
                        const globalIndex = questions.findIndex(gq => gq === q);
                        return (
                          <div key={globalIndex} className="space-y-2 bg-muted/30 p-2 rounded">
                            <div className="flex gap-2">
                              <Textarea
                                placeholder="Interview question..."
                                value={q.question_text}
                                onChange={(e) => updateQuestion(globalIndex, e.target.value)}
                                className="min-h-[60px] text-sm flex-1"
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeQuestion(globalIndex)}
                              >
                                <Trash2 className="w-3 h-3 text-destructive" />
                              </Button>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">Asked by:</span>
                              <Select
                                value={q.assigned_to || undefined}
                                onValueChange={(value) => updateQuestionAssignment(globalIndex, value)}
                              >
                                <SelectTrigger className="h-8 text-xs w-[200px]">
                                  <SelectValue placeholder="Select panel member" />
                                </SelectTrigger>
                                <SelectContent>
                                  {panelMembers.map(member => (
                                    <SelectItem key={member.user_id} value={member.user_id}>
                                      {member.name} ({member.panel_role})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {q.assigned_to && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => updateQuestionAssignment(globalIndex, null)}
                                  className="h-6 px-2"
                                >
                                  <XCircle className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  const renderCompetencySection = (type: string, items: Competency[]) => {
    const sectionId = `comp-${type}`;
    const isExpanded = expandedSections.has(sectionId);
    const questionsCount = items.reduce((sum, item) => 
      sum + getQuestionsForItem(undefined, item.id).length, 0
    );

    return (
      <Collapsible
        key={sectionId}
        open={isExpanded}
        onOpenChange={() => toggleSection(sectionId)}
        className="border rounded-lg"
      >
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between p-3 hover:bg-muted/50">
            <div className="flex items-center gap-2">
              {isExpanded ? <FolderOpen className="w-4 h-4" /> : <Folder className="w-4 h-4" />}
              <span className="font-medium">{type} Competencies</span>
              <Badge variant="secondary">{items.length}</Badge>
              {questionsCount > 0 && (
                <Badge variant="outline">{questionsCount} questions</Badge>
              )}
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-3 pt-0 space-y-2">
            {items.map(item => {
              const itemQuestions = getQuestionsForItem(undefined, item.id);
              return (
                <div key={item.id} className="border rounded-lg p-3 bg-card space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1">
                      {getCoverageIcon(item.id, 'competency')}
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.competency_name}</p>
                        {item.description && (
                          <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          [{itemQuestions.length} {itemQuestions.length === 1 ? 'question' : 'questions'}]
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => addQuestion(undefined, item.id)}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                  
                  {itemQuestions.length > 0 && (
                    <div className="space-y-2 mt-2">
                      {itemQuestions.map((q, qIndex) => {
                        const globalIndex = questions.findIndex(gq => gq === q);
                        return (
                          <div key={globalIndex} className="flex gap-2 bg-muted/30 p-2 rounded">
                            <Textarea
                              placeholder="Interview question..."
                              value={q.question_text}
                              onChange={(e) => updateQuestion(globalIndex, e.target.value)}
                              className="min-h-[60px] text-sm"
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeQuestion(globalIndex)}
                            >
                              <Trash2 className="w-3 h-3 text-destructive" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  if (loading) {
    return <Card><CardContent className="p-6">Loading...</CardContent></Card>;
  }

  const groupedRequirements = requirements.reduce((acc, req) => {
    if (!acc[req.category]) acc[req.category] = [];
    acc[req.category].push(req);
    return acc;
  }, {} as Record<string, Requirement[]>);

  const groupedCompetencies = competencies.reduce((acc, comp) => {
    if (!acc[comp.competency_type]) acc[comp.competency_type] = [];
    acc[comp.competency_type].push(comp);
    return acc;
  }, {} as Record<string, Competency[]>);

  const coverage = getCoveragePercentage();
  // Only show criteria sections (not education or language)
  const essentialCriteria = requirements.filter(r => r.category === 'Essential Criteria');
  const desirableCriteria = requirements.filter(r => r.category === 'Desirable Criteria');
  const totalItems = essentialCriteria.length + desirableCriteria.length + competencies.length;

  return (
    <div className="space-y-6">
      {/* Interview Panel Composition */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Interview Panel Composition
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Select panel members ensuring gender balance, diversity in duty stations, nationalities, and divisions
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Validation Results */}
          {panelValidation && (
            <>
              {panelValidation.issues.map((issue, idx) => (
                <Alert key={`issue-${idx}`} variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <div>
                    <div className="font-medium">Issue</div>
                    <div className="text-sm">{issue.message}</div>
                  </div>
                </Alert>
              ))}
              
              {panelValidation.warnings.map((warning, idx) => (
                <Alert key={`warning-${idx}`}>
                  <Info className="h-4 w-4" />
                  <div>
                    <div className="font-medium">Recommendation</div>
                    <div className="text-sm">{warning.message}</div>
                  </div>
                </Alert>
              ))}
              
              {panelValidation.valid && panelValidation.issues.length === 0 && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <div>
                    <div className="font-medium">Panel Composition Valid</div>
                    <div className="text-sm">The panel meets all diversity requirements</div>
                  </div>
                </Alert>
              )}
              
              {/* Summary Stats */}
              {panelValidation.summary && (
                <div className="grid grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <div className="text-sm text-muted-foreground">Members</div>
                    <div className="text-2xl font-bold">{panelValidation.summary.total_members}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Duty Stations</div>
                    <div className="text-sm font-medium">{panelValidation.summary.duty_stations?.join(', ') || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Nationalities</div>
                    <div className="text-sm font-medium">{panelValidation.summary.nationalities?.join(', ') || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Divisions</div>
                    <div className="text-sm font-medium">{panelValidation.summary.divisions?.join(', ') || 'N/A'}</div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Current Panel Members */}
          <div className="space-y-2">
            <h3 className="font-medium">Current Panel Members</h3>
            {panelMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No panel members added yet</p>
            ) : (
              <div className="space-y-2">
                {panelMembers.map((member) => (
                  <div key={member.panel_member_id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>
                          {member.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{member.name}</div>
                        <div className="flex gap-2 text-xs text-muted-foreground">
                          {member.gender && <Badge variant="outline">{member.gender}</Badge>}
                          {member.duty_station && <Badge variant="outline">{member.duty_station}</Badge>}
                          {member.nationality && <Badge variant="outline">{member.nationality}</Badge>}
                          {member.division && <Badge variant="outline">{member.division}</Badge>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge>{member.panel_role}</Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removePanelMember(member.panel_member_id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Panel Member Form */}
          <div className="space-y-2">
            <h3 className="font-medium">Add Panel Member</h3>
            <div className="flex gap-2">
              <Popover open={userComboboxOpen} onOpenChange={setUserComboboxOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={userComboboxOpen}
                    className="flex-1 justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Search className="h-4 w-4 shrink-0 opacity-50" />
                      <span className={cn(!selectedUser && "text-muted-foreground")}>
                        {selectedUser
                          ? availableUsers.find(u => u.id === selectedUser)?.name
                          : "Search staff member..."}
                      </span>
                    </div>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Type to search..." />
                    <CommandList>
                      <CommandEmpty>No staff member found.</CommandEmpty>
                      <CommandGroup>
                        {availableUsers
                          .filter(u => !panelMembers.some(pm => pm.user_id === u.id))
                          .map(user => (
                            <CommandItem
                              key={user.id}
                              value={`${user.name} ${user.email}`}
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
                              <div className="flex flex-col">
                                <span>{user.name}</span>
                                <span className="text-xs text-muted-foreground">{user.email}</span>
                              </div>
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Hiring Manager">Hiring Manager</SelectItem>
                  <SelectItem value="Subject Matter Expert">Subject Matter Expert</SelectItem>
                  <SelectItem value="Additional Panel Member">Additional Panel Member</SelectItem>
                  <SelectItem value="HR Rep">HR Rep</SelectItem>
                  <SelectItem value="Observer">Observer</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                onClick={addPanelMember}
                disabled={!selectedUser || !selectedRole || addingMember}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add
              </Button>
            </div>
          </div>
        </CardContent>
        </Card>

        {/* Panel Interview Scheduling */}
        {panelValidation.valid && panelMembers.length > 0 && (
          <PanelInterviewSlotManager 
            jobId={jobId} 
            panelMembers={panelMembers}
          />
        )}

        {/* Interview Questions */}
        <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Interview Questions for {jobTitle}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Link questions to specific requirements and competencies
              </p>
            </div>
            <div className="flex items-center gap-2">
              {contributors.length > 0 && (
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <div className="flex -space-x-2">
                    {contributors.slice(0, 3).map((contributor) => (
                      <Avatar key={contributor.user_id} className="w-8 h-8 border-2 border-background">
                        <AvatarFallback className="text-xs">
                          {contributor.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {contributors.length > 3 && (
                      <div className="w-8 h-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs">
                        +{contributors.length - 3}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          {lastUpdated && (
            <p className="text-xs text-muted-foreground mt-2">
              Last updated: {format(new Date(lastUpdated), 'PPp')}
            </p>
          )}
        {totalItems > 0 && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-sm mb-2">
              <span>Coverage: {coverage}%</span>
              <span className="text-muted-foreground">{questions.length} total questions</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${coverage}%` }}
              />
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {totalItems === 0 ? (
          <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg">
            <p className="text-lg font-medium mb-2">No Requirements Defined</p>
            <p className="text-sm">
              Please complete the job requirements in the Job Wizard first.<br />
              You need to add Essential/Desirable Criteria or Competencies.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {/* COMPETENCIES AND SOFT-SKILLS Section */}
              {competencies.length > 0 && (
                <Collapsible
                  defaultOpen
                  className="border-2 border-primary/20 rounded-lg"
                >
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between p-4 hover:bg-muted/50 bg-primary/5">
                      <div className="flex items-center gap-3">
                        <FolderOpen className="w-5 h-5 text-primary" />
                        <span className="font-bold text-base">📁 COMPETENCIES AND SOFT-SKILLS</span>
                        <Badge variant="secondary">{competencies.length}</Badge>
                        <Badge variant="outline">
                          {questions.filter(q => q.competency_id).length} questions
                        </Badge>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="p-3 space-y-3">
                      {Object.entries(groupedCompetencies).map(([type, items]) => 
                        renderCompetencySection(type, items)
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* ESSENTIAL CRITERIA Section - Only Essential Criteria, not Essential Education */}
              {essentialCriteria.length > 0 && (
                <Collapsible
                  defaultOpen
                  className="border-2 border-orange-200 rounded-lg"
                >
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between p-4 hover:bg-muted/50 bg-orange-50">
                      <div className="flex items-center gap-3">
                        <FolderOpen className="w-5 h-5 text-orange-600" />
                        <span className="font-bold text-base">📁 ESSENTIAL CRITERIA</span>
                        <Badge variant="secondary">
                          {essentialCriteria.length}
                        </Badge>
                        <Badge variant="outline">
                          {questions.filter(q => {
                            const req = requirements.find(r => r.id === q.requirement_id);
                            return req?.category === 'Essential Criteria';
                          }).length} questions
                        </Badge>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="p-3 space-y-3">
                      {renderRequirementSection('Essential Criteria', essentialCriteria)}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* DESIRABLE CRITERIA Section */}
              {desirableCriteria.length > 0 && (
                <Collapsible
                  className="border-2 border-blue-200 rounded-lg"
                >
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between p-4 hover:bg-muted/50 bg-blue-50">
                      <div className="flex items-center gap-3">
                        <FolderOpen className="w-5 h-5 text-blue-600" />
                        <span className="font-bold text-base">📁 DESIRABLE CRITERIA</span>
                        <Badge variant="secondary">
                          {desirableCriteria.length}
                        </Badge>
                        <Badge variant="outline">
                          {questions.filter(q => {
                            const req = requirements.find(r => r.id === q.requirement_id);
                            return req?.category === 'Desirable Criteria';
                          }).length} questions
                        </Badge>
                        <Info className="w-4 h-4 text-blue-600" />
                        <span className="text-xs text-muted-foreground">(Optional)</span>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="p-3 space-y-3">
                      <div className="text-sm text-muted-foreground mb-2 p-2 bg-blue-50 rounded border border-blue-200">
                        ℹ️ Questions for desirable criteria are optional - add them if you want to assess these during interviews.
                      </div>
                      {renderRequirementSection('Desirable Criteria', desirableCriteria)}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button onClick={saveQuestions} disabled={saving || questions.length === 0}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Questions'}
              </Button>
              <Button 
                variant="outline" 
                onClick={generateFeedbackTemplate} 
                disabled={generating || questions.length === 0}
              >
                <Wand2 className="w-4 h-4 mr-2" />
                {generating ? 'Generating...' : 'Generate Feedback Template'}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
    </div>
  );
}
