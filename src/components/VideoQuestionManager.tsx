import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Edit, Save, X, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface VideoQuestion {
  id: string;
  text: string;
  prep_and_read_secs: number;
  answer_secs: number;
  allow_retakes: boolean;
  max_retakes: number;
}

interface VideoQuestionSet {
  id: string;
  name: string;
  job_id: string;
  questions: VideoQuestion[];
  prep_and_read_secs: number;
  answer_secs: number;
  allow_retakes: boolean;
  max_retakes: number;
}

interface VideoQuestionManagerProps {
  jobId: string;
}

export const VideoQuestionManager: React.FC<VideoQuestionManagerProps> = ({ jobId }) => {
  const [questionSet, setQuestionSet] = useState<VideoQuestionSet | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadQuestionSet();
  }, [jobId]);

  const loadQuestionSet = async () => {
    // Don't load if jobId is temp or invalid
    if (!jobId || jobId === 'temp-job-id') {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error} = await supabase
        .from('video_question_sets')
        .select('*')
        .eq('job_id', jobId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setQuestionSet({
          ...data,
          questions: (data.questions as any as VideoQuestion[]) || []
        });
      }
    } catch (error) {
      console.error('Error loading question set:', error);
      toast({
        title: "Error",
        description: "Failed to load video questions",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createQuestionSet = () => {
    setQuestionSet({
      id: '',
      name: 'Video Interview Questions',
      job_id: jobId,
      questions: [],
      prep_and_read_secs: 60,
      answer_secs: 180,
      allow_retakes: false,
      max_retakes: 1
    });
    setIsEditing(true);
  };

  const addQuestion = () => {
    if (!questionSet) return;
    
    const newQuestion: VideoQuestion = {
      id: `temp-${Date.now()}`,
      text: '',
      prep_and_read_secs: questionSet.prep_and_read_secs,
      answer_secs: questionSet.answer_secs,
      allow_retakes: questionSet.allow_retakes,
      max_retakes: questionSet.max_retakes
    };

    setQuestionSet({
      ...questionSet,
      questions: [...questionSet.questions, newQuestion]
    });
  };

  const removeQuestion = (questionId: string) => {
    if (!questionSet) return;
    
    setQuestionSet({
      ...questionSet,
      questions: questionSet.questions.filter(q => q.id !== questionId)
    });
  };

  const updateQuestion = (questionId: string, updates: Partial<VideoQuestion>) => {
    if (!questionSet) return;
    
    setQuestionSet({
      ...questionSet,
      questions: questionSet.questions.map(q => 
        q.id === questionId ? { ...q, ...updates } : q
      )
    });
  };

  const saveQuestionSet = async () => {
    if (!questionSet) return;

    // Validate jobId
    if (!jobId || jobId === 'temp-job-id') {
      toast({
        title: "Error",
        description: "Please save the job first before adding video questions",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      
      const questionSetData = {
        name: questionSet.name,
        job_id: jobId,
        questions: questionSet.questions as any,
        prep_and_read_secs: questionSet.prep_and_read_secs,
        answer_secs: questionSet.answer_secs,
        allow_retakes: questionSet.allow_retakes,
        max_retakes: questionSet.max_retakes
      };

      if (questionSet.id) {
        const { error } = await supabase
          .from('video_question_sets')
          .update(questionSetData)
          .eq('id', questionSet.id);
        
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('video_question_sets')
          .insert(questionSetData)
          .select()
          .single();
        
        if (error) throw error;
        setQuestionSet({ ...questionSet, id: data.id });
      }

      setIsEditing(false);
      toast({
        title: "Success",
        description: "Video questions saved successfully",
      });
    } catch (error) {
      console.error('Error saving question set:', error);
      toast({
        title: "Error",
        description: "Failed to save video questions",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading video questions...</div>
        </CardContent>
      </Card>
    );
  }

  if (!questionSet && !isEditing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Video Interview Questions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              No video questions configured for this job.
            </p>
            <Button onClick={createQuestionSet}>
              <Plus className="w-4 h-4 mr-2" />
              Create Video Questions
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={isEditing ? "border-primary" : ""}>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Video Interview Questions</CardTitle>
          {isEditing && (
            <p className="text-sm text-muted-foreground mt-1">
              <AlertTriangle className="w-4 h-4 inline mr-1 text-yellow-500" />
              Don't forget to click "Save" before leaving this page
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button onClick={saveQuestionSet} size="sm" className="bg-primary">
                <Save className="w-4 h-4 mr-2" />
                Save Video Questions
              </Button>
              <Button 
                onClick={() => setIsEditing(false)} 
                variant="outline" 
                size="sm"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)} size="sm">
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {isEditing && (
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
            <div>
              <Label htmlFor="name">Question Set Name</Label>
              <Input
                id="name"
                value={questionSet?.name || ''}
                onChange={(e) => setQuestionSet(prev => prev ? { ...prev, name: e.target.value } : null)}
              />
            </div>
            <div>
              <Label htmlFor="prep_and_read_secs">Reading & Preparation Time (seconds)</Label>
              <Input
                id="prep_and_read_secs"
                type="number"
                min="10"
                max="300"
                value={questionSet?.prep_and_read_secs || 60}
                onChange={(e) => setQuestionSet(prev => prev ? { ...prev, prep_and_read_secs: parseInt(e.target.value) } : null)}
              />
            </div>
            <div>
              <Label htmlFor="answer_secs">Default Answer Time (seconds)</Label>
              <Input
                id="answer_secs"
                type="number"
                min="30"
                max="600"
                value={questionSet?.answer_secs || 180}
                onChange={(e) => setQuestionSet(prev => prev ? { ...prev, answer_secs: parseInt(e.target.value) } : null)}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="allow_retakes"
                checked={questionSet?.allow_retakes || false}
                onCheckedChange={(checked) => setQuestionSet(prev => prev ? { ...prev, allow_retakes: checked } : null)}
              />
              <Label htmlFor="allow_retakes">Allow Retakes</Label>
            </div>
            {questionSet?.allow_retakes && (
              <div>
                <Label htmlFor="max_retakes">Max Retakes</Label>
                <Input
                  id="max_retakes"
                  type="number"
                  min="1"
                  max="5"
                  value={questionSet?.max_retakes || 1}
                  onChange={(e) => setQuestionSet(prev => prev ? { ...prev, max_retakes: parseInt(e.target.value) } : null)}
                />
              </div>
            )}
          </div>
        )}

        <div className="space-y-4">
          {questionSet?.questions.map((question, index) => (
            <Card key={question.id} className="border-l-4 border-l-primary">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Question {index + 1}</Badge>
                      {isEditing && (
                        <Button
                          onClick={() => removeQuestion(question.id)}
                          size="sm"
                          variant="destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    
                    {isEditing ? (
                      <Textarea
                        placeholder="Enter your question..."
                        value={question.text}
                        onChange={(e) => updateQuestion(question.id, { text: e.target.value })}
                        className="min-h-[80px]"
                      />
                    ) : (
                      <p className="text-foreground">{question.text}</p>
                    )}

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Reading & Prep:</span> {question.prep_and_read_secs}s
                      </div>
                      <div>
                        <span className="font-medium">Answer:</span> {question.answer_secs}s
                      </div>
                    </div>

                    {question.allow_retakes && (
                      <div className="text-sm">
                        <span className="font-medium">Retakes:</span> Up to {question.max_retakes}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {isEditing && (
            <Button onClick={addQuestion} variant="outline" className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Add Question
            </Button>
          )}
        </div>

        {!isEditing && questionSet?.questions.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No questions added yet.
          </div>
        )}
      </CardContent>
    </Card>
  );
};