import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { VideoQuestionManager } from '@/components/VideoQuestionManager';
import { ArrowLeft, ArrowRight, Plus, Trash2, FileText, Paperclip, Mail } from 'lucide-react';
import { JobFormData } from '@/pages/JobWizard';
import { useToast } from '@/hooks/use-toast';

interface Props {
  data: JobFormData;
  onUpdate: (data: Partial<JobFormData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

interface CustomField {
  id: string;
  label: string;
  type: string;
  required: boolean;
}

interface ConsentCheckbox {
  id: string;
  label: string;
  required: boolean;
}

const FIELD_TYPES = [
  { value: 'text', label: 'Short Text' },
  { value: 'textarea', label: 'Long Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Dropdown' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'file', label: 'File Upload' },
];

const FILE_TYPES = ['pdf', 'doc', 'docx'];

export function JobWizardStep5({ data, onUpdate, onNext, onPrev }: Props) {
  const { toast } = useToast();
  const [attachments, setAttachments] = useState(data.attachments_required || {
    motivation_letter: true,
    personal_history_form: true,
    cv: false,
  });
  const [customFields, setCustomFields] = useState<CustomField[]>(data.custom_fields || []);
  const [consentBoxes, setConsentBoxes] = useState<ConsentCheckbox[]>(data.consent_checkboxes || []);
  const [emailTemplate, setEmailTemplate] = useState('');

  const updateAttachment = (key: string, value: boolean) => {
    const updated = { ...attachments, [key]: value };
    setAttachments(updated);
    onUpdate({ attachments_required: updated });
  };

  const addCustomField = () => {
    const newField: CustomField = {
      id: `field-${Date.now()}`,
      label: '',
      type: 'text',
      required: false,
    };
    setCustomFields([...customFields, newField]);
  };

  const removeCustomField = (id: string) => {
    setCustomFields(customFields.filter(f => f.id !== id));
  };

  const updateCustomField = (id: string, field: keyof CustomField, value: any) => {
    setCustomFields(customFields.map(f => 
      f.id === id ? { ...f, [field]: value } : f
    ));
  };

  const addConsentBox = () => {
    const newConsent: ConsentCheckbox = {
      id: `consent-${Date.now()}`,
      label: '',
      required: true,
    };
    setConsentBoxes([...consentBoxes, newConsent]);
  };

  const removeConsentBox = (id: string) => {
    setConsentBoxes(consentBoxes.filter(c => c.id !== id));
  };

  const updateConsentBox = (id: string, field: keyof ConsentCheckbox, value: any) => {
    setConsentBoxes(consentBoxes.map(c => 
      c.id === id ? { ...c, [field]: value } : c
    ));
  };

  useEffect(() => {
    onUpdate({ 
      custom_fields: customFields,
      consent_checkboxes: consentBoxes,
    });
  }, [customFields, consentBoxes, onUpdate]);

  const validateAndProceed = () => {
    const invalidFields = customFields.filter(f => !f.label.trim());
    if (invalidFields.length > 0) {
      toast({
        title: "Validation Error",
        description: "All custom fields must have a label",
        variant: "destructive",
      });
      return;
    }

    const invalidConsents = consentBoxes.filter(c => !c.label.trim());
    if (invalidConsents.length > 0) {
      toast({
        title: "Validation Error",
        description: "All consent checkboxes must have a label",
        variant: "destructive",
      });
      return;
    }

    onNext();
  };

  const defaultEmailTemplate = `Dear [Candidate Name],

Thank you for your application for the position of [Job Title] at UNICC.

We have received your application and supporting documents. Our HR team will review your submission and contact you within [timeframe] regarding the next steps in our selection process.

If you have any questions about your application, please feel free to contact us at [contact email].

Best regards,
UNICC Human Resources Team`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 5: Application Form & Attachments</CardTitle>
        <p className="text-muted-foreground">
          Configure required attachments, custom fields, and confirmation settings
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Required Attachments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-base">
              <Paperclip className="w-4 h-4 mr-2" />
              Required Attachments
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Motivation Letter</Label>
                  <p className="text-sm text-muted-foreground">Cover letter explaining interest</p>
                </div>
                <Switch
                  checked={attachments.motivation_letter}
                  onCheckedChange={(checked) => updateAttachment('motivation_letter', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Personal History Form</Label>
                  <p className="text-sm text-muted-foreground">Standard UN personal history</p>
                </div>
                <Switch
                  checked={attachments.personal_history_form}
                  onCheckedChange={(checked) => updateAttachment('personal_history_form', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">CV/Resume</Label>
                  <p className="text-sm text-muted-foreground">Detailed work history</p>
                </div>
                <Switch
                  checked={attachments.cv}
                  onCheckedChange={(checked) => updateAttachment('cv', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Certificates</Label>
                  <p className="text-sm text-muted-foreground">Educational/professional certificates</p>
                </div>
                <Switch
                  checked={attachments.certificates}
                  onCheckedChange={(checked) => updateAttachment('certificates', checked)}
                />
              </div>
            </div>

            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Accepted file types:</strong> {FILE_TYPES.join(', ')} (max 10MB per file)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Custom Fields */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <div className="flex items-center">
                <FileText className="w-4 h-4 mr-2" />
                Custom Fields
              </div>
              <Button onClick={addCustomField}>
                <Plus className="w-4 h-4 mr-2" />
                Add Field
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {customFields.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                No custom fields added yet
              </div>
            ) : (
              customFields.map((field) => (
                <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end p-4 border rounded-lg">
                  <div className="md:col-span-4 space-y-2">
                    <Label>Field Label</Label>
                    <Input
                      value={field.label}
                      onChange={(e) => updateCustomField(field.id, 'label', e.target.value)}
                      placeholder="e.g., Years of Experience"
                    />
                  </div>

                  <div className="md:col-span-3 space-y-2">
                    <Label>Field Type</Label>
                    <Select
                      value={field.type}
                      onValueChange={(value) => updateCustomField(field.id, 'type', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FIELD_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <Label>Required</Label>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={field.required}
                        onCheckedChange={(checked) => updateCustomField(field.id, 'required', checked)}
                      />
                      <span className="text-sm text-muted-foreground">
                        {field.required ? 'Required' : 'Optional'}
                      </span>
                    </div>
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <Label>Preview</Label>
                    <Badge variant={field.required ? 'default' : 'secondary'}>
                      {field.type}
                    </Badge>
                  </div>

                  <div className="md:col-span-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCustomField(field.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Consent Checkboxes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span>Consent Checkboxes</span>
              <Button onClick={addConsentBox}>
                <Plus className="w-4 h-4 mr-2" />
                Add Consent
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {consentBoxes.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                No consent checkboxes added yet
              </div>
            ) : (
              consentBoxes.map((consent) => (
                <div key={consent.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end p-4 border rounded-lg">
                  <div className="md:col-span-8 space-y-2">
                    <Label>Consent Text</Label>
                    <Textarea
                      value={consent.label}
                      onChange={(e) => updateConsentBox(consent.id, 'label', e.target.value)}
                      placeholder="e.g., I consent to the processing of my personal data..."
                      rows={2}
                    />
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <Label>Required</Label>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={consent.required}
                        onCheckedChange={(checked) => updateConsentBox(consent.id, 'required', checked)}
                      />
                      <span className="text-sm text-muted-foreground">
                        {consent.required ? 'Required' : 'Optional'}
                      </span>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeConsentBox(consent.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}

            {/* Default consent suggestions */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium mb-2">Suggested consent checkboxes:</p>
              <div className="space-y-2 text-sm">
                <button
                  onClick={() => {
                    const newConsent: ConsentCheckbox = {
                      id: `consent-${Date.now()}`,
                      label: 'I consent to the processing of my personal data for recruitment purposes as outlined in the Privacy Notice.',
                      required: true,
                    };
                    setConsentBoxes([...consentBoxes, newConsent]);
                  }}
                  className="block text-left text-primary hover:underline"
                >
                  • Data processing consent (required)
                </button>
                <button
                  onClick={() => {
                    const newConsent: ConsentCheckbox = {
                      id: `consent-${Date.now()}`,
                      label: 'I would like to receive updates about future job opportunities at UNICC.',
                      required: false,
                    };
                    setConsentBoxes([...consentBoxes, newConsent]);
                  }}
                  className="block text-left text-primary hover:underline"
                >
                  • Marketing communications (optional)
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Confirmation Email */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-base">
              <Mail className="w-4 h-4 mr-2" />
              Confirmation Email Template
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Email Template</Label>
              <Textarea
                value={emailTemplate || defaultEmailTemplate}
                onChange={(e) => setEmailTemplate(e.target.value)}
                rows={8}
                placeholder="Confirmation email sent to candidates..."
              />
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Available placeholders:</strong> [Candidate Name], [Job Title], [Application Date], [Contact Email]
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Video Questions */}
        <VideoQuestionManager jobId="temp-job-id" />

        {/* Navigation */}
        <div className="flex justify-between pt-6">
          <Button variant="outline" onClick={onPrev}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous: Killer Questions
          </Button>
          <Button onClick={validateAndProceed}>
            Next: Review & Publish
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}