import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { X, Upload, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface KillerQuestion {
  id: string;
  label: string;
  input_type: 'boolean' | 'single_choice' | 'multiple_choice' | 'text';
  rule: 'yes_required' | 'no_required' | 'custom';
  options?: any;
  custom_logic?: any;
}

interface Job {
  id: string;
  title: string;
  location?: string;
  closing_date?: string;
  org_unit?: string;
  timezone?: string;
}

export default function JobApplication() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [job, setJob] = useState<Job | null>(null);
  const [killerQuestions, setKillerQuestions] = useState<KillerQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    work_auth: '',
    linkedin_url: ''
  });
  
  const [languages, setLanguages] = useState<string[]>([]);
  const [newLanguage, setNewLanguage] = useState('');
  const [killerAnswers, setKillerAnswers] = useState<Record<string, any>>({});
  const [files, setFiles] = useState<Record<string, File>>({});
  
  // Validation states
  const [disqualified, setDisqualified] = useState(false);
  const [disqualifyingQuestions, setDisqualifyingQuestions] = useState<Set<string>>(new Set());
  const [questionErrors, setQuestionErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (jobId) {
      fetchJobAndQuestions();
    }
  }, [jobId]);

  useEffect(() => {
    validateKillerQuestions();
  }, [killerAnswers, killerQuestions]);

  const fetchJobAndQuestions = async () => {
    try {
      const [jobResponse, questionsResponse] = await Promise.all([
        supabase
          .from('jobs')
          .select('id, title, location, closing_date, org_unit, timezone')
          .eq('id', jobId)
          .eq('status', 'active')
          .single(),
        supabase
          .from('killer_questions')
          .select('*')
          .eq('job_id', jobId)
      ]);

      if (jobResponse.error) {
        throw jobResponse.error;
      }

      if (!jobResponse.data) {
        navigate('/404');
        return;
      }

      setJob(jobResponse.data);
      setKillerQuestions(questionsResponse.data || []);
    } catch (error) {
      console.error('Error fetching job:', error);
      toast({
        title: "Error",
        description: "Could not load job details",
        variant: "destructive"
      });
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const validateKillerQuestions = () => {
    const errors: Record<string, string> = {};
    const disqualifying = new Set<string>();
    let isDisqualified = false;

    killerQuestions.forEach(question => {
      const answer = killerAnswers[question.id];
      
      if (answer !== undefined && answer !== null && answer !== '') {
        let questionDisqualified = false;
        let errorMessage = '';

        switch (question.rule) {
          case 'yes_required':
            if (question.input_type === 'boolean' && answer === false) {
              questionDisqualified = true;
              errorMessage = 'You have answered No to a required question. This makes you ineligible for this vacancy.';
            }
            break;
          case 'no_required':
            if (question.input_type === 'boolean' && answer === true) {
              questionDisqualified = true;
              errorMessage = 'You have answered Yes to a disqualifying question. This makes you ineligible for this vacancy.';
            }
            break;
          case 'custom':
            // Handle custom logic if needed
            break;
        }

        if (questionDisqualified) {
          disqualifying.add(question.id);
          errors[question.id] = errorMessage;
          isDisqualified = true;
        }
      }
    });

    setQuestionErrors(errors);
    setDisqualifyingQuestions(disqualifying);
    setDisqualified(isDisqualified);
  };

  const addLanguage = () => {
    if (newLanguage.trim() && !languages.includes(newLanguage.trim())) {
      setLanguages([...languages, newLanguage.trim()]);
      setNewLanguage('');
    }
  };

  const removeLanguage = (language: string) => {
    setLanguages(languages.filter(l => l !== language));
  };

  const handleFileChange = (field: string, file: File | null) => {
    if (file) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please upload PDF, DOC, or DOCX files only",
          variant: "destructive"
        });
        return;
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload files smaller than 5MB",
          variant: "destructive"
        });
        return;
      }

      setFiles(prev => ({ ...prev, [field]: file }));
    } else {
      setFiles(prev => {
        const newFiles = { ...prev };
        delete newFiles[field];
        return newFiles;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (disqualified) {
      toast({
        title: "Application cannot be submitted",
        description: "Please review the highlighted questions. Based on your answers, you are not eligible for this role.",
        variant: "destructive"
      });
      return;
    }

    // Validate required fields
    if (!formData.name || !formData.email || !files.motivation_letter) {
      toast({
        title: "Missing required fields",
        description: "Please fill in all required fields and upload your motivation letter",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);

    try {
      // Create candidate and application
      const response = await supabase.functions.invoke('submit-application', {
        body: {
          jobId,
          candidate: {
            ...formData,
            languages
          },
          killerAnswers,
          files: Object.keys(files)
        }
      });

      if (response.error) throw response.error;

      toast({
        title: "Application submitted successfully!",
        description: "You will receive a confirmation email shortly."
      });

      navigate('/');
    } catch (error) {
      console.error('Error submitting application:', error);
      toast({
        title: "Submission failed",
        description: "Please try again or contact support",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const renderKillerQuestion = (question: KillerQuestion) => {
    const hasError = questionErrors[question.id];
    const isDisqualifying = disqualifyingQuestions.has(question.id);

    return (
      <div key={question.id} className={`space-y-3 p-4 rounded-lg border ${isDisqualifying ? 'border-destructive bg-destructive/5' : 'border-border'}`}>
        <Label className="text-sm font-medium">{question.label}</Label>
        
        {question.input_type === 'boolean' && (
          <RadioGroup
            value={killerAnswers[question.id]?.toString()}
            onValueChange={(value) => setKillerAnswers(prev => ({
              ...prev,
              [question.id]: value === 'true'
            }))}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="true" id={`${question.id}-yes`} />
              <Label htmlFor={`${question.id}-yes`}>Yes</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="false" id={`${question.id}-no`} />
              <Label htmlFor={`${question.id}-no`}>No</Label>
            </div>
          </RadioGroup>
        )}

        {question.input_type === 'single_choice' && question.options?.choices && (
          <RadioGroup
            value={killerAnswers[question.id]}
            onValueChange={(value) => setKillerAnswers(prev => ({
              ...prev,
              [question.id]: value
            }))}
          >
            {question.options.choices.map((choice: string, index: number) => (
              <div key={index} className="flex items-center space-x-2">
                <RadioGroupItem value={choice} id={`${question.id}-${index}`} />
                <Label htmlFor={`${question.id}-${index}`}>{choice}</Label>
              </div>
            ))}
          </RadioGroup>
        )}

        {question.input_type === 'multiple_choice' && question.options?.choices && (
          <div className="space-y-2">
            {question.options.choices.map((choice: string, index: number) => (
              <div key={index} className="flex items-center space-x-2">
                <Checkbox
                  id={`${question.id}-${index}`}
                  checked={(killerAnswers[question.id] || []).includes(choice)}
                  onCheckedChange={(checked) => {
                    const currentAnswers = killerAnswers[question.id] || [];
                    if (checked) {
                      setKillerAnswers(prev => ({
                        ...prev,
                        [question.id]: [...currentAnswers, choice]
                      }));
                    } else {
                      setKillerAnswers(prev => ({
                        ...prev,
                        [question.id]: currentAnswers.filter((c: string) => c !== choice)
                      }));
                    }
                  }}
                />
                <Label htmlFor={`${question.id}-${index}`}>{choice}</Label>
              </div>
            ))}
          </div>
        )}

        {question.input_type === 'text' && (
          <Textarea
            value={killerAnswers[question.id] || ''}
            onChange={(e) => setKillerAnswers(prev => ({
              ...prev,
              [question.id]: e.target.value
            }))}
            placeholder="Please provide your answer..."
          />
        )}

        {hasError && (
          <div className="text-destructive text-sm italic" aria-live="polite">
            <AlertCircle className="inline w-4 h-4 mr-1" />
            {hasError}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading application form...</p>
        </div>
      </div>
    );
  }

  if (!job) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Apply for {job.title}</h1>
              <p className="text-muted-foreground mt-1">
                {job.location} • {job.org_unit}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => navigate(`/jobs/${job.id}`)}
            >
              View Job Details
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {disqualified && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please review the highlighted questions. Based on your answers, you are not eligible for this role.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="work_auth">Work Authorization Status</Label>
                <Textarea
                  id="work_auth"
                  value={formData.work_auth}
                  onChange={(e) => setFormData(prev => ({ ...prev, work_auth: e.target.value }))}
                  placeholder="Please describe your work authorization status..."
                />
              </div>

              <div>
                <Label htmlFor="linkedin_url">LinkedIn URL</Label>
                <Input
                  id="linkedin_url"
                  type="url"
                  value={formData.linkedin_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, linkedin_url: e.target.value }))}
                  placeholder="https://linkedin.com/in/yourprofile"
                />
              </div>

              <div>
                <Label>Languages</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={newLanguage}
                    onChange={(e) => setNewLanguage(e.target.value)}
                    placeholder="Add a language..."
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addLanguage())}
                  />
                  <Button type="button" onClick={addLanguage} variant="outline">
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {languages.map((language) => (
                    <Badge key={language} variant="secondary" className="flex items-center gap-1">
                      {language}
                      <X
                        className="h-3 w-3 cursor-pointer hover:text-destructive"
                        onClick={() => removeLanguage(language)}
                      />
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* File Uploads */}
          <Card>
            <CardHeader>
              <CardTitle>Required Documents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="motivation_letter">Motivation Letter *</Label>
                <div className="mt-2 flex items-center gap-2">
                  <Input
                    id="motivation_letter"
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => handleFileChange('motivation_letter', e.target.files?.[0] || null)}
                    required
                  />
                  {files.motivation_letter && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Upload className="h-4 w-4" />
                      {files.motivation_letter.name}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="cv">CV (Optional)</Label>
                <div className="mt-2 flex items-center gap-2">
                  <Input
                    id="cv"
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => handleFileChange('cv', e.target.files?.[0] || null)}
                  />
                  {files.cv && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Upload className="h-4 w-4" />
                      {files.cv.name}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Killer Questions */}
          {killerQuestions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Essential Requirements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {killerQuestions.map(renderKillerQuestion)}
              </CardContent>
            </Card>
          )}

          {/* Submit */}
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/jobs/${job.id}`)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || disqualified}
              className="min-w-32"
            >
              {submitting ? 'Submitting...' : 'Submit Application'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}