import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { JobFormData } from '@/pages/JobWizard';
import { useToast } from '@/hooks/use-toast';
import MDEditor from '@uiw/react-md-editor';
import ReactMarkdown from 'react-markdown';
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
  const [languageContent, setLanguageContent] = useState(data.language_requirements || '');
  const [competenciesContent, setCompetenciesContent] = useState(data.competencies || '');

  const updateField = (field: keyof JobFormData, value: any) => {
    onUpdate({ [field]: value });
  };

  const handleRequirementsChange = (value: string | undefined) => {
    const content = value || '';
    setRequirementsContent(content);
    updateField('requirements_md', content);
  };

  const handleLanguageChange = (value: string | undefined) => {
    const content = value || '';
    setLanguageContent(content);
    updateField('language_requirements', content);
  };

  const handleCompetenciesChange = (value: string | undefined) => {
    const content = value || '';
    setCompetenciesContent(content);
    updateField('competencies', content);
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

# Desirable Experience

- Additional experience that would be beneficial
- Nice-to-have skills

# Desirable Education

- Additional qualifications that would be advantageous`;

  const languageTemplate = `# Language Requirements

- English: Expert knowledge is required
- French: Working knowledge is desirable
- Spanish: Basic knowledge is an advantage`;

  const competenciesTemplate = `# Core Competencies

- Communication
- Teamwork and Collaboration
- Problem Solving

# Leadership Competencies

- Leading People
- Strategic Thinking
- Change Management

# Technical Competencies

- Relevant technical skills for the position`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 3: Requirements</CardTitle>
        <p className="text-muted-foreground">
          Define the essential and desirable requirements for this position
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Requirements Section */}
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
              height={300}
              preview="edit"
              data-color-mode="light"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Include: Essential Experience, Essential Education, Desirable Experience, Desirable Education
          </p>
        </div>

        {/* Language Requirements Section */}
        <div className="space-y-4">
          <Label className="text-base font-medium">Language Requirements</Label>
          {languageContent ? (
            <div className="p-4 bg-muted/20 rounded-lg">
              <ReactMarkdown 
                components={{
                  h1: ({ children }) => <h1 className="text-base font-semibold mb-2 underline">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-sm font-semibold mb-1 underline">{children}</h2>,
                  ul: ({ children }) => <ul className="list-disc ml-4 space-y-1">{children}</ul>,
                  li: ({ children }) => <li className="text-sm">{children}</li>,
                  p: ({ children }) => <p className="mb-2 text-sm">{children}</p>,
                  strong: ({ children }) => <strong className="font-semibold">{children}</strong>
                }}
              >
                {languageContent}
              </ReactMarkdown>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm italic p-4 border rounded-lg">
              No language requirements specified
            </p>
          )}
        </div>

        {/* Competencies Section */}
        <div className="space-y-4">
          <Label className="text-base font-medium">Competencies</Label>
          {competenciesContent ? (
            <div className="p-4 bg-muted/20 rounded-lg">
              <ReactMarkdown 
                components={{
                  h1: ({ children }) => <h1 className="text-base font-semibold mb-2 underline">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-sm font-semibold mb-1 underline">{children}</h2>,
                  ul: ({ children }) => <ul className="list-disc ml-4 space-y-1">{children}</ul>,
                  li: ({ children }) => <li className="text-sm">{children}</li>,
                  p: ({ children }) => <p className="mb-2 text-sm">{children}</p>,
                  strong: ({ children }) => <strong className="font-semibold">{children}</strong>
                }}
              >
                {competenciesContent}
              </ReactMarkdown>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm italic p-4 border rounded-lg">
              No competencies specified
            </p>
          )}
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