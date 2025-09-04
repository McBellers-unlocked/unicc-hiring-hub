import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { X, Upload, AlertCircle, FileText, Check, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PHFForm } from '@/components/PHFForm';

interface KillerQuestion {
  id: string;
  label: string;
  input_type: 'boolean' | 'single' | 'multi' | 'text';
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

type ApplicationStep = 'basic' | 'phf' | 'success';

export default function JobApplication() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [job, setJob] = useState<Job | null>(null);
  const [killerQuestions, setKillerQuestions] = useState<KillerQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState<ApplicationStep>('basic');
  const [applicationId, setApplicationId] = useState<string | null>(null);
  
  // Form data
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    work_auth: '',
    linkedin_url: ''
  });
  const [killerAnswers, setKillerAnswers] = useState<Record<string, any>>({});
  const [files, setFiles] = useState<Record<string, File>>({});
  const [phfData, setPHFData] = useState<any>({});
  
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
          .maybeSingle(),
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

  const handleBasicFormSubmit = async (e: React.FormEvent) => {
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
    if (!formData.name || !formData.email) {
      toast({
        title: "Missing required fields",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);

    try {
      // Upload files to storage first
      const uploadedFiles: Record<string, string> = {};
      for (const [key, file] of Object.entries(files)) {
        const fileName = `${Date.now()}_${file.name}`;
        const { data, error } = await supabase.storage
          .from('application-files')
          .upload(fileName, file);
        
        if (error) throw error;
        uploadedFiles[key] = data.path;
      }

      // Find or create candidate
      const candidateData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        location: formData.location,
        work_auth: formData.work_auth,
        linkedin_url: formData.linkedin_url
      };

      // First try to find existing candidate by email
      let { data: candidate, error: findError } = await supabase
        .from('candidates')
        .select('*')
        .eq('email', formData.email)
        .maybeSingle();

      if (findError) throw findError;

      // If candidate doesn't exist, create new one
      if (!candidate) {
        const { data: newCandidate, error: candidateError } = await supabase
          .from('candidates')
          .insert(candidateData)
          .select()
          .single();

        if (candidateError) throw candidateError;
        candidate = newCandidate;
      }

      // Create application
      const applicationData = {
        job_id: jobId,
        candidate_id: candidate.id,
        status: 'Application' as const,
        answers: killerAnswers,
        files: uploadedFiles
      };

      const { data: application, error: applicationError } = await supabase
        .from('applications')
        .insert(applicationData)
        .select()
        .single();

      if (applicationError) throw applicationError;

      setApplicationId(application.id);
      setCurrentStep('phf');
      
      toast({
        title: "Basic information saved!",
        description: "Please complete the Personal History Form to finish your application."
      });

    } catch (error) {
      console.error('Error submitting basic form:', error);
      toast({
        title: "Submission failed",
        description: "Please try again or contact support",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePHFSave = async (data: any, isComplete: boolean) => {
    if (!applicationId) return;

    try {
      const { error } = await supabase
        .from('applications')
        .update({
          phf_data: data,
          phf_completed: isComplete
        })
        .eq('id', applicationId);

      if (error) throw error;

      setPHFData(data);

      if (isComplete) {
        // Send confirmation email and trigger scoring
        const emailResponse = await supabase.functions.invoke('send-application-confirmation', {
          body: {
            candidateName: formData.name,
            candidateEmail: formData.email,
            jobTitle: job?.title,
            jobNoticeNo: job?.id,
            closingDate: job?.closing_date
          }
        });

        if (emailResponse.error) {
          console.error('Failed to send confirmation email:', emailResponse.error);
        }

        // Trigger AI scoring in the background
        const scoreResponse = await supabase.functions.invoke('score-application', {
          body: { applicationId }
        });

        if (scoreResponse.error) {
          console.error('Failed to trigger scoring:', scoreResponse.error);
        } else {
          console.log('Application scoring triggered successfully');
        }

        setCurrentStep('success');
      }
    } catch (error) {
      console.error('Error saving PHF:', error);
      throw error;
    }
  };

  const handleUploadPhoto = async (file: File): Promise<string> => {
    const fileName = `photos/${Date.now()}_${file.name}`;
    const { data, error } = await supabase.storage
      .from('application-files')
      .upload(fileName, file);
    
    if (error) throw error;
    
    const { data: { publicUrl } } = supabase.storage
      .from('application-files')
      .getPublicUrl(data.path);
    
    return publicUrl;
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

        {question.input_type === 'single' && question.options?.choices && (
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

        {question.input_type === 'multi' && question.options?.choices && (
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
          <Alert variant="destructive" className="mt-2">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Eligibility Requirement Not Met</AlertTitle>
            <AlertDescription className="italic">
              {hasError}
            </AlertDescription>
          </Alert>
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

  const renderStepIndicator = () => (
    <div className="flex items-center space-x-4 mb-8">
      <div className={`flex items-center space-x-2 ${currentStep === 'basic' ? 'text-primary' : currentStep === 'phf' || currentStep === 'success' ? 'text-green-600' : 'text-muted-foreground'}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${currentStep === 'basic' ? 'border-primary bg-primary text-primary-foreground' : currentStep === 'phf' || currentStep === 'success' ? 'border-green-600 bg-green-600 text-white' : 'border-muted-foreground'}`}>
          {currentStep === 'phf' || currentStep === 'success' ? <Check className="h-4 w-4" /> : '1'}
        </div>
        <span className="font-medium">Basic Information</span>
      </div>
      
      <div className={`h-px bg-border flex-1 ${currentStep === 'phf' || currentStep === 'success' ? 'bg-green-600' : ''}`} />
      
      <div className={`flex items-center space-x-2 ${currentStep === 'phf' ? 'text-primary' : currentStep === 'success' ? 'text-green-600' : 'text-muted-foreground'}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${currentStep === 'phf' ? 'border-primary bg-primary text-primary-foreground' : currentStep === 'success' ? 'border-green-600 bg-green-600 text-white' : 'border-muted-foreground'}`}>
          {currentStep === 'success' ? <Check className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
        </div>
        <span className="font-medium">Personal History Form</span>
      </div>
      
      <div className={`h-px bg-border flex-1 ${currentStep === 'success' ? 'bg-green-600' : ''}`} />
      
      <div className={`flex items-center space-x-2 ${currentStep === 'success' ? 'text-green-600' : 'text-muted-foreground'}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${currentStep === 'success' ? 'border-green-600 bg-green-600 text-white' : 'border-muted-foreground'}`}>
          {currentStep === 'success' ? <Check className="h-4 w-4" /> : '3'}
        </div>
        <span className="font-medium">Complete</span>
      </div>
    </div>
  );

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
            <div className="flex items-center space-x-2">
              {currentStep === 'phf' && (
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep('basic')}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => navigate(`/jobs/${job.id}`)}
              >
                View Job Details
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {renderStepIndicator()}

        {currentStep === 'basic' && (
          <>
            {disqualified && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Please review the highlighted questions. Based on your answers, you are not eligible for this role.
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleBasicFormSubmit} className="space-y-8">
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

            </CardContent>
          </Card>


          {/* Killer Questions */}
          {killerQuestions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Essential Requirements</CardTitle>
                <CardDescription>
                  Please answer all questions accurately as your responses will be assessed later in the recruitment process.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {killerQuestions.map(renderKillerQuestion)}
              </CardContent>
            </Card>
          )}

              {/* Disqualification Warning */}
              {disqualified && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Application Cannot Be Submitted</AlertTitle>
                  <AlertDescription>
                    You do not meet one or more essential requirements for this position. 
                    Please review your answers above.
                  </AlertDescription>
                </Alert>
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
                  {submitting ? 'Saving...' : disqualified ? 'Requirements Not Met' : 'Continue to PHF'}
                </Button>
              </div>
            </form>
          </>
        )}

        {currentStep === 'phf' && (
          <PHFForm
            initialData={phfData}
            onSave={handlePHFSave}
            onUploadPhoto={handleUploadPhoto}
          />
        )}

        {currentStep === 'success' && (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="pt-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold mb-4">Application Submitted Successfully!</h2>
              <p className="text-muted-foreground mb-6">
                Thank you for your application to {job.title}. We have received your submission and you should receive a confirmation email shortly.
              </p>
              <div className="bg-muted p-4 rounded-lg mb-6">
                <h3 className="font-semibold mb-2">What happens next?</h3>
                <ul className="text-sm text-left space-y-2">
                  <li>• Your application will be reviewed by our recruitment team</li>
                  <li>• We will contact you if your profile matches our requirements</li>
                  <li>• The review process typically takes 2-3 weeks</li>
                  <li>• Please note that due to high application volumes, we can only contact shortlisted candidates</li>
                </ul>
              </div>
              <div className="flex justify-center space-x-4">
                <Button onClick={() => navigate('/')}>
                  Return to Jobs
                </Button>
                <Button variant="outline" onClick={() => navigate(`/jobs/${job.id}`)}>
                  View Job Details
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}