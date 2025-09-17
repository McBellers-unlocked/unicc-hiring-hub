import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
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

export function JobWizardStep2({ data, onUpdate, onNext, onPrev }: Props) {
  const { toast } = useToast();
  const [descriptionContent, setDescriptionContent] = useState(data.description_md || '');

  const updateField = (field: keyof JobFormData, value: any) => {
    onUpdate({ [field]: value });
  };

  const handleDescriptionChange = (value: string | undefined) => {
    const content = value || '';
    setDescriptionContent(content);
    updateField('description_md', content);
  };

  const validateAndProceed = () => {
    if (!descriptionContent.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide a job description before proceeding",
        variant: "destructive",
      });
      return;
    }

    onNext();
  };

  const descriptionTemplate = `# Purpose of the Position

Describe the main purpose and role of this position within the organization.

# Objectives of the Programme

Outline the key objectives and goals this position will contribute to.

# Main Duties and Responsibilities

- List the primary responsibilities
- Detail key tasks and duties
- Include any special requirements`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 2: Job Description</CardTitle>
        <p className="text-muted-foreground">
          Create a comprehensive job description using markdown
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium">Position Description</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDescriptionChange(descriptionTemplate)}
            >
              Use Template
            </Button>
          </div>
          <div className="border rounded-lg overflow-hidden">
            <MDEditor
              value={descriptionContent}
              onChange={handleDescriptionChange}
              height={400}
              preview="edit"
              data-color-mode="light"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Include: Purpose, Objectives, Main Duties, and Other Information
          </p>
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-6">
          <Button variant="outline" onClick={onPrev}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous: Basics & Meta
          </Button>
          <Button onClick={validateAndProceed}>
            Next: Requirements
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}