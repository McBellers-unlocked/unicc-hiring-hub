import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface InterviewQuestion {
  id: string;
  question_text: string;
  competencies: Array<{
    id: string;
    competency_name: string;
  }>;
  requirements: Array<{
    id: string;
    title: string;
  }>;
}

interface PanelInterviewFeedbackFormProps {
  interviewId: string;
  applicationId: string;
  jobId: string;
  userId: string;
  readOnly?: boolean;
}

export const PanelInterviewFeedbackForm: React.FC<PanelInterviewFeedbackFormProps> = ({
  interviewId,
  applicationId,
  jobId,
  userId,
  readOnly = false
}) => {
  const { toast } = useToast();
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingResponseId, setExistingResponseId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [jobId, userId, applicationId]);

  const loadData = async () => {
    try {
      // Load interview questions for this job
      const { data: questionsData, error: questionsError } = await supabase
        .from('job_interview_questions')
        .select('id, question_text')
        .eq('job_id', jobId)
        .order('order_index');

      if (questionsError) throw questionsError;

      // Fetch competencies and requirements for each question
      const questionsWithDetails = await Promise.all(
        (questionsData || []).map(async (q: any) => {
          const { data: compData } = await supabase
            .from('job_interview_question_competencies')
            .select('competency_id, job_competencies(id, competency_name)')
            .eq('question_id', q.id);

          const { data: reqData } = await supabase
            .from('job_interview_question_requirements')
            .select('requirement_id, job_requirements(id, title)')
            .eq('question_id', q.id);

          return {
            ...q,
            competencies: (compData || []).map((c: any) => c.job_competencies).filter(Boolean),
            requirements: (reqData || []).map((r: any) => r.job_requirements).filter(Boolean)
          };
        })
      );

      setQuestions(questionsWithDetails);

      // Load existing response if any
      const { data: existingResponse, error: responseError } = await supabase
        .from('feedback_form_responses')
        .select('*')
        .eq('application_id', applicationId)
        .eq('evaluator_id', userId)
        .eq('panel_interview_id', interviewId)
        .maybeSingle();

      if (responseError && responseError.code !== 'PGRST116') throw responseError;

      if (existingResponse) {
        setExistingResponseId(existingResponse.id);
        const existingResponses = existingResponse.responses as any;
        
        // Extract scores and notes from the combined responses object
        if (existingResponses) {
          const extractedScores: Record<string, number> = {};
          const extractedNotes: Record<string, string> = {};
          
          Object.keys(existingResponses).forEach(key => {
            if (typeof existingResponses[key] === 'object') {
              extractedScores[key] = existingResponses[key].score || 0;
              extractedNotes[key] = existingResponses[key].note || '';
            } else {
              // Backward compatibility for old format
              extractedScores[key] = existingResponses[key] || 0;
            }
          });
          
          setResponses(extractedScores);
          setNotes(extractedNotes);
        }
      }
    } catch (error) {
      console.error('Error loading feedback form:', error);
      toast({
        title: "Error",
        description: "Failed to load feedback form",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleScoreChange = (questionId: string, score: number) => {
    setResponses(prev => ({ ...prev, [questionId]: score }));
  };

  const handleNoteChange = (questionId: string, note: string) => {
    setNotes(prev => ({ ...prev, [questionId]: note }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Combine scores and notes into a single responses object
      const combinedResponses: any = {};
      questions.forEach(q => {
        combinedResponses[q.id] = {
          score: responses[q.id] || 0,
          note: notes[q.id] || ''
        };
      });

      // Add overall_fit and potential to responses
      if (responses['overall_fit'] !== undefined) {
        combinedResponses['overall_fit'] = {
          score: responses['overall_fit'],
          note: notes['overall_fit'] || ''
        };
      }
      if (responses['potential'] !== undefined) {
        combinedResponses['potential'] = {
          score: responses['potential'],
          note: notes['potential'] || ''
        };
      }
      if (notes['overall_notes']) {
        combinedResponses['overall_notes'] = {
          score: 0,
          note: notes['overall_notes']
        };
      }

      const feedbackData: any = {
        application_id: applicationId,
        evaluator_id: userId,
        panel_interview_id: interviewId,
        responses: combinedResponses
      };

      if (existingResponseId) {
        const { error } = await supabase
          .from('feedback_form_responses')
          .update(feedbackData)
          .eq('id', existingResponseId);

        if (error) throw error;

        // Log feedback update to audit trail
        await supabase.functions.invoke('create-audit-log', {
          body: {
            action: 'FEEDBACK_UPDATED',
            entity: 'feedback_form_responses',
            entityId: applicationId,
            actorId: userId,
            after: {
              overall_score: feedbackData.overall,
              recommendation: feedbackData.recommendation
            }
          }
        });
      } else {
        const { error } = await supabase
          .from('feedback_form_responses')
          .insert([feedbackData]);

        if (error) throw error;

        // Log feedback submission to audit trail
        await supabase.functions.invoke('create-audit-log', {
          body: {
            action: 'FEEDBACK_SUBMITTED',
            entity: 'feedback_form_responses',
            entityId: applicationId,
            actorId: userId,
            after: {
              overall_score: feedbackData.overall,
              recommendation: feedbackData.recommendation
            }
          }
        });
      }

      toast({
        title: "Success",
        description: "Feedback saved successfully"
      });
    } catch (error) {
      console.error('Error saving feedback:', error);
      toast({
        title: "Error",
        description: "Failed to save feedback",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading interview questions...</div>;
  }

  if (questions.length === 0) {
    return <div className="text-center py-4">No interview questions configured for this job</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Interview Feedback</CardTitle>
        <p className="text-sm text-muted-foreground">
          Score each question from 0-5 and add notes
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {questions.map((question, idx) => (
          <div key={question.id} className="border rounded-lg p-4 space-y-3">
            <div>
              <Label className="font-medium">
                Question {idx + 1}
              </Label>
              <p className="text-sm mt-1">{question.question_text}</p>
              
              {(question.competencies.length > 0 || question.requirements.length > 0) && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {question.competencies.map(comp => (
                    <span key={comp.id} className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                      {comp.competency_name}
                    </span>
                  ))}
                  {question.requirements.map(req => (
                    <span key={req.id} className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                      {req.title}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor={`score-${question.id}`}>Score (0-5)</Label>
                <select
                  id={`score-${question.id}`}
                  disabled={readOnly}
                  value={responses[question.id] || ''}
                  onChange={(e) => handleScoreChange(question.id, parseInt(e.target.value) || 0)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Select</option>
                  {[0, 1, 2, 3, 4, 5].map(score => (
                    <option key={score} value={score}>
                      {score}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <Label htmlFor={`note-${question.id}`}>Notes</Label>
                <Textarea
                  id={`note-${question.id}`}
                  disabled={readOnly}
                  value={notes[question.id] || ''}
                  onChange={(e) => handleNoteChange(question.id, e.target.value)}
                  placeholder="Add notes for this question..."
                  rows={2}
                />
              </div>
            </div>
          </div>
        ))}

        {/* Overall Assessment */}
        <div className="border-t pt-6 mt-6 space-y-4">
          <h3 className="font-semibold text-lg">Overall Assessment</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="overall-fit">Overall Fit (0-5)</Label>
              <select
                id="overall-fit"
                disabled={readOnly}
                value={responses['overall_fit'] || ''}
                onChange={(e) => handleScoreChange('overall_fit', parseInt(e.target.value) || 0)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Select</option>
                {[0, 1, 2, 3, 4, 5].map(score => (
                  <option key={score} value={score}>
                    {score}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="potential">Potential (0-5)</Label>
              <select
                id="potential"
                disabled={readOnly}
                value={responses['potential'] || ''}
                onChange={(e) => handleScoreChange('potential', parseInt(e.target.value) || 0)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Select</option>
                {[0, 1, 2, 3, 4, 5].map(score => (
                  <option key={score} value={score}>
                    {score}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="overall-notes">Overall Notes</Label>
            <Textarea
              id="overall-notes"
              disabled={readOnly}
              value={notes['overall_notes'] || ''}
              onChange={(e) => handleNoteChange('overall_notes', e.target.value)}
              placeholder="Add overall assessment notes..."
              rows={3}
            />
          </div>
        </div>

        {!readOnly && (
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="w-full"
          >
            {saving ? 'Saving...' : 'Save Feedback'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
