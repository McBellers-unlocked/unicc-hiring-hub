import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { JobFormData } from '@/pages/JobWizard';
import { useToast } from '@/hooks/use-toast';
import { RequirementsList, Requirement } from './RequirementsList';
import { CompetenciesList, Competency } from './CompetenciesList';
import { LanguageRequirementsList, LanguageRequirement } from './LanguageRequirementsList';

interface Props {
  data: JobFormData;
  onUpdate: (data: Partial<JobFormData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

export function JobWizardStep3({ data, onUpdate, onNext, onPrev }: Props) {
  const { toast } = useToast();
  
  // Determine if this is a converted requisition (read-only mode)
  // Jobs converted from requisitions already have approved requirements
  const isConvertedRequisition = Boolean(
    data.structuredRequirements?.essentialCriteria?.length ||
    data.structuredRequirements?.essentialEducation?.length ||
    data.structuredRequirements?.competencies?.length
  );
  
  // State for structured requirements
  const [essentialCriteria, setEssentialCriteria] = useState<Requirement[]>([]);
  const [desirableCriteria, setDesirableCriteria] = useState<Requirement[]>([]);
  const [essentialEducation, setEssentialEducation] = useState<Requirement[]>([]);
  const [desirableEducation, setDesirableEducation] = useState<Requirement[]>([]);
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [languages, setLanguages] = useState<LanguageRequirement[]>([]);

  // Load any existing structured data from job data
  useEffect(() => {
    if (data.structuredRequirements) {
      setEssentialCriteria(data.structuredRequirements.essentialCriteria || []);
      setDesirableCriteria(data.structuredRequirements.desirableCriteria || []);
      setEssentialEducation(data.structuredRequirements.essentialEducation || []);
      setDesirableEducation(data.structuredRequirements.desirableEducation || []);
      setCompetencies(data.structuredRequirements.competencies || []);
      setLanguages(data.structuredRequirements.languages || []);
    }
  }, []);

  // Update parent form data whenever structured data changes
  useEffect(() => {
    onUpdate({
      structuredRequirements: {
        essentialCriteria,
        desirableCriteria,
        essentialEducation,
        desirableEducation,
        competencies,
        languages
      }
    });
  }, [essentialCriteria, desirableCriteria, essentialEducation, desirableEducation, competencies, languages]);

  const validateAndProceed = () => {
    // Check if at least some requirements are defined
    const hasRequirements = 
      essentialCriteria.length > 0 ||
      essentialEducation.length > 0 ||
      competencies.length > 0;

    if (!hasRequirements) {
      toast({
        title: "Validation Error",
        description: "Please add at least one Essential Criterion, Essential Education requirement, or Competency before proceeding",
        variant: "destructive",
      });
      return;
    }

    // Validate that all requirements have titles
    const allRequirements = [
      ...essentialCriteria,
      ...desirableCriteria,
      ...essentialEducation,
      ...desirableEducation
    ];

    const missingTitles = allRequirements.filter(req => !req.title.trim());
    if (missingTitles.length > 0) {
      toast({
        title: "Validation Error",
        description: "All requirements must have a title",
        variant: "destructive",
      });
      return;
    }

    // Validate competencies have names
    const missingCompNames = competencies.filter(comp => !comp.competency_name.trim());
    if (missingCompNames.length > 0) {
      toast({
        title: "Validation Error",
        description: "All competencies must have a name",
        variant: "destructive",
      });
      return;
    }

    onNext();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 3: Requirements & Competencies</CardTitle>
        <p className="text-muted-foreground">
          {isConvertedRequisition 
            ? 'These requirements were approved at the Position Description phase and are displayed for review.'
            : 'Define the structured requirements, education, competencies, and language proficiency needed for this position. These will be used for candidate screening, interview questions, and scoring.'
          }
        </p>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Show approval notice once at the top for converted requisitions */}
        {isConvertedRequisition && (
          <div className="bg-muted/50 border border-border rounded-lg p-3 text-sm text-muted-foreground">
            <p className="font-medium">📋 Approved at PD Phase</p>
            <p className="text-xs mt-1">These requirements were approved during the Position Description phase and are displayed as reference.</p>
          </div>
        )}
        {/* Essential Criteria */}
        <RequirementsList
          requirements={essentialCriteria}
          onChange={setEssentialCriteria}
          title="Essential Criteria"
          category="Essential Criteria"
          readOnly={isConvertedRequisition}
        />

        {/* Desirable Criteria */}
        <RequirementsList
          requirements={desirableCriteria}
          onChange={setDesirableCriteria}
          title="Desirable Criteria"
          category="Desirable Criteria"
          readOnly={isConvertedRequisition}
        />

        <div className="border-t pt-6" />

        {/* Essential Education */}
        <RequirementsList
          requirements={essentialEducation}
          onChange={setEssentialEducation}
          title="Essential Education"
          category="Essential Education"
          readOnly={isConvertedRequisition}
        />

        {/* Desirable Education */}
        <RequirementsList
          requirements={desirableEducation}
          onChange={setDesirableEducation}
          title="Desirable Education"
          category="Desirable Education"
          readOnly={isConvertedRequisition}
        />

        <div className="border-t pt-6" />

        {/* Competencies */}
        <CompetenciesList
          competencies={competencies}
          onChange={setCompetencies}
          readOnly={isConvertedRequisition}
        />

        <div className="border-t pt-6" />

        {/* Language Requirements */}
        <LanguageRequirementsList
          languages={languages}
          onChange={setLanguages}
          readOnly={isConvertedRequisition}
        />

        {/* Navigation */}
        <div className="flex justify-between pt-6 border-t">
          <Button variant="outline" onClick={onPrev}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous: Job Description
          </Button>
          <Button onClick={validateAndProceed}>
            Next: Killer Questions
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
