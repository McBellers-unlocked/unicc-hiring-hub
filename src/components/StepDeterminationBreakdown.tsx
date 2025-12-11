import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowRight, 
  GraduationCap, 
  Briefcase, 
  Calculator,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { type StepCalculationResult } from '@/lib/stepDetermination';
import { type EducationLevel, getEducationLevel } from '@/lib/educationUtils';

interface Props {
  calculation: StepCalculationResult;
  essentialEducationLevel: EducationLevel;
  essentialExperienceYears: number;
  totalExperience: number;
}

export default function StepDeterminationBreakdown({
  calculation,
  essentialEducationLevel,
  essentialExperienceYears,
  totalExperience
}: Props) {
  const additionalYears = Math.max(0, totalExperience - essentialExperienceYears);
  const maxSteps = 5; // Maximum additional steps (steps 2-6)
  const additionalSteps = calculation.calculatedStep - 1;
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Step Calculation Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Visual Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress to Maximum Step</span>
            <span className="font-medium">{additionalSteps} of {maxSteps} additional steps</span>
          </div>
          <Progress value={(additionalSteps / maxSteps) * 100} className="h-3" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Step 1 (Base)</span>
            <span>Step 6 (Maximum)</span>
          </div>
        </div>

        {/* Step-by-step breakdown */}
        <div className="space-y-4">
          {/* Base Step */}
          <div className="flex items-start gap-4 p-3 rounded-lg bg-muted/50">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
              1
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">Base Step</span>
                <Badge variant="secondary">+1</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Starting point for all external candidates entering UN service
              </p>
            </div>
          </div>

          {/* Education Step */}
          <div className="flex items-start gap-4 p-3 rounded-lg bg-muted/50">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
              calculation.educationStep > 0 
                ? 'bg-green-600 text-white' 
                : 'bg-muted-foreground/20 text-muted-foreground'
            }`}>
              {calculation.educationStep > 0 ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Education Step</span>
                <Badge variant={calculation.educationStep > 0 ? "default" : "outline"}>
                  +{calculation.educationStep}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {calculation.educationStepJustification}
              </p>
              <div className="flex items-center gap-2 mt-2 text-xs">
                <span className="text-muted-foreground">Required:</span>
                <Badge variant="outline">{essentialEducationLevel}</Badge>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">Higher degree = +1 step (WHED verified)</span>
              </div>
            </div>
          </div>

          {/* Experience Steps */}
          <div className="flex items-start gap-4 p-3 rounded-lg bg-muted/50">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
              calculation.experienceSteps > 0 
                ? 'bg-blue-600 text-white' 
                : 'bg-muted-foreground/20 text-muted-foreground'
            }`}>
              {calculation.experienceSteps > 0 ? calculation.experienceSteps : <XCircle className="h-4 w-4" />}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Experience Steps</span>
                <Badge variant={calculation.experienceSteps > 0 ? "default" : "outline"}>
                  +{calculation.experienceSteps}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {calculation.experienceStepsJustification}
              </p>
              <div className="mt-2 space-y-1">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Required:</span>
                  <Badge variant="outline">{essentialExperienceYears} years</Badge>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Candidate has:</span>
                  <Badge variant="outline">{totalExperience.toFixed(1)} years</Badge>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Additional:</span>
                  <Badge variant={additionalYears > 0 ? "secondary" : "outline"}>
                    {additionalYears.toFixed(1)} years
                  </Badge>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    ÷ 3 = {calculation.experienceSteps} step(s)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Formula Summary */}
        <div className="p-4 rounded-lg border-2 border-primary/20 bg-primary/5">
          <div className="flex items-center justify-center gap-3 text-lg font-mono">
            <span className="flex items-center gap-1">
              <span className="text-muted-foreground text-sm">Base</span>
              <span className="font-bold">{calculation.baseStep}</span>
            </span>
            <span className="text-muted-foreground">+</span>
            <span className="flex items-center gap-1">
              <span className="text-muted-foreground text-sm">Edu</span>
              <span className="font-bold">{calculation.educationStep}</span>
            </span>
            <span className="text-muted-foreground">+</span>
            <span className="flex items-center gap-1">
              <span className="text-muted-foreground text-sm">Exp</span>
              <span className="font-bold">{calculation.experienceSteps}</span>
            </span>
            <span className="text-muted-foreground">=</span>
            <span className="text-primary font-bold text-2xl">
              Step {calculation.calculatedStep}
            </span>
          </div>
          {calculation.calculatedStep === 6 && (
            <p className="text-center text-xs text-muted-foreground mt-2">
              (Maximum step reached)
            </p>
          )}
        </div>

        {/* Policy Reference */}
        <p className="text-xs text-muted-foreground text-center">
          Calculated per UN Staff Rule 420.4 — External candidates may receive up to 5 additional steps 
          for qualifications and experience exceeding essential requirements.
        </p>
      </CardContent>
    </Card>
  );
}
