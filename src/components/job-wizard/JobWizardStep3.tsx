import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { JobFormData } from '@/pages/JobWizard';
import { useToast } from '@/hooks/use-toast';

interface Props {
  data: JobFormData;
  onUpdate: (data: Partial<JobFormData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

interface EssentialCriterion {
  id: string;
  label: string;
  weight: number;
  must_have: boolean;
  validator: string;
  params: Record<string, any>;
}

const VALIDATORS = [
  { value: 'years_experience', label: 'Years of Experience' },
  { value: 'education_level', label: 'Education Level' },
  { value: 'certification', label: 'Certification Required' },
  { value: 'language_proficiency', label: 'Language Proficiency' },
  { value: 'skill_level', label: 'Skill Level' },
  { value: 'custom', label: 'Custom Validator' },
];

export function JobWizardStep3({ data, onUpdate, onNext, onPrev }: Props) {
  const { toast } = useToast();
  const [criteria, setCriteria] = useState<EssentialCriterion[]>(
    data.essential_criteria || []
  );

  const totalWeight = criteria.reduce((sum, criterion) => sum + criterion.weight, 0);
  const canProceed = totalWeight === 100;

  const addCriterion = () => {
    const newCriterion: EssentialCriterion = {
      id: `criterion-${Date.now()}`,
      label: '',
      weight: 0,
      must_have: false,
      validator: '',
      params: {},
    };
    setCriteria([...criteria, newCriterion]);
  };

  const removeCriterion = (id: string) => {
    setCriteria(criteria.filter(c => c.id !== id));
  };

  const updateCriterion = (id: string, field: keyof EssentialCriterion, value: any) => {
    setCriteria(criteria.map(c => 
      c.id === id ? { ...c, [field]: value } : c
    ));
  };

  const distributeWeights = () => {
    if (criteria.length === 0) return;
    
    const baseWeight = Math.floor(100 / criteria.length);
    const remainder = 100 % criteria.length;
    
    setCriteria(criteria.map((criterion, index) => ({
      ...criterion,
      weight: baseWeight + (index < remainder ? 1 : 0)
    })));
  };

  useEffect(() => {
    onUpdate({ essential_criteria: criteria });
  }, [criteria]); // Remove onUpdate from dependency array to prevent infinite loop

  const validateAndProceed = () => {
    if (criteria.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please add at least one essential criterion",
        variant: "destructive",
      });
      return;
    }

    const invalidCriteria = criteria.filter(c => !c.label.trim() || c.weight <= 0);
    if (invalidCriteria.length > 0) {
      toast({
        title: "Validation Error",
        description: "All criteria must have a label and weight greater than 0",
        variant: "destructive",
      });
      return;
    }

    if (totalWeight !== 100) {
      toast({
        title: "Validation Error",
        description: "Total weight must equal 100 before proceeding",
        variant: "destructive",
      });
      return;
    }

    onNext();
  };

  const getProgressColor = () => {
    if (totalWeight === 100) return 'bg-primary';
    if (totalWeight > 100) return 'bg-destructive';
    return 'bg-accent';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 3: Essential Criteria</CardTitle>
        <p className="text-muted-foreground">
          Define scoring criteria with weights that total 100%
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Ring */}
        <Card className={`border-2 ${canProceed ? 'border-primary' : totalWeight > 100 ? 'border-destructive' : 'border-accent'}`}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Weight Distribution</h3>
                <p className="text-sm text-muted-foreground">
                  Total must equal 100 to proceed
                </p>
              </div>
              <div className="text-center">
                <div className="relative w-20 h-20">
                  <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      className="text-muted"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray={`${Math.min(totalWeight, 100) * 2.51} 251`}
                      className={
                        totalWeight === 100 
                          ? 'text-primary' 
                          : totalWeight > 100 
                          ? 'text-destructive' 
                          : 'text-accent'
                      }
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-lg font-bold ${
                      totalWeight === 100 
                        ? 'text-primary' 
                        : totalWeight > 100 
                        ? 'text-destructive' 
                        : 'text-accent'
                    }`}>
                      {totalWeight}
                    </span>
                  </div>
                </div>
                {totalWeight > 100 && (
                  <div className="flex items-center mt-2 text-destructive">
                    <AlertTriangle className="w-4 h-4 mr-1" />
                    <span className="text-xs">Over 100%</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Criteria List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Essential Criteria</h3>
            <div className="space-x-2">
              <Button variant="outline" onClick={distributeWeights} disabled={criteria.length === 0}>
                Auto-distribute Weights
              </Button>
              <Button onClick={addCriterion}>
                <Plus className="w-4 h-4 mr-2" />
                Add Criterion
              </Button>
            </div>
          </div>

          {criteria.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No criteria added yet</p>
                  <Button onClick={addCriterion} className="mt-4">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Criterion
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            criteria.map((criterion) => (
              <Card key={criterion.id}>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    {/* Label */}
                    <div className="md:col-span-4 space-y-2">
                      <Label>Criterion Label</Label>
                      <Input
                        value={criterion.label}
                        onChange={(e) => updateCriterion(criterion.id, 'label', e.target.value)}
                        placeholder="e.g., Software Development Experience"
                      />
                    </div>

                    {/* Weight */}
                    <div className="md:col-span-2 space-y-2">
                      <Label>Weight (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={criterion.weight}
                        onChange={(e) => updateCriterion(criterion.id, 'weight', parseInt(e.target.value) || 0)}
                      />
                    </div>

                    {/* Must Have */}
                    <div className="md:col-span-2 space-y-2">
                      <Label>Must Have</Label>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={criterion.must_have}
                          onCheckedChange={(checked) => updateCriterion(criterion.id, 'must_have', checked)}
                        />
                        <span className="text-sm text-muted-foreground">Required</span>
                      </div>
                    </div>

                    {/* Validator */}
                    <div className="md:col-span-3 space-y-2">
                      <Label>Validator</Label>
                      <Select
                        value={criterion.validator}
                        onValueChange={(value) => updateCriterion(criterion.id, 'validator', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select validator" />
                        </SelectTrigger>
                        <SelectContent>
                          {VALIDATORS.map((validator) => (
                            <SelectItem key={validator.value} value={validator.value}>
                              {validator.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Remove */}
                    <div className="md:col-span-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCriterion(criterion.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Validator Parameters */}
                  {criterion.validator && (
                    <div className="mt-4 p-4 bg-muted rounded-lg">
                      <Label className="text-sm font-medium">Validator Parameters</Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Configure parameters for the {VALIDATORS.find(v => v.value === criterion.validator)?.label} validator
                      </p>
                      {/* TODO: Add specific parameter inputs based on validator type */}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-6">
          <Button variant="outline" onClick={onPrev}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous: Description & Requirements
          </Button>
          <Button onClick={validateAndProceed} disabled={!canProceed}>
            Next: Killer Questions
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}