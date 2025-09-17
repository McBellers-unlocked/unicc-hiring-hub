import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { JobFormData } from '@/pages/JobWizard';
import { useToast } from '@/hooks/use-toast';
import MDEditor from '@uiw/react-md-editor';
import '@uiw/react-md-editor/markdown-editor.css';

interface Props {
  data: JobFormData;
  onUpdate: (data: Partial<JobFormData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

export function JobWizardStep3({ data, onUpdate, onNext, onPrev }: Props) {
  const { toast } = useToast();
  const [requirementsContent, setRequirementsContent] = useState(data.requirements_md || '');

  const updateField = (field: keyof JobFormData, value: any) => {
    onUpdate({ [field]: value });
  };

  const handleRequirementsChange = (value: string | undefined) => {
    const content = value || '';
    setRequirementsContent(content);
    updateField('requirements_md', content);
  };

  const validateAndProceed = () => {
    if (!requirementsContent.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide job requirements before proceeding",
        variant: "destructive",
      });
      return;
    }

    onNext();
  };

  const requirementsTemplate = `# Essential Experience

- Minimum X years of relevant experience
- Specific technical skills required
- Industry knowledge needed

# Essential Education

- Required degree level and field
- Professional certifications
- Language requirements

# Desirable Experience

- Additional experience that would be beneficial
- Nice-to-have skills

# Desirable Education

- Additional qualifications that would be advantageous`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 3: Requirements</CardTitle>
        <p className="text-muted-foreground">
          Define the essential and desirable requirements for this position
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium">Requirements</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleRequirementsChange(requirementsTemplate)}
            >
              Use Template
            </Button>
          </div>
          <div className="border rounded-lg overflow-hidden">
            <MDEditor
              value={requirementsContent}
              onChange={handleRequirementsChange}
              height={400}
              preview="edit"
              data-color-mode="light"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Include: Essential Experience, Essential Education, Desirable Experience, Desirable Education, Language Requirements
          </p>
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-6">
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