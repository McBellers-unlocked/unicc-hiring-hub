import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface FeedbackSection {
  id: string;
  title: string;
  description?: string;
  questions: Array<{
    id: string;
    question: string;
    type: 'rating' | 'text' | 'select';
    options?: string[];
    required?: boolean;
  }>;
}

interface FeedbackTemplate {
  id: string;
  name: string;
  sections: any;
}

interface FeedbackFormRendererProps {
  panelInterviewId: string;
  applicationId: string;
  templateId?: string;
  readonly?: boolean;
  existingResponse?: any;
}

export const FeedbackFormRenderer: React.FC<FeedbackFormRendererProps> = ({
  panelInterviewId,
  applicationId,
  templateId,
  readonly = false,
  existingResponse
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [template, setTemplate] = useState<FeedbackTemplate | null>(null);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [overallRating, setOverallRating] = useState<number>();
  const [recommendation, setRecommendation] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (templateId) {
      fetchTemplate();
    }
    if (existingResponse) {
      setResponses(existingResponse.responses || {});
      setOverallRating(existingResponse.overall);
      setRecommendation(existingResponse.recommendation || '');
    }
  }, [templateId, existingResponse]);

  const fetchTemplate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('feedback_form_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (error) throw error;
      setTemplate(data);
    } catch (error) {
      console.error('Error fetching template:', error);
      toast({
        title: "Error",
        description: "Failed to load feedback form",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResponseChange = (sectionId: string, questionId: string, value: any) => {
    setResponses(prev => ({
      ...prev,
      [`${sectionId}_${questionId}`]: value
    }));
  };

  const calculateAverageRating = () => {
    const ratings = Object.values(responses).filter(value => 
      typeof value === 'number' && value >= 1 && value <= 5
    );
    return ratings.length > 0 
      ? Math.round((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length) * 10) / 10
      : 0;
  };

  const handleSubmit = async () => {
    if (!user?.id || readonly) return;

    setSubmitting(true);
    try {
      const averageRating = calculateAverageRating();
      
      const { error } = await supabase
        .from('feedback_form_responses')
        .upsert({
          application_id: applicationId,
          panel_interview_id: panelInterviewId,
          evaluator_id: user.id,
          responses,
          overall: overallRating || averageRating,
          recommendation: (recommendation as any) || null
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Feedback submitted successfully"
      });
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({
        title: "Error",
        description: "Failed to submit feedback",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading feedback form...</div>;
  }

  if (!template) {
    return <div className="text-center py-8">No feedback template configured</div>;
  }

  const averageRating = calculateAverageRating();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{template.name}</CardTitle>
        </CardHeader>
      </Card>

      {template.sections.map((section) => (
        <Card key={section.id}>
          <CardHeader>
            <CardTitle className="text-lg">{section.title}</CardTitle>
            {section.description && (
              <p className="text-sm text-muted-foreground">{section.description}</p>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {section.questions.map((question) => (
              <div key={question.id} className="space-y-2">
                <Label className="text-base font-medium">
                  {question.question}
                  {question.required && <span className="text-red-500 ml-1">*</span>}
                </Label>
                
                {question.type === 'rating' && (
                  <RadioGroup
                    value={responses[`${section.id}_${question.id}`]?.toString()}
                    onValueChange={(value) => 
                      handleResponseChange(section.id, question.id, parseInt(value))
                    }
                    disabled={readonly}
                    className="flex gap-4"
                  >
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <div key={rating} className="flex items-center space-x-2">
                        <RadioGroupItem value={rating.toString()} id={`${question.id}_${rating}`} />
                        <Label htmlFor={`${question.id}_${rating}`}>{rating}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}

                {question.type === 'text' && (
                  <Textarea
                    value={responses[`${section.id}_${question.id}`] || ''}
                    onChange={(e) => 
                      handleResponseChange(section.id, question.id, e.target.value)
                    }
                    disabled={readonly}
                    placeholder="Enter your response..."
                    rows={3}
                  />
                )}

                {question.type === 'select' && question.options && (
                  <Select
                    value={responses[`${section.id}_${question.id}`] || ''}
                    onValueChange={(value) => 
                      handleResponseChange(section.id, question.id, value)
                    }
                    disabled={readonly}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an option" />
                    </SelectTrigger>
                    <SelectContent>
                      {question.options.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
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
          <div className="space-y-2">
            <Label>Overall Rating (1-5)</Label>
            <RadioGroup
              value={overallRating?.toString() || ''}
              onValueChange={(value) => setOverallRating(parseInt(value))}
              disabled={readonly}
              className="flex gap-4"
            >
              {[1, 2, 3, 4, 5].map((rating) => (
                <div key={rating} className="flex items-center space-x-2">
                  <RadioGroupItem value={rating.toString()} id={`overall_${rating}`} />
                  <Label htmlFor={`overall_${rating}`}>{rating}</Label>
                </div>
              ))}
            </RadioGroup>
            {averageRating > 0 && (
              <p className="text-sm text-muted-foreground">
                Calculated average from ratings: {averageRating}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Final Recommendation</Label>
            <Select
              value={recommendation}
              onValueChange={setRecommendation}
              disabled={readonly}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select recommendation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Yes">Yes - Recommend for hire</SelectItem>
                <SelectItem value="No">No - Do not recommend</SelectItem>
                <SelectItem value="Reserve">Reserve - Maybe with conditions</SelectItem>
                <SelectItem value="Roster">Roster - Add to talent pool</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {!readonly && (
            <Button 
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full"
            >
              {submitting ? 'Submitting...' : 'Submit Feedback'}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};