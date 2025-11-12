import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, GripVertical, Save, Wand2, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { format } from 'date-fns';

interface InterviewQuestion {
  id?: string;
  question_text: string;
  question_category: string;
  competency: string;
  order_index: number;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
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

const CATEGORIES = [
  'Technical Skills',
  'Behavioral',
  'Leadership',
  'Cultural Fit',
  'Problem Solving',
  'Communication',
  'Teamwork',
  'Adaptability',
  'Other'
];

const COMPETENCIES = [
  'Problem Solving',
  'Communication',
  'Leadership',
  'Technical Expertise',
  'Collaboration',
  'Innovation',
  'Accountability',
  'Client Orientation',
  'Adaptability',
  'Strategic Thinking'
];

export function JobInterviewQuestionsBuilder({ jobId, jobTitle }: JobInterviewQuestionsBuilderProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    fetchQuestions();
    fetchContributors();
  }, [jobId]);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('job_interview_questions')
        .select('*')
        .eq('job_id', jobId)
        .order('order_index');

      if (error) throw error;

      if (data && data.length > 0) {
        setQuestions(data);
        const mostRecent = data.reduce((latest, current) => 
          new Date(current.updated_at) > new Date(latest.updated_at) ? current : latest
        );
        setLastUpdated(mostRecent.updated_at);
      } else {
        // Start with empty questions
        setQuestions([]);
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
      toast({
        title: "Error",
        description: "Failed to load interview questions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
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

  const addQuestion = () => {
    const newQuestion: InterviewQuestion = {
      question_text: '',
      question_category: 'Technical Skills',
      competency: 'Problem Solving',
      order_index: questions.length
    };
    setQuestions([...questions, newQuestion]);
  };

  const updateQuestion = (index: number, field: keyof InterviewQuestion, value: string | number) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const removeQuestion = (index: number) => {
    const updated = questions.filter((_, i) => i !== index);
    // Update order indices
    updated.forEach((q, i) => q.order_index = i);
    setQuestions(updated);
  };

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === questions.length - 1)) {
      return;
    }

    const updated = [...questions];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [updated[index], updated[targetIndex]] = [updated[targetIndex], updated[index]];
    
    // Update order indices
    updated.forEach((q, i) => q.order_index = i);
    setQuestions(updated);
  };

  const saveQuestions = async () => {
    if (!user?.id) return;

    try {
      setSaving(true);

      // Validate questions
      const invalidQuestions = questions.filter(q => !q.question_text.trim());
      if (invalidQuestions.length > 0) {
        toast({
          title: "Validation Error",
          description: "All questions must have text",
          variant: "destructive",
        });
        return;
      }

      // Delete existing questions for this job
      await supabase
        .from('job_interview_questions')
        .delete()
        .eq('job_id', jobId);

      // Insert new questions
      const questionsToInsert = questions.map((q, index) => ({
        job_id: jobId,
        question_text: q.question_text,
        question_category: q.question_category,
        competency: q.competency,
        order_index: index,
        created_by: user.id
      }));

      const { data: insertedQuestions, error: insertError } = await supabase
        .from('job_interview_questions')
        .insert(questionsToInsert)
        .select();

      if (insertError) throw insertError;

      // Track contributor
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

      fetchQuestions();
      fetchContributors();
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

  const groupedQuestions = questions.reduce((acc, question) => {
    if (!acc[question.question_category]) {
      acc[question.question_category] = [];
    }
    acc[question.question_category].push(question);
    return acc;
  }, {} as Record<string, InterviewQuestion[]>);

  if (loading) {
    return <Card><CardContent className="p-6">Loading...</CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Interview Questions for {jobTitle}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Collaborate with your team to build comprehensive interview questions
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
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Questions by Category */}
        {Object.keys(groupedQuestions).length > 0 ? (
          <div className="space-y-6">
            {Object.entries(groupedQuestions).map(([category, categoryQuestions]) => (
              <div key={category} className="space-y-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg">{category}</h3>
                  <Badge variant="secondary">{categoryQuestions.length} questions</Badge>
                </div>
                {categoryQuestions.map((question, idx) => {
                  const globalIndex = questions.findIndex(q => q === question);
                  return (
                    <div key={globalIndex} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="flex flex-col gap-1 mt-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => moveQuestion(globalIndex, 'up')}
                            disabled={globalIndex === 0}
                          >
                            ↑
                          </Button>
                          <GripVertical className="w-4 h-4 text-muted-foreground" />
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => moveQuestion(globalIndex, 'down')}
                            disabled={globalIndex === questions.length - 1}
                          >
                            ↓
                          </Button>
                        </div>
                        <div className="flex-1 space-y-3">
                          <Textarea
                            placeholder="Interview question..."
                            value={question.question_text}
                            onChange={(e) => updateQuestion(globalIndex, 'question_text', e.target.value)}
                            className="min-h-[80px]"
                          />
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-sm font-medium">Category</label>
                              <Select
                                value={question.question_category}
                                onValueChange={(value) => updateQuestion(globalIndex, 'question_category', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {CATEGORIES.map(cat => (
                                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <label className="text-sm font-medium">Competency</label>
                              <Select
                                value={question.competency}
                                onValueChange={(value) => updateQuestion(globalIndex, 'competency', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {COMPETENCIES.map(comp => (
                                    <SelectItem key={comp} value={comp}>{comp}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeQuestion(globalIndex)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>No interview questions yet. Add your first question to get started.</p>
          </div>
        )}

        {/* All questions list for editing */}
        {questions.length === 0 && (
          <div className="space-y-3">
            {questions.map((question, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex flex-col gap-1 mt-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => moveQuestion(index, 'up')}
                      disabled={index === 0}
                    >
                      ↑
                    </Button>
                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => moveQuestion(index, 'down')}
                      disabled={index === questions.length - 1}
                    >
                      ↓
                    </Button>
                  </div>
                  <div className="flex-1 space-y-3">
                    <Textarea
                      placeholder="Interview question..."
                      value={question.question_text}
                      onChange={(e) => updateQuestion(index, 'question_text', e.target.value)}
                      className="min-h-[80px]"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-medium">Category</label>
                        <Select
                          value={question.question_category}
                          onValueChange={(value) => updateQuestion(index, 'question_category', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CATEGORIES.map(cat => (
                              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Competency</label>
                        <Select
                          value={question.competency}
                          onValueChange={(value) => updateQuestion(index, 'competency', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {COMPETENCIES.map(comp => (
                              <SelectItem key={comp} value={comp}>{comp}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeQuestion(index)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button onClick={addQuestion} variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Add Question
          </Button>
          <div className="flex items-center gap-3">
            <Button
              onClick={generateFeedbackTemplate}
              variant="secondary"
              disabled={questions.length === 0 || generating}
            >
              <Wand2 className="w-4 h-4 mr-2" />
              {generating ? 'Generating...' : 'Generate Feedback Template'}
            </Button>
            <Button onClick={saveQuestions} disabled={saving || questions.length === 0}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Questions'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
