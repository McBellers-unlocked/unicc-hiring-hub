import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, ArrowRight, Plus, Trash2 } from 'lucide-react';
import { JobFormData } from '@/pages/JobWizard';
import { useToast } from '@/hooks/use-toast';

interface Props {
  data: JobFormData;
  onUpdate: (data: Partial<JobFormData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

interface KillerQuestion {
  id: string;
  label: string;
  input_type: 'boolean' | 'single' | 'multi' | 'text';
  rule: 'yes_required' | 'no_required' | 'custom';
  options: Record<string, any>;
  custom_logic: Record<string, any>;
}

export function JobWizardStep4({ data, onUpdate, onNext, onPrev }: Props) {
  const { toast } = useToast();
  const [questions, setQuestions] = useState<KillerQuestion[]>(
    data.killer_questions || []
  );

  const addQuestion = () => {
    const newQuestion: KillerQuestion = {
      id: `question-${Date.now()}`,
      label: '',
      input_type: 'boolean',
      rule: 'yes_required',
      options: {},
      custom_logic: {},
    };
    setQuestions([...questions, newQuestion]);
  };

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const updateQuestion = (id: string, field: keyof KillerQuestion, value: any) => {
    setQuestions(questions.map(q => 
      q.id === id ? { ...q, [field]: value } : q
    ));
  };

  useEffect(() => {
    onUpdate({ killer_questions: questions });
  }, [questions]);

  const validateAndProceed = () => {
    const invalidQuestions = questions.filter(q => !q.label.trim());
    if (invalidQuestions.length > 0) {
      toast({
        title: "Validation Error",
        description: "All questions must have a label",
        variant: "destructive",
      });
      return;
    }

    onNext();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 4: Killer Questions</CardTitle>
        <p className="text-muted-foreground">
          Create screening questions to automatically filter candidates
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Killer Questions</h3>
            <Button onClick={addQuestion}>
              <Plus className="w-4 h-4 mr-2" />
              Add Question
            </Button>
          </div>

          {questions.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No questions added yet</p>
                  <Button onClick={addQuestion} className="mt-4">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Question
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            questions.map((question) => (
              <Card key={question.id}>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    <div className="md:col-span-6 space-y-2">
                      <Label>Question</Label>
                      <Input
                        value={question.label}
                        onChange={(e) => updateQuestion(question.id, 'label', e.target.value)}
                        placeholder="e.g., Do you have 5+ years of experience?"
                      />
                    </div>

                    <div className="md:col-span-2 space-y-2">
                      <Label>Type</Label>
                      <Select
                        value={question.input_type}
                        onValueChange={(value) => updateQuestion(question.id, 'input_type', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="boolean">Yes/No</SelectItem>
                          <SelectItem value="single">Single Choice</SelectItem>
                          <SelectItem value="multi">Multiple Choice</SelectItem>
                          <SelectItem value="text">Text Input</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="md:col-span-3 space-y-2">
                      <Label>Rule</Label>
                      <Select
                        value={question.rule}
                        onValueChange={(value) => updateQuestion(question.id, 'rule', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="yes_required">Yes Required</SelectItem>
                          <SelectItem value="no_required">No Required</SelectItem>
                          <SelectItem value="custom">Custom Logic</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="md:col-span-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeQuestion(question.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <div className="flex justify-between pt-6">
          <Button variant="outline" onClick={onPrev}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous: Requirements
          </Button>
          <Button onClick={validateAndProceed}>
            Next: Application Form
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}