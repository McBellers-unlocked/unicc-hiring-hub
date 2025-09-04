import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import { JobWizardStep1 } from '@/components/job-wizard/JobWizardStep1';
import { JobWizardStep2 } from '@/components/job-wizard/JobWizardStep2';
import { JobWizardStep3 } from '@/components/job-wizard/JobWizardStep3';
import { JobWizardStep4 } from '@/components/job-wizard/JobWizardStep4';
import { JobWizardStep5 } from '@/components/job-wizard/JobWizardStep5';
import { JobWizardStep6 } from '@/components/job-wizard/JobWizardStep6';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export interface JobFormData {
  // Step 1: Basics & Meta
  title: string;
  category: string;
  notice_no: string;
  type: string;
  positions: number;
  grade: string;
  salary_estimate: string;
  location: string[];
  org_unit: string;
  issue_date: Date | null;
  closing_date: Date | null;
  timezone: string;
  privacy_notice_url: string;
  eligibility_note: string;
  branding: Record<string, any>;

  // Step 2: Description & Requirements
  description_md: string;
  requirements_md: string;

  // Step 3: Essential Criteria
  essential_criteria: Array<{
    id: string;
    label: string;
    weight: number;
    must_have: boolean;
    validator: string;
    params: Record<string, any>;
  }>;

  // Step 4: Killer Questions
  killer_questions: Array<{
    id: string;
    label: string;
    input_type: 'boolean' | 'single' | 'multi' | 'text';
    rule: 'yes_required' | 'no_required' | 'custom';
    options: Record<string, any>;
    custom_logic: Record<string, any>;
  }>;

  // Step 5: Application Form & Attachments
  attachments_required: Record<string, any>;
  custom_fields: Array<{
    id: string;
    label: string;
    type: string;
    required: boolean;
  }>;
  consent_checkboxes: Array<{
    id: string;
    label: string;
    required: boolean;
  }>;

  // Step 6: Publishing
  slug: string;
  status: string;
}

const STEPS = [
  { id: 1, title: 'Basics & Meta', description: 'Job details and metadata' },
  { id: 2, title: 'Description & Requirements', description: 'Content and requirements' },
  { id: 3, title: 'Essential Criteria', description: 'Scoring criteria setup' },
  { id: 4, title: 'Killer Questions', description: 'Screening questions' },
  { id: 5, title: 'Application Form', description: 'Attachments and custom fields' },
  { id: 6, title: 'Review & Publish', description: 'Final review and publishing' },
];

