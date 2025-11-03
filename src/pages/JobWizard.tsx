import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import { JobWizardStep1 } from '@/components/job-wizard/JobWizardStep1';
import { JobWizardStep2 } from '@/components/job-wizard/JobWizardStep2';
import { JobWizardStep3 } from '@/components/job-wizard/JobWizardStep3';
import { JobWizardStep4 } from '@/components/job-wizard/JobWizardStep4';
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

  // Step 3: Requirements (moved from step 2)
  essential_education_level: string;
  language_requirements: string;
  competencies: string;

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
  { id: 2, title: 'Job Description', description: 'Position description content' },
  { id: 3, title: 'Requirements', description: 'Essential and desirable requirements' },
  { id: 4, title: 'Killer Questions', description: 'Screening questions' },
  { id: 5, title: 'Review & Publish', description: 'Final review and publishing' },
];

export default function JobWizard() {
  const { userRoles } = useAuth();
  const navigate = useNavigate();
  const { jobId } = useParams();
  const { toast } = useToast();
  
  // Check if converting from requisition
  const urlParams = new URLSearchParams(window.location.search);
  const requisitionId = urlParams.get('from_requisition');
  const stepParam = urlParams.get('step');
  
  
  
  const [currentStep, setCurrentStep] = useState(() => {
    // If step parameter is provided, start at that step
    if (stepParam) {
      const step = parseInt(stepParam);
      if (step >= 1 && step <= 5) {
        return step;
      }
    }
    return 1;
  });
  const [isEditing] = useState(!!jobId);
  const [loading, setLoading] = useState(!!jobId || !!requisitionId);
  const [isConvertingFromRequisition] = useState(!!requisitionId);
  const [isConvertedFromRequisition, setIsConvertedFromRequisition] = useState(false);
  const [requisitionData, setRequisitionData] = useState<any>(null);
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
    essential_education_level: '',
    language_requirements: '',
    competencies: '',
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

  // Load existing job data when editing or converting from requisition
  useEffect(() => {
    // Wait for userRoles to be loaded and check access
    if (userRoles.length === 0 || !hasAccess || (!jobId && !requisitionId)) {
      return;
    }

    const loadJobData = async () => {
      try {
        setLoading(true);
        
        // Helper function to format salary based on grade
        const formatSalaryFromGrade = (grade: string | null): string => {
          if (!grade) return '';
          
          const salaryTable: { [key: string]: { stepI: number; stepXIII: number } } = {
            'D-2': { stepI: 171094, stepXIII: 205942 },
            'D-1': { stepI: 152417, stepXIII: 193215 },
            'D1': { stepI: 152417, stepXIII: 193215 },
            'P-5': { stepI: 131486, stepXIII: 165076 },
            'P-4': { stepI: 107389, stepXIII: 131071 },
            'P-3': { stepI: 87779, stepXIII: 108653 },
            'P-2': { stepI: 67978, stepXIII: 86037 },
            'P-1': { stepI: 52163, stepXIII: 67495 },
          };
          
          const salaryData = salaryTable[grade];
          if (salaryData) {
            return `USD ${salaryData.stepI.toLocaleString()} - USD ${salaryData.stepXIII.toLocaleString()}`;
          }
          
          return '';
        };
        
        if (requisitionId) {
          // Load requisition data to convert to job
          const { data: requisition, error: reqError } = await supabase
            .from('job_requisitions')
            .select('*')
            .eq('id', requisitionId)
            .single();

          if (reqError) throw reqError;
          setRequisitionData(requisition);

          // Map requisition data to job form data
          const locationArray = requisition.duty_station ? 
            (typeof requisition.duty_station === 'string' ? 
              JSON.parse(requisition.duty_station) : 
              requisition.duty_station) : [];

          // Map grade based on position type
          let mappedGrade = requisition.grade || '';
          if (requisition.nature_of_position === 'Individual Consultant') {
            mappedGrade = 'Consultant';
          } else if (requisition.nature_of_position === 'Intern') {
            mappedGrade = 'Intern';
          }

          setFormData({
            title: requisition.position_title || '',
            category: 'Professional', // Default category
            notice_no: requisition.reference_number || '',
            type: requisition.nature_of_position || '',
            positions: requisition.positions_available || 1,
            grade: mappedGrade,
            salary_estimate: '',
            location: locationArray,
            org_unit: requisition.unit_section_division || '',
            issue_date: null, // Removed as requested
            closing_date: null, // Will be set by user
            timezone: 'Europe/Zurich',
            privacy_notice_url: 'https://www.unicc.org/unicc-privacy-notice-for-applicants/',
            eligibility_note: '',
            branding: { preset: 'UNICC' },
            description_md: `
# Purpose of the Position

${requisition.purpose_of_position || ''}

# Objectives of the Programme

${requisition.objectives_of_programme || ''}

# Main Duties and Responsibilities

${requisition.main_duties_responsibilities || ''}
            `.trim(),
            requirements_md: `
# Essential Experience

${requisition.essential_experience || ''}

# Desirable Experience

${requisition.desirable_experience || ''}

# Essential Education

${requisition.essential_education || ''}

# Desirable Education

${requisition.desirable_education || ''}
            `.trim(),
            essential_education_level: (requisition as any).essential_education_level || '',
             language_requirements: (() => {
               let langReq = '# Language Requirements\n\n## Required Language Skills\n\n- **English**: Expert knowledge is required\n\n## Additional Language Skills\n\n';
               
               // Check for UN language advantage from language_requirements object
               if (requisition.language_requirements && typeof requisition.language_requirements === 'object') {
                 if ((requisition.language_requirements as any).un_language_advantage) {
                   langReq += '- Knowledge of another UN language would be an advantage\n';
                 }
                 
                 // Add other language requirements
                 const additional = Object.entries(requisition.language_requirements)
                   .filter(([key]) => key.toLowerCase() !== 'english' && key !== 'un_language_advantage')
                   .map(([lang, level]) => `- **${lang.charAt(0).toUpperCase() + lang.slice(1)}**: ${level}`)
                   .join('\n');
                 if (additional) langReq += additional;
               }
               
               return langReq;
             })(),
             competencies: (() => {
               const competencyGroups = [];
               
               // Add mandatory competencies section
               competencyGroups.push('# Mandatory Competencies\n\nThese competencies are automatically included for all positions:\n\n• **Teamwork**: Develops and promotes effective relationships with colleagues and team members\n• **Communicating**: Expresses oneself clearly in conversations and interactions with others\n• **Respecting and promoting individual and cultural differences**: Demonstrates the ability to work constructively with people of all backgrounds and orientations\n• **Creating an empowering and motivating environment** (for Supervisory positions only)');
               
               // Add Core Competencies if they exist
               if (Array.isArray(requisition.core_competencies) && requisition.core_competencies.length > 0) {
                 const coreComps = requisition.core_competencies
                   .filter((comp: any) => comp.name && comp.name.trim())
                   .map((comp: any) => `• **${comp.name}**: ${comp.description || ''}`)
                   .join('\n');
                 if (coreComps) {
                   competencyGroups.push('# Core Competencies\n\nSelect core competencies\n\n' + coreComps);
                 }
               }
               
               // Add Management Competencies if they exist
               if (Array.isArray(requisition.management_competencies) && requisition.management_competencies.length > 0) {
                 const mgmtComps = requisition.management_competencies
                   .filter((comp: any) => comp.name && comp.name.trim())
                   .map((comp: any) => `• **${comp.name}**: ${comp.description || ''}`)
                   .join('\n');
                 if (mgmtComps) {
                   competencyGroups.push('# Management Competencies\n\nSelect management competencies\n\n' + mgmtComps);
                 }
               }
               
               // Add Global/Leadership Competencies if they exist
               const otherCompetencies = [
                 ...(Array.isArray(requisition.global_competencies) ? requisition.global_competencies.filter((comp: any) => comp.name && comp.name.trim()) : []),
                 ...(Array.isArray(requisition.leadership_competencies) ? requisition.leadership_competencies.filter((comp: any) => comp.name && comp.name.trim()) : [])
               ];
               
               if (otherCompetencies.length > 0) {
                 const otherComps = otherCompetencies
                   .map((comp: any) => `• **${comp.name}**: ${comp.description || ''}`)
                   .join('\n');
                 competencyGroups.push('# Additional Competencies\n\n' + otherComps);
               }
               
               return competencyGroups.join('\n\n') || '';
             })(),
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
          setLoading(false);
          return;
        }
        
        // Load job data (existing logic)
        const { data: jobData, error: jobError } = await supabase
          .from('jobs')
          .select('*')
          .eq('id', jobId)
          .single();

        if (jobError) throw jobError;

        // Debug: Log the loaded data to help with troubleshooting
        console.log('Loaded job data:', {
          language_requirements: jobData.language_requirements,
          competencies: jobData.competencies,
          requirements_md: jobData.requirements_md
        });

        // Check if this job was converted from a requisition by looking for a matching reference number
        const { data: requisitionData } = await supabase
          .from('job_requisitions')
          .select('id, reference_number')
          .eq('reference_number', jobData.notice_no)
          .limit(1);
        
        const wasConvertedFromRequisition = requisitionData && requisitionData.length > 0;
        setIsConvertedFromRequisition(wasConvertedFromRequisition);

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
            // Try to parse as JSON first (for data from edge function conversion)
            try {
              const parsed = JSON.parse(jobData.location);
              if (Array.isArray(parsed)) {
                locationArray = parsed;
              } else {
                locationArray = [parsed];
              }
            } catch {
              // Fallback to comma-separated parsing
              locationArray = jobData.location.split(',').map(loc => loc.trim());
            }
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
          salary_estimate: jobData.salary_estimate && jobData.salary_estimate !== jobData.grade 
            ? jobData.salary_estimate 
            : formatSalaryFromGrade(jobData.grade),
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
          essential_education_level: jobData.essential_education_level || '',
          language_requirements: jobData.language_requirements || '',
          competencies: jobData.competencies || '',
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
  }, [jobId, requisitionId, hasAccess, toast, navigate, userRoles]);
  
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
    // When editing, allow navigation to any step
    // When creating new, allow navigation to completed steps or current step
    if (isEditing || stepNumber <= currentStep) {
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
            isConvertingFromRequisition={isConvertingFromRequisition}
            isConvertedFromRequisition={isConvertedFromRequisition}
            requisitionData={requisitionData}
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
          <JobWizardStep6
            data={formData}
            onUpdate={(data) => updateFormData(5, data)}
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
              {isEditing ? 'Edit Job' : isConvertingFromRequisition ? 'Convert PD to Vacancy Notice' : 'Create New Job'}
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
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {STEPS.map((step) => (
                <div
                  key={step.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    step.id === currentStep
                      ? 'bg-primary text-primary-foreground border-primary'
                      : (isEditing || step.id < currentStep)
                      ? 'bg-accent text-accent-foreground border-accent hover:bg-accent/80'
                      : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
                  } ${
                    isEditing || step.id <= currentStep 
                      ? 'hover:scale-105' 
                      : 'cursor-not-allowed opacity-60'
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