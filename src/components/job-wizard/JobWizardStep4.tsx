import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight, Plus, Trash2, AlertCircle, Lightbulb } from 'lucide-react';
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

const INPUT_TYPES = [
  { value: 'boolean', label: 'Yes/No Question' },
  { value: 'single', label: 'Single Choice' },
  { value: 'multi', label: 'Multiple Choice' },
  { value: 'text', label: 'Text Response' },
];

const RULES = [
  { value: 'yes_required', label: 'Must answer "Yes"' },
  { value: 'no_required', label: 'Must answer "No"' },
  { value: 'custom', label: 'Custom Rule' },
];

const SUGGESTED_QUESTIONS = [
  {
    label: "Do you have legal authorization to work in Switzerland?",
    input_type: 'boolean' as const,
    rule: 'yes_required' as const,
    must_have: true,
  },
  {
    label: "Do you have a valid university degree?",
    input_type: 'boolean' as const,
    rule: 'yes_required' as const,
    must_have: true,
  },
  {
    label: "Are you willing to relocate to Geneva?",
    input_type: 'boolean' as const,
    rule: 'yes_required' as const,
    must_have: false,
  },
];

export function JobWizardStep4({ data, onUpdate, onNext, onPrev }: Props) {
  const { toast } = useToast();
  const [questions, setQuestions] = useState<KillerQuestion[]>(
    data.killer_questions || []
  );
  const [showSuggestions, setShowSuggestions] = useState(false);

  const addQuestion = (template?: Partial<KillerQuestion>) => {
    const newQuestion: KillerQuestion = {
      id: `question-${Date.now()}`,
      label: template?.label || '',
      input_type: template?.input_type || 'boolean',
      rule: template?.rule || 'yes_required',
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

  const addOptionToQuestion = (questionId: string) => {
    const question = questions.find(q => q.id === questionId);
    if (!question) return;

    const options = question.options.choices || [];
    const newOption = `Option ${options.length + 1}`;
    
    updateQuestion(questionId, 'options', {
      ...question.options,
      choices: [...options, newOption],
    });
  };

  const updateOption = (questionId: string, optionIndex: number, value: string) => {
    const question = questions.find(q => q.id === questionId);
    if (!question) return;

    const choices = [...(question.options.choices || [])];
    choices[optionIndex] = value;
    
    updateQuestion(questionId, 'options', {
      ...question.options,
      choices,
    });
  };

  const removeOption = (questionId: string, optionIndex: number) => {
    const question = questions.find(q => q.id === questionId);
    if (!question) return;

    const choices = [...(question.options.choices || [])];
    choices.splice(optionIndex, 1);
    
    updateQuestion(questionId, 'options', {
      ...question.options,
      choices,
    });
  };

  const autoSuggestForMustHaves = () => {
    const mustHaveCriteria = data.essential_criteria?.filter(c => c.must_have) || [];
    const suggestions: Partial<KillerQuestion>[] = [];

    mustHaveCriteria.forEach(criterion => {
      suggestions.push({
        label: `Do you meet the requirement: ${criterion.label}?`,
        input_type: 'boolean',
        rule: 'yes_required',
      });
    });

    suggestions.forEach(suggestion => addQuestion(suggestion));
    
    if (suggestions.length > 0) {
      toast({
        title: "Questions Added",
        description: `Added ${suggestions.length} suggested questions based on must-have criteria`,
      });
    }
  };

  useEffect(() => {
    onUpdate({ killer_questions: questions });
  }, [questions, onUpdate]);

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

    const choiceQuestions = questions.filter(q => ['single', 'multi'].includes(q.input_type));
    const invalidChoiceQuestions = choiceQuestions.filter(q => 
      !q.options.choices || q.options.choices.length < 2
    );

    if (invalidChoiceQuestions.length > 0) {
      toast({
        title: "Validation Error",
        description: "Choice questions must have at least 2 options",
        variant: "destructive",
      });
      return;
    }

    onNext();
  };

  const getIneligibilityMessage = (question: KillerQuestion) => {
    switch (question.rule) {
      case 'yes_required':
        return 'Candidates who answer "No" will be marked as ineligible';
      case 'no_required':
        return 'Candidates who answer "Yes" will be marked as ineligible';
      case 'custom':
        return 'Custom rule will determine eligibility';
      default:
        return '';
    }
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
        {/* Auto-suggest section */}
        <Card className="bg-accent/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Lightbulb className="w-5 h-5 text-accent-foreground" />
                <span className="font-medium">Smart Suggestions</span>
              </div>
              <div className="space-x-2">
                <Button variant="outline" onClick={() => setShowSuggestions(!showSuggestions)}>
                  View Suggestions
                </Button>
                <Button variant="outline" onClick={autoSuggestForMustHaves}>
                  Auto-suggest for Must-haves
                </Button>
              </div>
            </div>
            
            {showSuggestions && (
              <div className="mt-4 space-y-2">
                <p className="text-sm text-muted-foreground">Common screening questions:</p>
                {SUGGESTED_QUESTIONS.map((suggestion, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-background rounded">
                    <span className="text-sm">{suggestion.label}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => addQuestion(suggestion)}
                    >
                      Add
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Questions List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Killer Questions</h3>
            <Button onClick={() => addQuestion()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Question
            </Button>
          </div>

          {questions.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No questions added yet</p>
                  <Button onClick={() => addQuestion()} className="mt-4">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Question
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            questions.map((question, index) => (
              <Card key={question.id}>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {/* Question Header */}
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">Question {index + 1}</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeQuestion(question.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Question Configuration */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Question Text</Label>
                        <Textarea
                          value={question.label}
                          onChange={(e) => updateQuestion(question.id, 'label', e.target.value)}
                          placeholder="Enter your screening question..."
                          rows={2}
                        />
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Input Type</Label>
                          <Select
                            value={question.input_type}
                            onValueChange={(value) => updateQuestion(question.id, 'input_type', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {INPUT_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Rule</Label>
                          <Select
                            value={question.rule}
                            onValueChange={(value) => updateQuestion(question.id, 'rule', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {RULES.map((rule) => (
                                <SelectItem key={rule.value} value={rule.value}>
                                  {rule.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Options for choice questions */}
                    {['single', 'multi'].includes(question.input_type) && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>Answer Options</Label>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => addOptionToQuestion(question.id)}
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Add Option
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {(question.options.choices || []).map((option: string, optionIndex: number) => (
                            <div key={optionIndex} className="flex items-center space-x-2">
                              <Input
                                value={option}
                                onChange={(e) => updateOption(question.id, optionIndex, e.target.value)}
                                placeholder={`Option ${optionIndex + 1}`}
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeOption(question.id, optionIndex)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Ineligibility Preview */}
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                      <div className="flex items-start space-x-2">
                        <AlertCircle className="w-4 h-4 text-destructive mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-destructive">Ineligibility Rule</p>
                          <p className="text-xs text-destructive/80 italic">
                            {getIneligibilityMessage(question)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-6">
          <Button variant="outline" onClick={onPrev}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous: Essential Criteria
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