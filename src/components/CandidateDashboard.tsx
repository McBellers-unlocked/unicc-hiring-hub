import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { 
  User, AlertCircle, Video, Clock, AlertTriangle, Calendar, 
  Briefcase, ChevronRight, CheckCircle2, Eye
} from 'lucide-react';

import WelcomeHeader from './dashboard/WelcomeHeader';
import ApplicationPipelineTracker from './dashboard/ApplicationPipelineTracker';
import JobRecommendationsSection from './profile/JobRecommendationsSection';

interface CandidateProfile {
  id: string;
  slug?: string;
  name: string;
  email: string;
  phone?: string;
  location?: string;
  professional_summary?: string;
  profile_completion_percentage: number;
  photo_url?: string;
  profile_photo_url?: string;
  years_of_experience?: number;
  availability_status?: string;
  work_experience?: any[];
  education?: any[];
  skills?: string[];
  languages?: any;
  certifications?: any[];
  un_organizations_worked?: string[];
  current_position?: string;
  current_organization?: string;
  linkedin_url?: string;
  willing_to_relocate?: boolean;
  un_experience?: boolean;
  preferred_locations?: string[];
}

interface CandidateDashboardProps {
  hideWelcomeHeader?: boolean;
}

export default function CandidateDashboard({ hideWelcomeHeader = false }: CandidateDashboardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [outstandingTasks, setOutstandingTasks] = useState<any[]>([]);
  const [upcomingInterviews, setUpcomingInterviews] = useState<any[]>([]);
  const [activeApplicationsCount, setActiveApplicationsCount] = useState(0);

  useEffect(() => {
    if (user) {
      fetchCandidateProfile();
      fetchOutstandingTasks();
    }
  }, [user]);

  const fetchCandidateProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('candidates')
        .select('*')
        .eq('email', user?.email)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const workExp = Array.isArray(data.work_experience) ? data.work_experience : [];
        const currentPos = getCurrentPosition(workExp);
        const currentOrg = getCurrentOrganization(workExp);
        const experienceMonths = calculateYearsOfExperience(workExp);
        
        setProfile({
          ...data,
          work_experience: workExp,
          education: Array.isArray(data.education) ? data.education : [],
          skills: Array.isArray(data.skills) ? data.skills.map((s: any) => String(s)) : [],
          languages: data.languages,
          certifications: Array.isArray(data.certifications) ? data.certifications : [],
          un_organizations_worked: Array.isArray(data.un_organizations_worked) ? data.un_organizations_worked.map((o: any) => String(o)) : [],
          current_position: currentPos,
          current_organization: currentOrg,
          profile_photo_url: data.profile_photo_url,
          years_of_experience: experienceMonths > 0 ? Math.round(experienceMonths / 12 * 10) / 10 : data.years_of_experience,
          preferred_locations: Array.isArray(data.preferred_locations) ? data.preferred_locations.map((l: any) => String(l)) : []
        });

        // Fetch active applications count
        const { count } = await supabase
          .from('applications')
          .select('*', { count: 'exact', head: true })
          .eq('candidate_id', data.id);
        
        setActiveApplicationsCount(count || 0);
      }
    } catch (error) {
      console.error('Error fetching candidate profile:', error);
      toast({
        title: "Error",
        description: "Failed to load your profile",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchOutstandingTasks = async () => {
    try {
      const { data: candidateData } = await supabase
        .from('candidates')
        .select('id')
        .eq('email', user?.email)
        .maybeSingle();

      if (!candidateData) return;

      // Fetch video assignments that are pending
      const { data: videoTasks } = await supabase
        .from('video_assignments')
        .select(`
          id,
          status,
          deadline_at,
          application_id,
          applications!inner(
            id,
            job_id,
            jobs!inner(
              title,
              notice_no
            )
          )
        `)
        .eq('applications.candidate_id', candidateData.id)
        .in('status', ['NotStarted', 'LinkOpened', 'InProgress'])
        .order('deadline_at', { ascending: true });

      // Fetch panel interview invitations that are pending
      const { data: interviewInvitations } = await supabase
        .from('panel_interview_invitations')
        .select(`
          id,
          status,
          deadline_at,
          application_id,
          job_id,
          applications!inner(
            id,
            jobs!inner(
              title,
              notice_no
            )
          )
        `)
        .eq('status', 'pending')
        .order('deadline_at', { ascending: true });

      const tasks = [];

      if (videoTasks && videoTasks.length > 0) {
        tasks.push(...videoTasks.map((task: any) => ({
          id: task.id,
          type: 'video_interview',
          title: `Video Interview - ${task.applications.jobs.title}`,
          description: `Complete your video interview for ${task.applications.jobs.notice_no}`,
          deadline: task.deadline_at,
          status: task.status,
          applicationId: task.application_id,
          priority: new Date(task.deadline_at) < new Date(Date.now() + 24 * 60 * 60 * 1000) ? 'high' : 'medium'
        })));
      }

      if (interviewInvitations && interviewInvitations.length > 0) {
        tasks.push(...interviewInvitations.map((invitation: any) => ({
          id: invitation.id,
          type: 'panel_interview_booking',
          title: `Book Interview - ${invitation.applications.jobs.title}`,
          description: `Select your preferred interview time for ${invitation.applications.jobs.notice_no}`,
          deadline: invitation.deadline_at,
          status: invitation.status,
          applicationId: invitation.application_id,
          jobId: invitation.job_id,
          priority: new Date(invitation.deadline_at) < new Date(Date.now() + 24 * 60 * 60 * 1000) ? 'high' : 'medium'
        })));
      }

      setOutstandingTasks(tasks);

      // Fetch booked interviews
      const { data: bookedInterviews } = await supabase
        .from('panel_interview_invitations')
        .select(`
          id,
          status,
          booked_at,
          booked_slot_id,
          panel_interview_time_slots:booked_slot_id(
            slot_datetime,
            duration_minutes
          ),
          applications:application_id!inner(
            id,
            candidate_id,
            jobs:job_id(
              title,
              notice_no,
              location
            )
          )
        `)
        .eq('applications.candidate_id', candidateData.id)
        .eq('status', 'booked');

      if (bookedInterviews && bookedInterviews.length > 0) {
        const futureInterviews = bookedInterviews
          .filter((interview: any) => 
            interview.panel_interview_time_slots && 
            new Date(interview.panel_interview_time_slots.slot_datetime) > new Date()
          )
          .sort((a: any, b: any) => 
            new Date(a.panel_interview_time_slots.slot_datetime).getTime() - 
            new Date(b.panel_interview_time_slots.slot_datetime).getTime()
          );

        setUpcomingInterviews(futureInterviews.map((interview: any) => ({
          id: interview.id,
          datetime: interview.panel_interview_time_slots.slot_datetime,
          duration: interview.panel_interview_time_slots.duration_minutes,
          jobTitle: interview.applications.jobs.title,
          noticeNo: interview.applications.jobs.notice_no,
          location: interview.applications.jobs.location,
          bookedAt: interview.booked_at
        })));
      }
    } catch (error) {
      console.error('Error fetching outstanding tasks:', error);
    }
  };

  const calculateYearsOfExperience = (workExperience: any[]) => {
    if (!workExperience || workExperience.length === 0) return 0;
    
    let totalMonths = 0;
    
    workExperience.forEach((job: any) => {
      if (job.from_year || job.startDate) {
        let startYear, startMonth, endYear, endMonth;
        
        if (job.from_year) {
          startYear = parseInt(job.from_year);
          startMonth = parseInt(job.from_month) || 1;
        } else if (job.startDate) {
          const [year, month] = job.startDate.split('-');
          startYear = parseInt(year);
          startMonth = parseInt(month) || 1;
        }
        
        if (job.is_present || job.isCurrent) {
          const now = new Date();
          endYear = now.getFullYear();
          endMonth = now.getMonth() + 1;
        } else if (job.to_year) {
          endYear = parseInt(job.to_year);
          endMonth = parseInt(job.to_month) || 12;
        } else if (job.endDate) {
          const [year, month] = job.endDate.split('-');
          endYear = parseInt(year);
          endMonth = parseInt(month) || 12;
        } else {
          return;
        }
        
        if (startYear && endYear) {
          const startDate = new Date(startYear, startMonth - 1);
          const endDate = new Date(endYear, endMonth - 1);
          const monthDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth());
          
          if (monthDiff > 0) {
            totalMonths += monthDiff;
          }
        }
      }
    });
    
    return totalMonths;
  };

  const getCurrentPosition = (workExperience: any[]) => {
    if (!workExperience || !Array.isArray(workExperience) || workExperience.length === 0) {
      return null;
    }
    
    const sortedExperience = [...workExperience].sort((a, b) => {
      const aDate = a.start_date || a.startDate;
      const bDate = b.start_date || b.startDate;
      if (!aDate || !bDate) return 0;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });
    
    const currentJob = sortedExperience.find(job => 
      job.is_present || job.isCurrent || !job.end_date || job.end_date === '' || !job.endDate
    ) || sortedExperience[0];
    
    return currentJob?.position_title || currentJob?.position || currentJob?.title || null;
  };

  const getCurrentOrganization = (workExperience: any[]) => {
    if (!workExperience || !Array.isArray(workExperience) || workExperience.length === 0) {
      return null;
    }
    
    const sortedExperience = [...workExperience].sort((a, b) => {
      const aDate = a.start_date || a.startDate;
      const bDate = b.start_date || b.startDate;
      if (!aDate || !bDate) return 0;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });
    
    const currentJob = sortedExperience.find(job => 
      job.is_present || job.isCurrent || !job.end_date || job.end_date === '' || !job.endDate
    ) || sortedExperience[0];
    
    return currentJob?.organization || currentJob?.company || null;
  };

  const hasIncompleteProfile = () => {
    if (!profile) return true;
    
    const mandatoryFields = [
      profile.name,
      profile.email,
      profile.phone,
      profile.location,
      profile.professional_summary,
    ];
    
    const hasMandatoryFields = mandatoryFields.every(field => field && field.trim() !== '');
    const hasWorkExperience = profile.work_experience && profile.work_experience.length > 0;
    const hasEducation = profile.education && profile.education.length > 0;
    
    return !hasMandatoryFields || !hasWorkExperience || !hasEducation || (profile.profile_completion_percentage || 0) < 50;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <User className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">Profile Not Found</h3>
        <p className="text-muted-foreground mb-6">We couldn't find your profile. Please try again.</p>
        <Button onClick={() => navigate('/candidate-profile/edit')}>
          Create Profile
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Compact Welcome Header - only show if not embedded */}
      {!hideWelcomeHeader && (
        <WelcomeHeader 
          profile={profile}
          activeApplicationsCount={activeApplicationsCount}
          upcomingInterviewsCount={upcomingInterviews.length}
        />
      )}

      {/* Priority Section: Tasks & Interviews */}
      {(outstandingTasks.length > 0 || upcomingInterviews.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Outstanding Tasks */}
          {outstandingTasks.length > 0 && (
            <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-900">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-orange-900 dark:text-orange-200 text-base">
                  <AlertTriangle className="h-5 w-5" />
                  Action Required
                </CardTitle>
                <CardDescription className="text-orange-700 dark:text-orange-300">
                  {outstandingTasks.length} pending {outstandingTasks.length === 1 ? 'task' : 'tasks'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {outstandingTasks.slice(0, 3).map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 bg-background rounded-lg border border-orange-200 dark:border-orange-800"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {task.type === 'video_interview' ? (
                        <Video className="h-4 w-4 text-orange-600 shrink-0" />
                      ) : (
                        <Calendar className="h-4 w-4 text-orange-600 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-sm truncate">{task.title}</h4>
                          {task.priority === 'high' && (
                            <Badge variant="destructive" className="text-xs px-1.5 py-0">
                              Urgent
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          Due {new Date(task.deadline).toLocaleDateString('en-GB')}
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={task.priority === 'high' ? 'default' : 'outline'}
                      className="shrink-0 ml-2"
                      onClick={() => {
                        if (task.type === 'panel_interview_booking') {
                          navigate(`/book-interview/${task.applicationId}`);
                        } else {
                          navigate(`/my-applications`);
                        }
                      }}
                    >
                      {task.type === 'panel_interview_booking' ? 'Book' : 'Start'}
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Upcoming Interviews */}
          {upcomingInterviews.length > 0 && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="h-5 w-5" />
                  Upcoming Interviews
                </CardTitle>
                <CardDescription>
                  {upcomingInterviews.length} scheduled
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {upcomingInterviews.slice(0, 2).map((interview) => (
                  <div
                    key={interview.id}
                    className="p-3 bg-background rounded-lg border"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-sm">{interview.jobTitle}</h4>
                        <p className="text-xs text-muted-foreground">{interview.noticeNo}</p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Confirmed
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>
                        {new Date(interview.datetime).toLocaleDateString('en-GB', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric'
                        })} at {new Date(interview.datetime).toLocaleTimeString('en-GB', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      <span className="text-muted-foreground">•</span>
                      <span>{interview.duration} min</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Profile Completion Alert */}
      {hasIncompleteProfile() && (
        <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="flex items-center justify-between">
            <div>
              <strong className="text-amber-900 dark:text-amber-200">Complete your profile to maximize opportunities!</strong>
              <span className="text-amber-700 dark:text-amber-300 ml-1">
                You're at {profile.profile_completion_percentage || 0}% completion.
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 ml-4 border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300"
              onClick={() => navigate(`/candidate-profile/${profile.slug || profile.id}/edit`)}
            >
              Complete Profile
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content: Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Pipeline & Recommendations */}
        <div className="lg:col-span-2 space-y-6">
          {/* Application Pipeline */}
          <ApplicationPipelineTracker />
          
          {/* Job Recommendations */}
          <JobRecommendationsSection candidateProfile={profile} />
        </div>

        {/* Right Column - Quick Profile Summary */}
        <div className="space-y-4">
          {/* Profile Summary Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                Profile Summary
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => navigate(`/candidate-profile/${profile.slug || profile.id}`)}
                  className="text-muted-foreground h-7 px-2"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Completion Progress */}
              <div>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="text-muted-foreground">Profile Completion</span>
                  <span className="font-medium">{profile.profile_completion_percentage || 0}%</span>
                </div>
                <Progress value={profile.profile_completion_percentage || 0} className="h-2" />
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-foreground">
                    {profile.years_of_experience || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Years Exp.</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-foreground">
                    {profile.skills?.length || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Skills</div>
                </div>
              </div>

              {/* Quick Info */}
              <div className="space-y-2 text-sm">
                {profile.location && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Location</span>
                    <span className="font-medium truncate ml-2">{profile.location}</span>
                  </div>
                )}
                {profile.un_experience && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">UN Experience</span>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                      Yes
                    </Badge>
                  </div>
                )}
                {profile.certifications && profile.certifications.length > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Certifications</span>
                    <span className="font-medium">{profile.certifications.length}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate('/jobs')}
              >
                <Briefcase className="h-4 w-4 mr-2" />
                Browse Jobs
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate('/my-applications')}
              >
                <Briefcase className="h-4 w-4 mr-2" />
                My Applications
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate(`/candidate-profile/${profile.slug || profile.id}`)}
              >
                <User className="h-4 w-4 mr-2" />
                View Full Profile
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
