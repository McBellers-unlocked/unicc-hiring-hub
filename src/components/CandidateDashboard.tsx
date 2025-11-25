import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { User, AlertCircle, FileText, Search, Video, Clock, AlertTriangle, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import ProfileHero from './profile/ProfileHero';
import ProfileStatsCards from './profile/ProfileStatsCards';
import ProfileAnalyticsSection from './profile/ProfileAnalyticsSection';
import JobRecommendationsSection from './profile/JobRecommendationsSection';
import EnhancedSkillsSection from './profile/EnhancedSkillsSection';
import EnhancedLanguagesSection from './profile/EnhancedLanguagesSection';
import WorkExperienceTimeline from './profile/WorkExperienceTimeline';
import EducationTimeline from './profile/EducationTimeline';
import CertificationsGrid from './profile/CertificationsGrid';
import JobsContent from './dashboard/JobsContent';
import MyApplicationsContent from './dashboard/MyApplicationsContent';

interface CandidateProfile {
  id: string;
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

export default function CandidateDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const [outstandingTasks, setOutstandingTasks] = useState<any[]>([]);
  const [upcomingInterviews, setUpcomingInterviews] = useState<any[]>([]);

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
        // Parse languages from JSONB to array format
        let languagesArray: any[] = [];
        if (data.languages && typeof data.languages === 'object' && !Array.isArray(data.languages)) {
          // Convert languages object to array format
          languagesArray = Object.entries(data.languages).map(([language, proficiency]) => ({
            language,
            proficiency
          }));
        } else if (Array.isArray(data.languages)) {
          languagesArray = data.languages;
        }

        // Remove the raw languages object and replace with converted array
        const { languages: _languages, ...restData } = data;

        // Calculate current position and organization
        const workExp = Array.isArray(data.work_experience) ? data.work_experience : [];
        const currentPos = getCurrentPosition(workExp);
        const currentOrg = getCurrentOrganization(workExp);
        const experienceMonths = calculateYearsOfExperience(workExp);
        
        // Ensure arrays are properly handled
        setProfile({
          ...restData,
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

      // Fetch video assignments that are pending or in progress
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

      // Fetch booked interviews for upcoming reminders
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
        // Filter for future interviews and sort by datetime
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

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Calculate years of experience from work history
  const calculateYearsOfExperience = (workExperience: any[]) => {
    if (!workExperience || workExperience.length === 0) return 0;
    
    let totalMonths = 0;
    
    workExperience.forEach((job: any) => {
      if (job.from_year || job.startDate) {
        let startYear, startMonth, endYear, endMonth;
        
        // Handle different date formats
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
          return; // Skip invalid entries
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
    
    return totalMonths; // Return total months instead of years
  };

  // Helper functions to derive current position from work experience
  const getCurrentPosition = (workExperience: any[]) => {
    if (!workExperience || !Array.isArray(workExperience) || workExperience.length === 0) {
      return null;
    }
    
    // Sort work experience by start date (most recent first)
    const sortedExperience = [...workExperience].sort((a, b) => {
      const aDate = a.start_date || a.startDate;
      const bDate = b.start_date || b.startDate;
      if (!aDate || !bDate) return 0;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });
    
    // Find the most recent position (current or most recent if no current)
    const currentJob = sortedExperience.find(job => 
      job.is_present || job.isCurrent || !job.end_date || job.end_date === '' || !job.endDate
    ) || sortedExperience[0];
    
    return currentJob?.position_title || currentJob?.position || currentJob?.title || null;
  };

  const getCurrentOrganization = (workExperience: any[]) => {
    if (!workExperience || !Array.isArray(workExperience) || workExperience.length === 0) {
      return null;
    }
    
    // Sort work experience by start date (most recent first)
    const sortedExperience = [...workExperience].sort((a, b) => {
      const aDate = a.start_date || a.startDate;
      const bDate = b.start_date || b.startDate;
      if (!aDate || !bDate) return 0;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });
    
    // Find the most recent position (current or most recent if no current)
    const currentJob = sortedExperience.find(job => 
      job.is_present || job.isCurrent || !job.end_date || job.end_date === '' || !job.endDate
    ) || sortedExperience[0];
    
    return currentJob?.organization || currentJob?.company || null;
  };

  const getAvailabilityColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'not available':
        return 'bg-red-100 text-red-800';
      case 'open to opportunities':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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
      {/* Enhanced Profile Hero */}
      <ProfileHero 
        profile={profile}
        isOwnProfile={true}
        onEdit={() => navigate(`/candidate-profile/${profile.id}/edit`)}
      />

      {/* Stats Cards */}
      <ProfileStatsCards 
        profileCompletionPercentage={profile.profile_completion_percentage || 0}
        yearsOfExperience={profile.years_of_experience || 0}
        skillsCount={profile.skills?.length || 0}
        certificationsCount={profile.certifications?.length || 0}
      />

      {/* Upcoming Interviews */}
      {upcomingInterviews.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Interviews
            </CardTitle>
            <CardDescription>
              You have {upcomingInterviews.length} scheduled {upcomingInterviews.length === 1 ? 'interview' : 'interviews'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingInterviews.map((interview) => (
              <div
                key={interview.id}
                className="flex items-center justify-between p-4 bg-background rounded-lg border"
              >
                <div className="flex items-start gap-3 flex-1">
                  <Calendar className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">{interview.jobTitle}</h4>
                    <p className="text-sm text-muted-foreground mb-2">{interview.noticeNo}</p>
                    <div className="flex flex-col gap-1 text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {new Date(interview.datetime).toLocaleDateString('en-GB', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })} at {new Date(interview.datetime).toLocaleTimeString('en-GB', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span>Duration: {interview.duration} minutes</span>
                        {interview.location && (
                          <>
                            <span>•</span>
                            <span>{interview.location}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <Badge variant="secondary">
                  Confirmed
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Outstanding Tasks */}
      {outstandingTasks.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-900">
              <AlertTriangle className="h-5 w-5" />
              Outstanding Tasks
            </CardTitle>
            <CardDescription className="text-orange-700">
              You have {outstandingTasks.length} pending {outstandingTasks.length === 1 ? 'task' : 'tasks'} requiring your attention
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {outstandingTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-4 bg-white rounded-lg border border-orange-200"
              >
                <div className="flex items-start gap-3 flex-1">
                  {task.type === 'video_interview' ? (
                    <Video className="h-5 w-5 text-orange-600 mt-0.5" />
                  ) : (
                    <Calendar className="h-5 w-5 text-orange-600 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-gray-900">{task.title}</h4>
                      {task.priority === 'high' && (
                        <Badge variant="destructive" className="text-xs">
                          Urgent
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{task.description}</p>
                    <div className="flex items-center gap-1 mt-2 text-xs text-orange-700">
                      <Clock className="h-3 w-3" />
                      <span>
                        Due {new Date(task.deadline).toLocaleDateString('en-GB')}
                      </span>
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={task.priority === 'high' ? 'default' : 'outline'}
                  onClick={() => {
                    if (task.type === 'panel_interview_booking') {
                      navigate(`/book-interview/${task.applicationId}`);
                    } else {
                      navigate(`/my-applications`);
                    }
                  }}
                >
                  {task.type === 'panel_interview_booking' 
                    ? 'Book Slot' 
                    : (task.status === 'NotStarted' ? 'Start' : 'Continue')
                  }
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Profile Completion Alert */}
      {hasIncompleteProfile() && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Complete your profile to maximize opportunities!</strong>
            <br />
            A complete profile helps you get discovered by hiring managers and ensures you're considered for future openings across the organization. 
            {(profile.profile_completion_percentage || 0) < 50 && (
              <span> You're at {profile.profile_completion_percentage || 0}% completion.</span>
            )}
            <Button
              variant="link"
              className="p-0 h-auto ml-2"
              onClick={() => navigate(`/candidate-profile/${profile.id}/edit`)}
            >
              Complete now →
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Profile Analytics */}
      <ProfileAnalyticsSection 
        profileId={profile.id}
        completionPercentage={profile.profile_completion_percentage || 0}
      />

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            My Profile
          </TabsTrigger>
          <TabsTrigger value="jobs" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Browse Jobs
          </TabsTrigger>
          <TabsTrigger value="applications" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            My Applications
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile" className="mt-6 space-y-6">
          {/* Job Recommendations */}
          <JobRecommendationsSection candidateProfile={profile} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              <WorkExperienceTimeline workExperience={profile.work_experience || []} />
              <EducationTimeline education={profile.education || []} />
              <CertificationsGrid certifications={profile.certifications || []} />
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <EnhancedSkillsSection skills={profile.skills || []} />
              <EnhancedLanguagesSection languages={profile.languages} />
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="jobs" className="mt-6">
          <JobsContent />
        </TabsContent>
        
        <TabsContent value="applications" className="mt-6">
          <MyApplicationsContent />
        </TabsContent>
      </Tabs>
    </div>
  );
}