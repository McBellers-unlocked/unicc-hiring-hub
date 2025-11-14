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
        setResponses(existingResponses || {});
        const existingNotes = existingResponse as any;
        if (existingNotes.notes) {
          setNotes(existingNotes.notes);
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

      const feedbackData: any = {
        application_id: applicationId,
        evaluator_id: userId,
        panel_interview_id: interviewId,
        responses: responses as any,
        notes: notes as any
      };

      if (existingResponseId) {
        const { error } = await supabase
          .from('feedback_form_responses')
          .update(feedbackData)
          .eq('id', existingResponseId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('feedback_form_responses')
          .insert([feedbackData]);

        if (error) throw error;
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
