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
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface FeedbackCriterion {
  id: string;
  name: string;
  description: string;
  weight: number;
  is_essential: boolean;
  linked_questions: string[];
}

interface FeedbackSection {
  title: string;
  weight: number;
  criteria: FeedbackCriterion[];
}

interface FeedbackTemplate {
  id: string;
  name: string;
  sections: FeedbackSection[];
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
  const [notes, setNotes] = useState<Record<string, string>>({});
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
      
      // Parse sections from Json to proper type
      const parsedTemplate: FeedbackTemplate = {
        id: data.id,
        name: data.name,
        sections: (data.sections as any) || []
      };
      
      setTemplate(parsedTemplate);
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

  const handleRatingChange = (criterionId: string, value: number) => {
    setResponses(prev => ({
      ...prev,
      [criterionId]: value
    }));
  };

  const handleNoteChange = (criterionId: string, value: string) => {
    setNotes(prev => ({
      ...prev,
      [criterionId]: value
    }));
  };

  const calculateSectionAverage = (section: FeedbackSection) => {
    const sectionScores = section.criteria
      .map(c => responses[c.id])
      .filter(score => typeof score === 'number');
    
    if (sectionScores.length === 0) return 0;
    return Math.round((sectionScores.reduce((sum, score) => sum + score, 0) / sectionScores.length) * 10) / 10;
  };

  const calculateWeightedTotal = () => {
    if (!template) return 0;
    
    let totalWeightedScore = 0;
    let totalWeight = 0;

    template.sections.forEach(section => {
      const sectionAvg = calculateSectionAverage(section);
      if (sectionAvg > 0) {
        totalWeightedScore += (sectionAvg / 5) * section.weight;
        totalWeight += section.weight;
      }
    });

    return totalWeight > 0 ? Math.round((totalWeightedScore / totalWeight) * 100) : 0;
  };

  const handleSubmit = async () => {
    if (!user?.id || readonly) return;

    setSubmitting(true);
    try {
      const overallPercentage = calculateWeightedTotal();
      
      const { error } = await supabase
        .from('feedback_form_responses')
        .upsert({
          application_id: applicationId,
          panel_interview_id: panelInterviewId,
          evaluator_id: user.id,
          responses: { ...responses, notes },
          overall: overallRating || Math.round((overallPercentage / 100) * 5),
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

  const overallPercentage = calculateWeightedTotal();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{template.name}</CardTitle>
          <p className="text-sm text-muted-foreground">
            Evaluate the candidate across all criteria. Use the 1-5 scale for each item.
          </p>
        </CardHeader>
      </Card>

      {template.sections.map((section, sectionIndex) => {
        const sectionAvg = calculateSectionAverage(section);
        const sectionPercentage = Math.round((sectionAvg / 5) * 100);
        
        return (
          <Card key={sectionIndex}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {section.title}
                    <Badge variant="outline">{section.weight}% weight</Badge>
                  </CardTitle>
                  {section.criteria.length > 0 && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {section.criteria.length} criteria to assess
                    </p>
                  )}
                </div>
                {sectionAvg > 0 && (
                  <Badge variant="secondary" className="text-base">
                    Avg: {sectionAvg}/5 ({sectionPercentage}%)
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {section.criteria.map((criterion, criterionIndex) => (
                <div key={criterion.id} className="space-y-3 pb-4 border-b last:border-b-0">
                  <div>
                    <Label className="text-base font-semibold flex items-center gap-2">
                      {criterion.name}
                      {criterion.is_essential && (
                        <Badge variant="destructive" className="text-xs">Required</Badge>
                      )}
                    </Label>
                    {criterion.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {criterion.description}
                      </p>
                    )}
                  </div>

                  {criterion.linked_questions.length > 0 && (
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        Questions to explore:
                      </p>
                      <ul className="text-sm space-y-1">
                        {criterion.linked_questions.map((q, qIdx) => (
                          <li key={qIdx} className="text-foreground">• {q}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Score (1-5)</Label>
                    <RadioGroup
                      value={responses[criterion.id]?.toString() || ''}
                      onValueChange={(value) => handleRatingChange(criterion.id, parseInt(value))}
                      disabled={readonly}
                      className="flex gap-4"
                    >
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <div key={rating} className="flex items-center space-x-2">
                          <RadioGroupItem 
                            value={rating.toString()} 
                            id={`${criterion.id}_${rating}`} 
                          />
                          <Label htmlFor={`${criterion.id}_${rating}`} className="cursor-pointer">
                            {rating}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Notes (optional)</Label>
                    <Textarea
                      value={notes[criterion.id] || ''}
                      onChange={(e) => handleNoteChange(criterion.id, e.target.value)}
                      disabled={readonly}
                      placeholder="Add any observations or comments..."
                      rows={2}
                      className="text-sm"
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}

      <Card>
        <CardHeader>
          <CardTitle>Overall Assessment & Recommendation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Calculated Overall Score</p>
              <p className="text-2xl font-bold">{overallPercentage}%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Mark out of 100</p>
              <p className="text-2xl font-bold">{overallPercentage}</p>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Override Overall Rating (optional)</Label>
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
            <p className="text-xs text-muted-foreground">
              Leave empty to use calculated score ({Math.round((overallPercentage / 100) * 5)}/5)
            </p>
          </div>

          <div className="space-y-2">
            <Label>Final Recommendation *</Label>
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
              disabled={submitting || !recommendation}
              className="w-full"
              size="lg"
            >
              {submitting ? 'Submitting...' : 'Submit Feedback'}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};