export default function JobWizard() {
  const { userRoles } = useAuth();
  const navigate = useNavigate();
  const { jobId } = useParams();
  const { toast } = useToast();
  
  
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isEditing] = useState(!!jobId);
  const [loading, setLoading] = useState(!!jobId);
  const [formData, setFormData] = useState<JobFormData>({
    title: '',
    category: '',
    notice_no: '',
    type: '',
    positions: 1,
    grade: '',
    salary_estimate: '',
    location: [],
    org_unit: '',
    issue_date: null,
    closing_date: null,
    timezone: 'Europe/Zurich',
    privacy_notice_url: 'https://www.unicc.org/unicc-privacy-notice-for-applicants/',
    eligibility_note: '',
    branding: { preset: 'UNICC' },
    description_md: '',
    requirements_md: '',
    essential_criteria: [],
    killer_questions: [],
    attachments_required: {
      motivation_letter: true,
      personal_history_form: true,
      cv: false,
    },
    custom_fields: [],
    consent_checkboxes: [],
    slug: '',
    status: 'draft',
  });

  // Check access permissions
  const hasAccess = userRoles.includes('Admin') || userRoles.includes('HR Assistant');

  // Load existing job data when editing
  useEffect(() => {
    // Wait for userRoles to be loaded and check access
    if (userRoles.length === 0 || !hasAccess || !jobId) {
      return;
    }

    const loadJobData = async () => {
      try {
        setLoading(true);
        
        // Load job data
        const { data: jobData, error: jobError } = await supabase
          .from('jobs')
          .select('*')
          .eq('id', jobId)
          .single();

        if (jobError) throw jobError;

        // Load essential criteria
        const { data: criteriaData, error: criteriaError } = await supabase
          .from('essential_criteria')
          .select('*')
          .eq('job_id', jobId)
          .order('created_at');

        if (criteriaError) throw criteriaError;

        // Load killer questions
        const { data: questionsData, error: questionsError } = await supabase
          .from('killer_questions')
          .select('*')
          .eq('job_id', jobId)
          .order('created_at');

        if (questionsError) throw questionsError;

        // Parse location data - handle both string and array formats
        let locationArray: string[] = [];
        if (jobData.location) {
          if (typeof jobData.location === 'string') {
            locationArray = jobData.location.split(',').map(loc => loc.trim());
          } else if (Array.isArray(jobData.location)) {
            locationArray = jobData.location;
          }
        }

        // Update form data with loaded data
        setFormData({
          title: jobData.title || '',
          category: jobData.category || '',
          notice_no: jobData.notice_no || '',
          type: jobData.type || '',
          positions: jobData.positions || 1,
          grade: jobData.grade || '',
          salary_estimate: jobData.salary_estimate || '',
          location: locationArray,
          org_unit: jobData.org_unit || '',
          issue_date: jobData.issue_date ? new Date(jobData.issue_date) : null,
          closing_date: jobData.closing_date ? new Date(jobData.closing_date) : null,
          timezone: jobData.timezone || 'Europe/Zurich',
          privacy_notice_url: jobData.privacy_notice_url || 'https://www.unicc.org/unicc-privacy-notice-for-applicants/',
          eligibility_note: jobData.eligibility_note || '',
          branding: (jobData.branding as Record<string, any>) || { preset: 'UNICC' },
          description_md: jobData.description_md || '',
          requirements_md: jobData.requirements_md || '',
          essential_criteria: criteriaData?.map(criterion => ({
            id: criterion.id,
            label: criterion.label,
            weight: criterion.weight,
            must_have: criterion.must_have,
            validator: criterion.validator || '',
            params: (criterion.params as Record<string, any>) || {}
          })) || [],
          killer_questions: questionsData?.map(question => ({
            id: question.id,
            label: question.label,
            input_type: question.input_type,
            rule: question.rule,
            options: (question.options as Record<string, any>) || {},
            custom_logic: (question.custom_logic as Record<string, any>) || {}
          })) || [],
          attachments_required: (jobData.attachments_required as Record<string, any>) || {
            motivation_letter: true,
            personal_history_form: true,
            cv: false,
          },
          custom_fields: [], // TODO: Load from job data if stored
          consent_checkboxes: [], // TODO: Load from job data if stored
          slug: jobData.slug || '',
          status: jobData.status || 'draft',
        });

      } catch (error) {
        console.error('Error loading job data:', error);
        toast({
          title: "Error",
          description: "Failed to load job data. Please try again.",
          variant: "destructive",
        });
        navigate('/admin/jobs');
      } finally {
        setLoading(false);
      }
    };

    loadJobData();
  }, [jobId, hasAccess, toast, navigate, userRoles]);
  
  if (!hasAccess) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-destructive mb-4">Access Denied</h1>
            <p className="text-muted-foreground">You don't have permission to access this page.</p>
          </div>
        </div>
      </Layout>
    );
  }

  const updateFormData = (step: number, data: Partial<JobFormData>) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  const nextStep = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (stepNumber: number) => {
    // Allow navigation to completed steps or current step
    if (stepNumber <= currentStep) {
      setCurrentStep(stepNumber);
    }
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <JobWizardStep1
            data={formData}
            onUpdate={(data) => updateFormData(1, data)}
            onNext={nextStep}
          />
        );
      case 2:
        return (
          <JobWizardStep2
            data={formData}
            onUpdate={(data) => updateFormData(2, data)}
            onNext={nextStep}
            onPrev={prevStep}
          />
        );
      case 3:
        return (
          <JobWizardStep3
            data={formData}
            onUpdate={(data) => updateFormData(3, data)}
            onNext={nextStep}
            onPrev={prevStep}
          />
        );
      case 4:
        return (
          <JobWizardStep4
            data={formData}
            onUpdate={(data) => updateFormData(4, data)}
            onNext={nextStep}
            onPrev={prevStep}
          />
        );
      case 5:
        return (
          <JobWizardStep5
            data={formData}
            onUpdate={(data) => updateFormData(5, data)}
            onNext={nextStep}
            onPrev={prevStep}
          />
        );
      case 6:
        return (
          <JobWizardStep6
            data={formData}
            onUpdate={(data) => updateFormData(6, data)}
            onPrev={prevStep}
            isEditing={isEditing}
            jobId={jobId}
          />
        );
      default:
        return null;
    }
  };

  const progress = (currentStep / STEPS.length) * 100;

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading job data...</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {isEditing ? 'Edit Job' : 'Create New Job'}
            </h1>
            <p className="text-muted-foreground mt-2">
              Step {currentStep} of {STEPS.length}: {STEPS[currentStep - 1]?.title}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate('/admin/jobs')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Jobs
          </Button>
        </div>

        {/* Progress Bar */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between mb-2">
              <CardTitle className="text-lg">Progress</CardTitle>
              <span className="text-sm text-muted-foreground">{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="w-full" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {STEPS.map((step) => (
                <div
                  key={step.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    step.id === currentStep
                      ? 'bg-primary text-primary-foreground border-primary'
                      : step.id < currentStep
                      ? 'bg-accent text-accent-foreground border-accent hover:bg-accent/80'
                      : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
                  }`}
                  onClick={() => handleStepClick(step.id)}
                >
                  <div className="flex items-center mb-2">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-2 ${
                        step.id === currentStep
                          ? 'bg-primary-foreground text-primary'
                          : step.id < currentStep
                          ? 'bg-accent-foreground text-accent'
                          : 'bg-muted-foreground text-muted'
                      }`}
                    >
                      {step.id}
                    </div>
                    <span className="font-medium text-sm">{step.title}</span>
                  </div>
                  <p className="text-xs opacity-80">{step.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Current Step Content */}
        {renderCurrentStep()}
      </div>
    </Layout>
  );
}