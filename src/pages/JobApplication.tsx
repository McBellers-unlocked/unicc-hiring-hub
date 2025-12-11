import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ArrowLeft, AlertCircle, FileText, Check, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PHFForm } from '@/components/PHFForm';
import { createPHFDataFromProfile, updateProfileFromPHF } from '@/lib/phfDataMapping';

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
  location: string;
  closing_date: string;
  org_unit: string;
  timezone: string;
  internal_only: boolean;
}

type ApplicationStep = 'phf' | 'success';

export default function JobApplication() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [job, setJob] = useState<Job | null>(null);
  const [killerQuestions, setKillerQuestions] = useState<KillerQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState<ApplicationStep>('phf');
  const [applicationId, setApplicationId] = useState<string | null>(null);
  
  const [killerAnswers, setKillerAnswers] = useState<Record<string, any>>({});
  const [phfData, setPHFData] = useState<any>({});
  const [completedTabs, setCompletedTabs] = useState<Set<number>>(new Set([0])); // Tab 0 starts accessible
  const [candidateProfile, setCandidateProfile] = useState<any>(null);
  const [profileIncomplete, setProfileIncomplete] = useState(false);
  const [candidateId, setCandidateId] = useState<string | null>(null);
  const [candidateSlug, setCandidateSlug] = useState<string | null>(null);
  const [initialTab, setInitialTab] = useState<number>(0);
  const [currentTab, setCurrentTab] = useState<number>(0);
  
  // Validation states
  const [disqualified, setDisqualified] = useState(false);
  const [disqualifyingQuestions, setDisqualifyingQuestions] = useState<Set<string>>(new Set());
  const [questionErrors, setQuestionErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (jobId) {
      fetchJobAndQuestions();
      loadExistingApplication();
    }
  }, [jobId]);

  useEffect(() => {
    validateKillerQuestions();
  }, [killerAnswers, killerQuestions]);
  
  // Function to determine the next incomplete tab
  const getNextIncompleteTab = () => {
    if (completedTabs.size === 0) return 0; // Start with eligibility questions
    
    const sortedCompleted = Array.from(completedTabs).sort((a, b) => a - b);
    
    // Find the first gap or return the next number after the highest completed
    for (let i = 0; i < sortedCompleted.length; i++) {
      if (i === 0 && sortedCompleted[i] > 0) {
        return 0; // Gap at the beginning
      }
      if (i < sortedCompleted.length - 1 && sortedCompleted[i + 1] - sortedCompleted[i] > 1) {
        return sortedCompleted[i] + 1; // Gap in the middle
      }
    }
    
    // No gaps found, return next after highest completed (max 14 for 15 tabs total)
    const highest = Math.max(...sortedCompleted);
    const nextTab = highest + 1;
    
    // If all tabs are completed, stay on the last tab
    return nextTab > 14 ? 14 : nextTab;
  };

  // Function to mark tab as completed
  const markTabCompleted = (tabIndex: number) => {
    const newCompleted = new Set(completedTabs);
    newCompleted.add(tabIndex);
    setCompletedTabs(newCompleted);
  };

  const fetchJobAndQuestions = async () => {
    try {
      // Check if user is authenticated and get their email
      const { data: { user } } = await supabase.auth.getUser();
      const isInternalUser = user?.email?.endsWith('@unicc.org');

      const [jobResponse, questionsResponse] = await Promise.all([
        supabase
          .from('jobs')
          .select('*')
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

      if (questionsResponse.error) {
        console.error('Error fetching killer questions:', questionsResponse.error);
        throw questionsResponse.error;
      }

      if (!jobResponse.data) {
        navigate('/404');
        return;
      }

      // Check if job is internal-only and user is not internal
      if (jobResponse.data.internal_only && !isInternalUser) {
        toast({
          title: "Access Restricted",
          description: "This position is only open to internal UNICC staff.",
          variant: "destructive"
        });
        navigate(`/job/${jobResponse.data.slug || jobId}`);
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

  const loadExistingApplication = async () => {
    try {
      // First check localStorage for saved progress
      const progressKey = `phf_progress_${jobId}`;
      const savedProgress = localStorage.getItem(progressKey);
      if (savedProgress) {
        try {
          const progressData = JSON.parse(savedProgress);
          if (progressData.phfData) {
            setPHFData(progressData.phfData);
          }
          if (progressData.killerAnswers) {
            setKillerAnswers(progressData.killerAnswers);
          }
          if (progressData.completedTabs) {
            setCompletedTabs(new Set(progressData.completedTabs));
          }
          console.log('Loaded progress from localStorage:', progressData);
        } catch (e) {
          console.error('Error parsing saved progress:', e);
          localStorage.removeItem(progressKey);
        }
      }

      // Try to get user's email from current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) return;

      // For authenticated users, load from database
      // First get the candidate record with all profile data
      const { data: candidate } = await supabase
        .from('candidates')
        .select('*')
        .eq('email', user.email)
        .maybeSingle();

      if (!candidate) {
        // No candidate profile found - user needs to create one
        setProfileIncomplete(true);
        return;
      }
      
      // Check if profile is sufficiently complete for application
      const hasBasicInfo = candidate.name && candidate.email;
      const hasEducation = candidate.education && Array.isArray(candidate.education) && candidate.education.length > 0;
      const hasWorkExperience = candidate.work_experience && Array.isArray(candidate.work_experience) && candidate.work_experience.length > 0;
      
      if (!hasBasicInfo || !hasEducation || !hasWorkExperience) {
        setProfileIncomplete(true);
        setCandidateId(candidate.id);
        setCandidateSlug(candidate.slug);
        return;
      }
      
      // Store candidate profile in state
      setCandidateProfile(candidate);
      setCandidateId(candidate.id);
      setCandidateSlug(candidate.slug);

      // Check if application exists for this job and candidate
      const { data: existingApplication } = await supabase
        .from('applications')
        .select('id, phf_data, phf_completed, answers, status')
        .eq('job_id', jobId)
        .eq('candidate_id', candidate.id)
        .maybeSingle();

      if (existingApplication) {
        setApplicationId(existingApplication.id);
        
        // Load existing application data
        if (existingApplication.answers && typeof existingApplication.answers === 'object') {
          setKillerAnswers(existingApplication.answers as Record<string, any>);
        }
        
        if (existingApplication.phf_data && typeof existingApplication.phf_data === 'object') {
          const existingData = existingApplication.phf_data as any;
          
          // Restore completedTabs from saved progress
          if (existingData._progress?.completedTabs && Array.isArray(existingData._progress.completedTabs)) {
            setCompletedTabs(new Set(existingData._progress.completedTabs));
          }
          
          // Restore initial tab from saved progress
          if (existingData._progress?.currentTab !== undefined) {
            setInitialTab(existingData._progress.currentTab);
            setCurrentTab(existingData._progress.currentTab);
          }
          
          // For Draft applications, merge latest profile personal details
          if (existingApplication.status === 'Draft' && candidate) {
            const freshProfileData = createPHFDataFromProfile(candidate);
            const mergedData = {
              ...existingData,
              personalDetails: {
                ...existingData.personalDetails,
                // Override with fresh profile data for key personal fields
                familyName: freshProfileData.personalDetails.familyName,
                firstNames: freshProfileData.personalDetails.firstNames,
                title: freshProfileData.personalDetails.title,
                maidenName: freshProfileData.personalDetails.maidenName,
                sex: freshProfileData.personalDetails.sex,
                dateOfBirth: freshProfileData.personalDetails.dateOfBirth,
                placeOfBirth: freshProfileData.personalDetails.placeOfBirth,
                countryOfBirth: freshProfileData.personalDetails.countryOfBirth,
                presentNationality: freshProfileData.personalDetails.presentNationality,
                maritalStatus: freshProfileData.personalDetails.maritalStatus,
                permanentAddress: freshProfileData.personalDetails.permanentAddress,
                presentAddress: freshProfileData.personalDetails.presentAddress,
                telephone: freshProfileData.personalDetails.telephone,
                email: freshProfileData.personalDetails.email,
              }
            };
            setPHFData(mergedData);
            
            // Only clear localStorage if we successfully restored progress from database
            if (existingData._progress?.completedTabs?.length > 0) {
              const progressKey = `phf_progress_${jobId}`;
              localStorage.removeItem(progressKey);
            }
          } else {
            setPHFData(existingData);
          }
        }

        // Determine which step to show
        if (existingApplication.phf_completed) {
          setCurrentStep('success');
        }
      } else if (candidate) {
        // No existing application - pre-populate from candidate profile using mapping function
        const prefilledData = createPHFDataFromProfile(candidate);
        
        setPHFData(prefilledData);
        console.log('Pre-filled form with candidate profile data:', prefilledData);
        console.log('Candidate data used:', candidate);
      }
    } catch (error) {
      console.error('Error loading existing application:', error);
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

  const handlePHFSubmit = async (phfData: any, isComplete: boolean) => {
    try {
      setSubmitting(true);

      // Extract special fields and merge edited data
      const { _editedData, _markTabCompleted, ...corePhfData } = phfData;
      
      // Merge edited education, work experiences, skills, and certifications into the main data if present
      const mergedPhfData = {
        ...corePhfData,
        // Store edited data in phf_data
        _education: _editedData?.education || corePhfData._education,
        _workExperiences: _editedData?.workExperiences || corePhfData._workExperiences,
        _skills: _editedData?.skills || corePhfData._skills,
        _certifications: _editedData?.certifications || corePhfData._certifications,
      };

      // For partial saves (progress), save to localStorage for persistence
      if (!isComplete) {
        // If a tab should be marked as completed, add it before saving
        let tabsToSave = completedTabs;
        if (_markTabCompleted !== undefined) {
          tabsToSave = new Set([...completedTabs, _markTabCompleted]);
          setCompletedTabs(tabsToSave); // Update local state too
        }
        
        const progressKey = `phf_progress_${jobId}`;
        const progressData = {
          phfData: mergedPhfData,
          killerAnswers,
          completedTabs: Array.from(tabsToSave),
          timestamp: new Date().toISOString()
        };
        localStorage.setItem(progressKey, JSON.stringify(progressData));
        
        setPHFData(mergedPhfData);
        
        // For authenticated users, also save to database as Draft
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email && candidateId) {
          try {
            // Add progress metadata to phf_data
            const phfDataWithProgress = {
              ...mergedPhfData,
              _progress: {
                completedTabs: Array.from(tabsToSave),
                currentTab: currentTab
              }
            };
            
            if (applicationId) {
              // Update existing draft
              await supabase.from('applications').update({
                phf_data: phfDataWithProgress,
                answers: killerAnswers,
                updated_at: new Date().toISOString()
              }).eq('id', applicationId);
            } else {
              // Create new draft application
              const { data: newApp } = await supabase.from('applications').insert({
                job_id: jobId,
                candidate_id: candidateId,
                status: 'Draft',
                phf_data: phfDataWithProgress,
                answers: killerAnswers,
                phf_completed: false,
                submitted_at: new Date().toISOString()
              }).select().single();
              
              if (newApp) {
                setApplicationId(newApp.id);
              }
            }
          } catch (dbError) {
            console.error('Error saving draft to database:', dbError);
            // Don't fail if DB save fails, localStorage is the backup
          }
          
          // Sync PHF data back to candidate profile on every save
          try {
            const profileUpdates = updateProfileFromPHF(mergedPhfData);
            
            await supabase
              .from('candidates')
              .update({
                ...profileUpdates,
                updated_at: new Date().toISOString()
              })
              .eq('id', candidateId);
              
            console.log('Profile synced from PHF progress save');
          } catch (profileSyncError) {
            console.error('Error syncing PHF to profile during progress save:', profileSyncError);
            // Don't fail the save, just log the error
          }
        }
        
        toast({
          title: "Progress saved",
          description: "Your progress has been saved.",
        });
        return;
      }

      // Only for complete submissions, do the full validation and database operations
      // Check if killer questions are answered and validate
      const unansweredQuestions = killerQuestions.filter(q => 
        killerAnswers[q.id] === undefined || killerAnswers[q.id] === null || killerAnswers[q.id] === ''
      );

      if (unansweredQuestions.length > 0) {
        toast({
          title: "Please answer all questions",
          description: "All eligibility questions must be answered before submitting",
          variant: "destructive"
        });
        return;
      }

      if (disqualified) {
        toast({
          title: "Application cannot be submitted",
          description: "Based on your answers to the eligibility questions, you are not eligible for this position.",
          variant: "destructive"
        });
        return;
      }

      // Get user's email from PHF data
      const userEmail = phfData.personalDetails?.email;
      if (!userEmail) {
        throw new Error('Email is required for submission');
      }

      // Create or find candidate
      const candidateData = {
        name: `${phfData.personalDetails?.firstNames || ''} ${phfData.personalDetails?.familyName || ''}`.trim(),
        email: userEmail,
        phone: phfData.personalDetails?.telephone || '',
        location: phfData.personalDetails?.presentAddress || '',
        work_auth: '',
        linkedin_url: ''
      };

      let candidate;
      const { data: existingCandidate } = await supabase
        .from('candidates')
        .select('*')
        .eq('email', userEmail)
        .maybeSingle();
      // Merge education and employment data from candidate profile if form data is empty
      const mergedPHFData = {
        ...phfData,
        education: phfData.education && phfData.education.length > 0 
          ? phfData.education 
          : (candidateProfile?.phf_education && candidateProfile.phf_education.length > 0
            ? candidateProfile.phf_education 
            : candidateProfile?.education || []),
        employment: phfData.employment && phfData.employment.length > 0 
          ? phfData.employment 
          : (candidateProfile?.phf_work_experience && candidateProfile.phf_work_experience.length > 0
            ? candidateProfile.phf_work_experience 
            : candidateProfile?.work_experience || [])
      };
        
      if (existingCandidate) {
        // Update existing candidate
        const { error: updateError } = await supabase
          .from('candidates')
          .update(candidateData)
          .eq('id', existingCandidate.id);
        
        if (updateError) throw updateError;
        candidate = { ...existingCandidate, ...candidateData };
      } else {
        const { data: newCandidate, error: candidateError } = await supabase
          .from('candidates')
          .insert(candidateData)
          .select()
          .single();

        if (candidateError) throw candidateError;
        candidate = newCandidate;
      }

      // Track the final application ID for email sending
      let finalApplicationId = applicationId;

      if (applicationId) {
        // Update existing application with PHF completion
        console.log('Updating application:', applicationId, 'to status: Application');
        
        const { error: updateError } = await supabase
          .from('applications')
          .update({
            phf_data: mergedPHFData,
            phf_completed: true,
            answers: killerAnswers,
            status: 'Application' as const,
            updated_at: new Date().toISOString()
          })
          .eq('id', applicationId);

        if (updateError) {
          console.error('Error updating application:', updateError);
          throw updateError;
        }

        // Verify the status was updated correctly
        const { data: verifyApp } = await supabase
          .from('applications')
          .select('status')
          .eq('id', applicationId)
          .single();
        
        if (verifyApp?.status !== 'Application') {
          console.warn('Status not updated correctly, retrying status update...');
          const { error: statusRetryError } = await supabase
            .from('applications')
            .update({ status: 'Application' as const })
            .eq('id', applicationId);
          
          if (statusRetryError) {
            console.error('Status retry failed:', statusRetryError);
          }
        } else {
          console.log('Application status verified as Application');
        }
      } else {
        // Create new application
        const applicationData = {
          job_id: jobId,
          candidate_id: candidate.id,
          status: 'Application' as const,
          phf_data: mergedPHFData,
          phf_completed: true,
          answers: killerAnswers
        };

        const { data: application, error: applicationError } = await supabase
          .from('applications')
          .insert(applicationData)
          .select()
          .single();

        if (applicationError) throw applicationError;
        finalApplicationId = application.id;
        setApplicationId(application.id);
      }

      // Sync PHF data back to candidate profile
      try {
        const profileUpdates = updateProfileFromPHF(mergedPHFData);
        
        const { error: profileSyncError } = await supabase
          .from('candidates')
          .update({
            ...profileUpdates,
            updated_at: new Date().toISOString()
          })
          .eq('id', candidate.id);
        
        if (profileSyncError) {
          console.error('Error syncing PHF to profile:', profileSyncError);
          // Don't fail the submission, just log the error
        } else {
          console.log('Profile updated from PHF data successfully');
        }
      } catch (syncError) {
        console.error('Failed to sync PHF to profile:', syncError);
      }

      // Clear saved progress since application is now submitted
      const progressKey = `phf_progress_${jobId}`;
      localStorage.removeItem(progressKey);
      
      setCurrentStep('success');
      toast({
        title: "Application submitted successfully!",
        description: "Thank you for your application. We will review it and get back to you."
      });

      // Send application confirmation email
      try {
        const firstName = phfData.personalDetails?.firstNames?.split(' ')[0] || 
                         phfData.personalDetails?.familyName || 'Candidate';
        
        console.log('Sending application confirmation email to:', userEmail, 'for application:', finalApplicationId);
        
        const { data, error: emailError } = await supabase.functions.invoke('send-application-confirmation', {
          body: {
            candidateEmail: userEmail,
            candidateFirstName: firstName,
            positionTitle: job?.title || 'the position',
            applicationId: finalApplicationId,
            jobId: jobId
          }
        });
        
        if (emailError) {
          console.error('Email sending failed:', emailError);
          toast({
            title: "Application submitted",
            description: "Your application was submitted successfully, but the confirmation email may be delayed.",
          });
        } else {
          console.log('Confirmation email sent successfully:', data);
        }
      } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError);
      }

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

  // Killer questions are now handled within the PHF form as the first tab
  const renderKillerQuestions = () => null;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading application form...</p>
        </div>
      </div>
    );
  }

  if (!job) {
    return null;
  }

  // Show profile incomplete warning
  if (profileIncomplete) {
    return (
      <div className="min-h-screen bg-background">
        <div className="bg-white border-b">
          <div className="container mx-auto px-4 py-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/jobs')}
              className="flex items-center gap-2 mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Jobs
            </Button>
            <h1 className="text-2xl font-bold text-foreground">
              {job.title}
            </h1>
          </div>
        </div>
        
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-5 w-5" />
            <AlertTitle className="text-lg font-semibold">Profile Incomplete</AlertTitle>
            <AlertDescription className="mt-2">
              <p className="mb-4">
                Before you can apply for this position, you need to complete your candidate profile with the following information:
              </p>
              <ul className="list-disc list-inside space-y-1 mb-4">
                <li>Basic personal information</li>
                <li>Education history (at least one entry)</li>
                <li>Work experience (at least one entry)</li>
              </ul>
              <p className="text-sm">
                This information will be used to pre-fill your application form and ensure we have the necessary details to evaluate your candidacy.
              </p>
            </AlertDescription>
          </Alert>
          
          <div className="flex gap-3">
            <Button onClick={() => navigate(candidateSlug ? `/candidate-profile/${candidateSlug}/edit` : (candidateId ? `/candidate-profile/${candidateId}/edit` : '/my-profile'))} size="lg">
              <User className="h-4 w-4 mr-2" />
              Complete My Profile
            </Button>
            <Button variant="outline" onClick={() => navigate('/jobs')} size="lg">
              Back to Jobs
            </Button>
          </div>
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
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Jobs
            </Button>
          </div>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                {job.title}
              </h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{job.location}</span>
                <span>{job.org_unit}</span>
                {job.closing_date && (
                  <Badge variant="outline">
                    Closes: {new Date(job.closing_date).toLocaleDateString('en-GB')}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {currentStep === 'phf' && (
          <>
            {disqualified && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Based on your answers to the eligibility questions, you are not eligible for this position.
                </AlertDescription>
              </Alert>
            )}

            {renderKillerQuestions()}

            <Card>
              <CardHeader>
                <CardTitle>Personal History Form</CardTitle>
                <CardDescription>
                  Please complete this comprehensive form with your personal and professional details.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PHFForm
                  onSave={handlePHFSubmit}
                  initialData={phfData}
                  killerQuestions={killerQuestions}
                  killerAnswers={killerAnswers}
                  onKillerAnswerChange={(questionId, answer) => 
                    setKillerAnswers(prev => ({ ...prev, [questionId]: answer }))
                  }
                  disqualified={disqualified}
                  completedTabs={completedTabs}
                  onTabCompleted={markTabCompleted}
                  initialTab={initialTab}
                  candidateProfile={candidateProfile}
                  onProgressChange={(tab) => setCurrentTab(tab)}
                />
              </CardContent>
            </Card>
          </>
        )}

        {currentStep === 'success' && (
          <Card className="max-w-2xl mx-auto text-center">
            <CardContent className="pt-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Application Submitted Successfully!
              </h2>
              <p className="text-muted-foreground mb-6">
                Thank you for applying to {job.title}. We have received your application and will review it carefully. 
                You should receive a confirmation email shortly.
              </p>
              <div className="space-y-3">
                <Button onClick={() => navigate('/')} className="w-full">
                  Browse More Jobs
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/my-applications')} 
                  className="w-full"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  View My Applications
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}