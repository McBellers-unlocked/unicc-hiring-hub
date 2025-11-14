import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Save, Wand2, Users, ChevronDown, ChevronRight, CheckCircle2, AlertCircle, XCircle, Info, Folder, FolderOpen } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface InterviewQuestion {
  id?: string;
  question_text: string;
  requirement_id?: string | null;
  competency_id?: string | null;
  language_requirement_id?: string | null;
  order_index: number;
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
        fetchContributors()
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
      q.requirement_id === requirementId &&
      q.competency_id === competencyId &&
      q.language_requirement_id === languageId
    );
  };

  const getCoveragePercentage = () => {
    const totalItems = requirements.length + competencies.length + languages.length;
    if (totalItems === 0) return 0;

    const itemsWithQuestions = new Set([
      ...questions.filter(q => q.requirement_id).map(q => q.requirement_id),
      ...questions.filter(q => q.competency_id).map(q => q.competency_id),
      ...questions.filter(q => q.language_requirement_id).map(q => q.language_requirement_id)
    ]).size;

    return Math.round((itemsWithQuestions / totalItems) * 100);
  };

  const getCoverageIcon = (itemId: string, type: 'requirement' | 'competency' | 'language') => {
    const count = type === 'requirement' 
      ? getQuestionsForItem(itemId).length
      : type === 'competency'
      ? getQuestionsForItem(undefined, itemId).length
      : getQuestionsForItem(undefined, undefined, itemId).length;
    
    if (count === 0) return <XCircle className="w-4 h-4 text-destructive" />;
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
  const totalItems = requirements.length + competencies.length + languages.length;

  return (
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
              You need to add Essential/Desirable Criteria, Education, Competencies, or Language Requirements.
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

              {/* ESSENTIAL CRITERIA Section */}
              {requirements.filter(r => r.category.includes('Essential')).length > 0 && (
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
                          {requirements.filter(r => r.category.includes('Essential')).length}
                        </Badge>
                        <Badge variant="outline">
                          {questions.filter(q => {
                            const req = requirements.find(r => r.id === q.requirement_id);
                            return req?.category.includes('Essential');
                          }).length} questions
                        </Badge>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="p-3 space-y-3">
                      {Object.entries(groupedRequirements)
                        .filter(([category]) => category.includes('Essential'))
                        .map(([category, items]) => renderRequirementSection(category, items)
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* DESIRABLE CRITERIA Section */}
              {requirements.filter(r => r.category.includes('Desirable')).length > 0 && (
                <Collapsible
                  className="border-2 border-blue-200 rounded-lg"
                >
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between p-4 hover:bg-muted/50 bg-blue-50">
                      <div className="flex items-center gap-3">
                        <FolderOpen className="w-5 h-5 text-blue-600" />
                        <span className="font-bold text-base">📁 DESIRABLE CRITERIA</span>
                        <Badge variant="secondary">
                          {requirements.filter(r => r.category.includes('Desirable')).length}
                        </Badge>
                        <Badge variant="outline">
                          {questions.filter(q => {
                            const req = requirements.find(r => r.id === q.requirement_id);
                            return req?.category.includes('Desirable');
                          }).length} questions
                        </Badge>
                        <Info className="w-4 h-4 text-blue-600" />
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="p-3 space-y-3">
                      {Object.entries(groupedRequirements)
                        .filter(([category]) => category.includes('Desirable'))
                        .map(([category, items]) => renderRequirementSection(category, items)
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* OVERALL ASSESSMENT Section */}
              {requirements.filter(r => r.category === 'Overall Assessment').length > 0 && (
                <Collapsible
                  defaultOpen
                  className="border-2 border-green-200 rounded-lg"
                >
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between p-4 hover:bg-muted/50 bg-green-50">
                      <div className="flex items-center gap-3">
                        <FolderOpen className="w-5 h-5 text-green-600" />
                        <span className="font-bold text-base">📁 OVERALL ASSESSMENT</span>
                        <Badge variant="secondary">
                          {requirements.filter(r => r.category === 'Overall Assessment').length}
                        </Badge>
                        <Info className="w-4 h-4 text-green-600" />
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="p-3 space-y-3">
                      <div className="text-sm text-muted-foreground mb-2 p-2 bg-green-50 rounded border border-green-200">
                        ℹ️ These are holistic assessments scored during interviews. No specific questions needed.
                      </div>
                      {requirements
                        .filter(r => r.category === 'Overall Assessment')
                        .map(item => (
                          <div key={item.id} className="border rounded-lg p-3 bg-card">
                            <div className="flex items-start gap-2">
                              <CheckCircle2 className="w-4 h-4 text-green-600 mt-1" />
                              <div>
                                <p className="font-medium text-sm">{item.title}</p>
                                {item.description && (
                                  <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {languages.length > 0 && (
                <Collapsible
                  open={expandedSections.has('languages')}
                  onOpenChange={() => toggleSection('languages')}
                  className="border rounded-lg"
                >
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between p-3 hover:bg-muted/50">
                      <div className="flex items-center gap-2">
                        {expandedSections.has('languages') ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        <span className="font-medium">Language Requirements</span>
                        <Badge variant="secondary">{languages.length}</Badge>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="p-3 pt-0 space-y-3">
                      {languages.map(lang => {
                        const langQuestions = getQuestionsForItem(undefined, undefined, lang.id);
                        return (
                          <div key={lang.id} className="border rounded-lg p-3 bg-card space-y-2">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-medium text-sm">{lang.language} - {lang.level}</p>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => addQuestion(undefined, undefined, lang.id)}
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>
                            
                            {langQuestions.length > 0 && (
                              <div className="space-y-2 mt-2">
                                {langQuestions.map((q, qIndex) => {
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
  );
}
