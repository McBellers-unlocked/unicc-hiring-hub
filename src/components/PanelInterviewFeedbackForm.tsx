import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

interface FeedbackSection {
  title: string;
  weight: number;
  criteria: Array<{
    id: string;
    name: string;
    description: string;
    weight: number;
    is_essential: boolean;
  }>;
}

interface PanelInterviewFeedbackFormProps {
  interviewId: string;
  applicationId: string;
  templateId: string;
  userId: string;
  readOnly?: boolean;
}

export const PanelInterviewFeedbackForm: React.FC<PanelInterviewFeedbackFormProps> = ({
  interviewId,
  applicationId,
  templateId,
  userId,
  readOnly = false
}) => {
  const { toast } = useToast();
  const [template, setTemplate] = useState<{ sections: FeedbackSection[] } | null>(null);
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [overall, setOverall] = useState<number>(0);
  const [recommendation, setRecommendation] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingResponseId, setExistingResponseId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [templateId, userId, applicationId]);

  const loadData = async () => {
    try {
      // Load template
      const { data: templateData, error: templateError } = await supabase
        .from('feedback_form_templates')
        .select('sections')
        .eq('id', templateId)
        .single();

      if (templateError) throw templateError;
      setTemplate(templateData);

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
        setResponses(existingResponse.responses || {});
        setOverall(existingResponse.overall || 0);
        setRecommendation(existingResponse.recommendation || '');
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

  const handleScoreChange = (criterionId: string, score: number) => {
    setResponses(prev => ({ ...prev, [criterionId]: score }));
  };

  const handleNoteChange = (criterionId: string, note: string) => {
    setNotes(prev => ({ ...prev, [criterionId]: note }));
  };

  const calculateOverallScore = () => {
    const allScores = Object.values(responses).filter(s => s > 0);
    if (allScores.length === 0) return 0;
    return allScores.reduce((sum, score) => sum + score, 0) / allScores.length;
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const calculatedOverall = calculateOverallScore();

      const feedbackData = {
        application_id: applicationId,
        evaluator_id: userId,
        panel_interview_id: interviewId,
        responses,
        overall: calculatedOverall,
        recommendation
      };

      if (existingResponseId) {
        const { error } = await supabase
          .from('feedback_form_responses')
          .update(feedbackData)
          .eq('id', existingResponseId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('feedback_form_responses')
          .insert(feedbackData)
          .select()
          .single();

        if (error) throw error;
        setExistingResponseId(data.id);
      }

      setOverall(calculatedOverall);
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

  if (loading) return <div className="p-4">Loading feedback form...</div>;
  if (!template) return <div className="p-4">No feedback template found</div>;

  return (
    <div className="space-y-6">
      {template.sections.map((section) => (
        <Card key={section.title}>
          <CardHeader>
            <CardTitle className="text-lg">
              {section.title} ({section.weight}% weight)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {section.criteria.map((criterion) => (
              <div key={criterion.id} className="space-y-2 pb-4 border-b last:border-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <Label className="font-medium">{criterion.name}</Label>
                    <p className="text-sm text-muted-foreground mt-1">{criterion.description}</p>
                  </div>
                  <div className="w-24">
                    <Select
                      value={responses[criterion.id]?.toString() || ""}
                      onValueChange={(value) => handleScoreChange(criterion.id, parseInt(value))}
                      disabled={readOnly}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Score" />
                      </SelectTrigger>
                      <SelectContent>
                        {[0, 1, 2, 3, 4, 5].map((score) => (
                          <SelectItem key={score} value={score.toString()}>
                            {score}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Textarea
                  placeholder="Notes (optional)"
                  value={notes[criterion.id] || ''}
                  onChange={(e) => handleNoteChange(criterion.id, e.target.value)}
                  disabled={readOnly}
                  className="mt-2"
                  rows={2}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader>
          <CardTitle>Overall Assessment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Overall Score (Calculated): {calculateOverallScore().toFixed(2)} / 5.0</Label>
          </div>
          <div>
            <Label>Recommendation</Label>
            <Select
              value={recommendation}
              onValueChange={setRecommendation}
              disabled={readOnly}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select recommendation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Highly Recommended">Highly Recommended</SelectItem>
                <SelectItem value="Recommended">Recommended</SelectItem>
                <SelectItem value="Not Recommended">Not Recommended</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {!readOnly && (
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? 'Saving...' : existingResponseId ? 'Update Feedback' : 'Submit Feedback'}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
