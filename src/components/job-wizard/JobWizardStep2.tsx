import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, ArrowRight, Upload, FileText } from 'lucide-react';
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
  const [requirementsContent, setRequirementsContent] = useState(data.requirements_md || '');

  const updateField = (field: keyof JobFormData, value: any) => {
    const updated = { [field]: value };
    onUpdate(updated);
  };

  const handleDescriptionChange = (value: string | undefined) => {
    const content = value || '';
    setDescriptionContent(content);
    updateField('description_md', content);
  };

  const handleRequirementsChange = (value: string | undefined) => {
    const content = value || '';
    setRequirementsContent(content);
    updateField('requirements_md', content);
  };

  const handleImportDocument = () => {
    toast({
      title: "Import Feature",
      description: "Document import functionality will be implemented in a future update.",
    });
  };

  const validateAndProceed = () => {
    if (!descriptionContent.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide a job description",
        variant: "destructive",
      });
      return;
    }

    if (!requirementsContent.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide job requirements",
        variant: "destructive",
      });
      return;
    }

    onNext();
  };

  const descriptionTemplate = `# Position Description

## Purpose
[Describe the main purpose and objectives of this position]

## Main Duties and Responsibilities
- [Key responsibility 1]
- [Key responsibility 2]
- [Key responsibility 3]

## Other Information
[Additional information about the role, team, or working conditions]
`;

  const requirementsTemplate = `# Requirements

## Experience and Skills
- [Required experience 1]
- [Required skill 1]
- [Preferred experience/skill]

## Education
- [Minimum education requirement]
- [Preferred qualifications]

## Languages
- [Language requirements with proficiency levels]

## Core Competencies
- [Competency 1]
- [Competency 2]
- [Competency 3]
`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 2: Description & Requirements</CardTitle>
        <p className="text-muted-foreground">
          Create comprehensive job description and requirements using markdown
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Import Document Section */}
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium">Import from Document</span>
              </div>
              <Button variant="outline" onClick={handleImportDocument}>
                <Upload className="w-4 h-4 mr-2" />
                Import Document
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Upload a document or paste text to auto-split into description and requirements sections
            </p>
          </CardContent>
        </Card>

        <Tabs defaultValue="description" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="description">Job Description</TabsTrigger>
            <TabsTrigger value="requirements">Requirements</TabsTrigger>
          </TabsList>

          <TabsContent value="description" className="space-y-4">
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
          </TabsContent>

          <TabsContent value="requirements" className="space-y-4">
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
              Include: Experience/Skills, Education, Languages, and Core Competencies
            </p>
          </TabsContent>
        </Tabs>

        {/* Navigation */}
        <div className="flex justify-between pt-6">
          <Button variant="outline" onClick={onPrev}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous: Basics & Meta
          </Button>
          <Button onClick={validateAndProceed}>
            Next: Essential Criteria
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}