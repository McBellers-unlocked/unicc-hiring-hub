import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Search, Filter, User, FileText, Calendar, AlertCircle, Trash2, Eye, ChevronDown, ChevronRight, GraduationCap, Briefcase, Languages, Plus, Check, X, Edit, Users, ArrowLeft, Video } from 'lucide-react';
import { format } from 'date-fns';
import { getCountryFlagUrl } from '@/lib/countryFlags';
import { CandidateApplicationCard } from '@/components/CandidateApplicationCard';
import { ActionConfirmationDialog } from '@/components/ActionConfirmationDialog';
import { VideoAssignmentDialog } from '@/components/VideoAssignmentDialog';
import { BulkVideoAssignmentDialog } from '@/components/BulkVideoAssignmentDialog';
import { TooltipProvider } from '@/components/ui/tooltip';
import { TriggerScoringButton } from '@/components/TriggerScoringButton';

interface Application {
  id: string;
  status: string;
  submitted_at: string;
  updated_at: string;
  suggested_for_longlist: boolean;
  phf_completed: boolean;
  source?: string;
  candidate: {
    id: string;
    name: string;
    email: string;
    location: string | null;
    gender: string | null;
    education: any;
    work_experience: any;
    languages: any;
    years_of_experience: number | null;
    un_experience: boolean;
    skills: any;
  };
  job: {
    id: string;
    title: string;
    org_unit: string | null;
  };
  screening_scores?: {
    ai_score: number | null;
    created_at: string;
    rubric_breakdown?: any;
  }[];
  videoScore?: number | null;
  videoRatingsCount?: number;
}

export default function AdminApplications() {
  const { userRoles } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [completionFilter, setCompletionFilter] = useState('all');
  const [sortBy, setSortBy] = useState('submitted_at');
  const [selectedJobId, setSelectedJobId] = useState(searchParams.get('job') || '');
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedApplications, setSelectedApplications] = useState<Set<string>>(new Set());
  const [educationFilter, setEducationFilter] = useState('all');
  const [experienceFilter, setExperienceFilter] = useState('all');
  const [languageFilter, setLanguageFilter] = useState('all');
  const [aiScoreFilter, setAiScoreFilter] = useState('all');
  const [requirementsFilter, setRequirementsFilter] = useState('all');
  
  // Dialog state
  const [dialogState, setDialogState] = useState<{
    open: boolean;
    action: 'longlist' | 'shortlist' | 'reject' | 'add-to-shortlist' | 'add-to-video' | 'move-to-panel-interview' | 'move-to-recommended' | 'move-to-roster';
    applicationId: string;
    candidateName: string;
    currentStatus: string;
    isToggleAction?: boolean;
  }>({
    open: false,
    action: 'longlist',
    applicationId: '',
    candidateName: '',
    currentStatus: '',
    isToggleAction: false
  });

  // Interview scores for Panel Interview candidates
  const [interviewScores, setInterviewScores] = useState<Record<string, { score: number; rank: number }>>({});

  // Video Assignment Dialog state
  const [videoAssignmentDialog, setVideoAssignmentDialog] = useState<{
    open: boolean;
    applicationId: string;
    candidateName: string;
  }>({
    open: false,
    applicationId: '',
    candidateName: ''
  });

  const [jobVideoQuestions, setJobVideoQuestions] = useState<Record<string, boolean>>({});

  // Bulk Video Assignment Dialog state
  const [bulkVideoAssignmentDialog, setBulkVideoAssignmentDialog] = useState(false);

  // Test data generation state
  const [generatingTestData, setGeneratingTestData] = useState(false);

  // Check access permissions
  const hasAccess = userRoles.includes('Admin') || userRoles.includes('HR Assistant') || 
                   userRoles.includes('Chief of HR') || userRoles.includes('Hiring Manager') || 
                   userRoles.includes('Panel Member');
  
  useEffect(() => {
    if (hasAccess) {
      fetchJobs();
      const jobId = searchParams.get('job');
      const status = searchParams.get('status');
      if (jobId) {
        setSelectedJobId(jobId);
        fetchApplications(jobId);
      }
      if (status) {
        setStatusFilter(status);
      }
    }
  }, [hasAccess, searchParams]);

  const fetchJobs = async () => {
    try {
      let query = supabase
        .from('jobs')
        .select('id, title, status')
        .order('updated_at', { ascending: false });

      // For hiring managers, check if they have job-specific assignments
      if (userRoles.includes('Hiring Manager') && !userRoles.includes('Admin') && !userRoles.includes('HR Assistant')) {
        const { data: user } = await supabase.auth.getUser();
        if (user?.user?.id) {
          const { data: assignments } = await supabase
            .from('job_hiring_managers')
            .select('job_id')
            .eq('user_id', user.user.id);
          
          if (assignments && assignments.length > 0) {
            const jobIds = assignments.map(a => a.job_id);
            query = query.in('id', jobIds);
          } else {
            // If no assignments, show no jobs
            setJobs([]);
            return;
          }
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      setJobs(data || []);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    }
  };

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

  const fetchApplications = async (jobId?: string) => {
    if (!jobId) return;
    
    try {
      setLoading(true);
      
      // First get job details
      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .select('id, title, org_unit')
        .eq('id', jobId)
        .single();

      if (jobError) throw jobError;
      setSelectedJob(jobData);

      // Then get applications for this job with detailed candidate info
      const { data, error } = await supabase
        .from('applications')
        .select(`
          id,
          status,
          submitted_at,
          updated_at,
          suggested_for_longlist,
          phf_completed,
          phf_data,
          source,
          candidate:candidates(
            id, name, email, location, gender, education, work_experience, 
            languages, years_of_experience, un_experience, skills,
            present_city, present_country, permanent_city, permanent_country
          ),
          job:jobs(id, title, org_unit),
          screening_scores(ai_score, created_at)
        `)
        .eq('job_id', jobId)
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      
      // Check for video assignments and fix status if needed
      if (data && data.length > 0) {
        const { data: videoAssignments } = await supabase
          .from('video_assignments')
          .select('application_id')
          .in('application_id', data.map(app => app.id));
        
        if (videoAssignments && videoAssignments.length > 0) {
          const assignmentAppIds = videoAssignments.map(va => va.application_id);
          const appsNeedingUpdate = data.filter(app => 
            assignmentAppIds.includes(app.id) && app.status !== 'Pre-Recorded Video'
          );
          
          // Update status for applications with video assignments
          // BUT only if they're not already in Panel Interview or beyond
          if (appsNeedingUpdate.length > 0) {
            const appsToUpdate = appsNeedingUpdate.filter(app => 
              !['Panel Interview', 'Recommended', 'Offer', 'Roster'].includes(app.status)
            );
            
            if (appsToUpdate.length > 0) {
              await supabase
                .from('applications')
                .update({ status: 'Pre-Recorded Video' })
                .in('id', appsToUpdate.map(app => app.id));
              
              // Refetch to get updated data
              const { data: updatedData } = await supabase
                .from('applications')
                .select(`
                  id,
                  status,
                  submitted_at,
                  updated_at,
                  suggested_for_longlist,
                  phf_completed,
                  phf_data,
                  source,
                  candidate:candidates(
                    id, name, email, location, gender, education, work_experience, 
                    languages, years_of_experience, un_experience, skills,
                    present_city, present_country, permanent_city, permanent_country
                  ),
                  job:jobs(id, title, org_unit),
                  screening_scores(ai_score, created_at)
                `)
                .eq('job_id', jobId)
                .order('submitted_at', { ascending: false });
              
              setApplications(updatedData || []);
            } else {
              setApplications(data);
            }
          } else {
            setApplications(data);
          }
        } else {
          setApplications(data);
        }
      } else {
        setApplications([]);
      }

      // Fetch video scores for all applications
      if (data && data.length > 0) {
        const { data: videoData } = await supabase
          .from('video_answers')
          .select(`
            application_id,
            video_ratings(rating)
          `)
          .in('application_id', data.map(app => app.id));

        if (videoData) {
          // Calculate average rating per application
          const scoresByApp: Record<string, { total: number; count: number }> = {};
          
          videoData.forEach((va: any) => {
            if (va.video_ratings && va.video_ratings.length > 0) {
              va.video_ratings.forEach((rating: any) => {
                if (!scoresByApp[va.application_id]) {
                  scoresByApp[va.application_id] = { total: 0, count: 0 };
                }
                scoresByApp[va.application_id].total += rating.rating;
                scoresByApp[va.application_id].count += 1;
              });
            }
          });

          // Merge scores into applications
          const updatedApps = (data || []).map(app => ({
            ...app,
            videoScore: scoresByApp[app.id] 
              ? scoresByApp[app.id].total / scoresByApp[app.id].count 
              : null,
            videoRatingsCount: scoresByApp[app.id]?.count || 0
          }));

          setApplications(updatedApps);
        }
      }

      // Fetch interview scores for Panel Interview candidates
      if (data && data.length > 0) {
        const panelApps = data.filter((app: any) => app.status === 'Panel Interview');
        if (panelApps.length > 0) {
          const { data: responses } = await supabase
            .from('feedback_form_responses')
            .select('application_id, overall, responses')
            .in('application_id', panelApps.map((a: any) => a.id));

          if (responses && responses.length > 0) {
            // Calculate average scores per application
            const scoreMap: Record<string, number[]> = {};
            responses.forEach((r: any) => {
              if (!scoreMap[r.application_id]) scoreMap[r.application_id] = [];
              
              // Use overall if available
              if (r.overall !== null && r.overall !== undefined) {
                scoreMap[r.application_id].push(r.overall);
              } 
              // Fallback: calculate from responses JSONB
              else if (r.responses && typeof r.responses === 'object') {
                const respObj = r.responses as Record<string, any>;
                const scores: number[] = [];
                // Flat structure: each key directly contains {note, score}
                Object.entries(respObj).forEach(([key, item]: [string, any]) => {
                  // Skip overall_notes which is just for notes
                  if (key !== 'overall_notes' && item && typeof item === 'object' && typeof item.score === 'number') {
                    scores.push(item.score);
                  }
                });
                if (scores.length > 0) {
                  const avgFromResponses = scores.reduce((a, b) => a + b, 0) / scores.length;
                  scoreMap[r.application_id].push(avgFromResponses);
                }
              }
            });

            // Filter out applications with no scores, then calculate averages and ranks
            const averages = Object.entries(scoreMap)
              .filter(([_, scores]) => scores.length > 0)
              .map(([appId, scores]) => ({
                applicationId: appId,
                avgScore: scores.reduce((a, b) => a + b, 0) / scores.length,
                percentage: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length / 5) * 100)
              }));

            averages.sort((a, b) => b.avgScore - a.avgScore);

            const result: Record<string, { score: number; rank: number }> = {};
            averages.forEach((a, index) => {
              result[a.applicationId] = { score: a.percentage, rank: index + 1 };
            });

            setInterviewScores(result);
          }
        }
      }

      // Force fresh check for video questions (bypass cache)
      const { data: questionSets } = await supabase
        .from('video_question_sets')
        .select('id, job_id')
        .eq('job_id', jobId);
      
      setJobVideoQuestions(prev => ({
        ...prev,
        [jobId]: questionSets && questionSets.length > 0
      }));
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast({
        title: "Error",
        description: "Failed to load applications",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteApplication = async (applicationId: string, candidateId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this application? This will also delete the candidate record.')) {
      return;
    }

    try {
      // Delete the application (this will cascade delete related records)
      const { error: appError } = await supabase
        .from('applications')
        .delete()
        .eq('id', applicationId);

      if (appError) throw appError;

      // Delete the candidate
      const { error: candidateError } = await supabase
        .from('candidates')
        .delete()
        .eq('id', candidateId);

      if (candidateError) throw candidateError;

      toast({
        title: "Success",
        description: "Application and candidate deleted successfully",
      });

      // Refresh the applications list
      fetchApplications(selectedJobId);
    } catch (error) {
      console.error('Error deleting application:', error);
      toast({
        title: "Error",
        description: "Failed to delete application",
        variant: "destructive",
      });
    }
  };

  // Helper functions for data extraction
  const getAllEducationDetails = (education: any) => {
    if (!education) return [];
    const educationArray = Array.isArray(education) ? education : (education.length ? education : []);
    if (educationArray.length === 0) return [];
    
    // Helper to extract year from various formats
    const extractYear = (value: any): string => {
      if (!value) return '';
      // If it's already a 4-digit year (number or string)
      if (typeof value === 'number' && value > 1900 && value < 2100) {
        return value.toString();
      }
      if (typeof value === 'string') {
        // Check if it's just a 4-digit year string
        if (/^\d{4}$/.test(value)) {
          return value;
        }
        // Otherwise try to parse as a full date
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return date.getFullYear().toString();
        }
      }
      return '';
    };
    
    return educationArray.map((edu: any) => {
      const startYear = extractYear(edu.start_date) || extractYear(edu.startDate) || edu.from_year || '';
      const endYear = extractYear(edu.end_date) || extractYear(edu.endDate) || edu.to_year || edu.year_awarded || '';
      const dateRange = startYear && endYear ? `${startYear} - ${endYear}` : (endYear || '');
      
      return {
        degree: edu.degree || edu.degree_type || 'Not specified',
        fieldOfStudy: edu.field_of_study || edu.field || edu.main_course_of_study || edu.major || edu.subject || '',
        institution: edu.institution || edu.institution_name || edu.university || '',
        year: endYear,
        startYear,
        dateRange
      };
    });
  };

  const getEducationDetails = (education: any) => {
    if (!education) return { degree: 'Not specified', university: '', year: '' };
    const educationArray = Array.isArray(education) ? education : (education.length ? education : []);
    if (educationArray.length === 0) return { degree: 'Not specified', university: '', year: '' };
    
    // Get the most recent or highest degree
    const mostRecent = educationArray[0] || {};
    return {
      degree: mostRecent.degree || mostRecent.degree_type || 'Not specified',
      university: mostRecent.institution || mostRecent.institution_name || '',
      year: mostRecent.end_date ? new Date(mostRecent.end_date).getFullYear().toString() : 
            (mostRecent.to_year || mostRecent.year_awarded || '')
    };
  };

  const getHighestEducation = (education: any) => {
    const details = getEducationDetails(education);
    return details.degree;
  };

  const getLanguageSummary = (languages: any) => {
    if (!languages) return 'Not specified';
    const unLangs = languages.un_languages || {};
    const otherLangs = languages.other_languages || [];
    const allLangs = [...Object.keys(unLangs), ...otherLangs.map((l: any) => l.language || '')];
    return allLangs.slice(0, 3).map(lang => lang.charAt(0).toUpperCase() + lang.slice(1)).join(', ') + (allLangs.length > 3 ? '...' : '');
  };

  const getCurrentJobDetails = (workExp: any) => {
    const workExpArray = Array.isArray(workExp) ? workExp : (workExp?.length ? workExp : []);
    if (workExpArray.length === 0) return { title: 'Not specified', organization: '', length: '' };
    
    const currentJob = workExpArray[0] || {};
    const title = currentJob.position || currentJob.exact_title_of_post || currentJob.title || 'Not specified';
    const organization = currentJob.company || currentJob.employer_name || currentJob.employer || '';
    
    // Calculate length in current position
    const startDate = currentJob.startDate || currentJob.start_date || currentJob.period_from_year;
    let length = '';
    if (startDate) {
      const start = new Date(startDate);
      const end = currentJob.isCurrent || currentJob.is_present ? new Date() : 
                  (currentJob.endDate || currentJob.end_date ? new Date(currentJob.endDate || currentJob.end_date) : new Date());
      const years = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
      const months = Math.floor(((end.getTime() - start.getTime()) % (1000 * 60 * 60 * 24 * 365.25)) / (1000 * 60 * 60 * 24 * 30.44));
      
      if (years > 0) {
        length = months > 0 ? `${years}y ${months}m` : `${years}y`;
      } else if (months > 0) {
        length = `${months}m`;
      } else {
        length = 'New';
      }
    }
    
    return { title, organization, length };
  };

  const getRecentWorkExperience = (workExp: any) => {
    const workExpArray = Array.isArray(workExp) ? workExp : (workExp?.length ? workExp : []);
    if (workExpArray.length === 0) return [{ title: 'Not specified', organization: '', length: '', startDate: '', endDate: '', isCurrent: false }];
    
    // Sort by start date (most recent first)
    const sortedExp = [...workExpArray].sort((a, b) => {
      const aDate = a.startDate || a.start_date || a.period_from_year || '';
      const bDate = b.startDate || b.start_date || b.period_from_year || '';
      if (!aDate || !bDate) return 0;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });
    
    // Get all work experience positions
    return sortedExp.map((exp: any) => {
      const title = exp.position || exp.exact_title_of_post || exp.title || 'Not specified';
      const organization = exp.company || exp.employer_name || exp.employer || '';
      const isCurrent = exp.isCurrent || exp.is_present;
      
      // Calculate length in position
      const rawStartDate = exp.startDate || exp.start_date || exp.period_from_year;
      const rawEndDate = exp.endDate || exp.end_date || exp.period_to_year;
      let length = '';
      let formattedStartDate = '';
      let formattedEndDate = '';
      
      if (rawStartDate) {
        const start = new Date(rawStartDate);
        const end = isCurrent ? new Date() : 
                    (rawEndDate ? new Date(rawEndDate) : new Date());
        const years = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
        const months = Math.floor(((end.getTime() - start.getTime()) % (1000 * 60 * 60 * 24 * 365.25)) / (1000 * 60 * 60 * 24 * 30.44));
        
        if (years > 0) {
          length = months > 0 ? `${years}y ${months}m` : `${years}y`;
        } else if (months > 0) {
          length = `${months}m`;
        } else {
          length = 'New';
        }
        
        // Format dates for display
        formattedStartDate = format(start, 'MMM yyyy');
        formattedEndDate = isCurrent ? 'Present' : (rawEndDate ? format(new Date(rawEndDate), 'MMM yyyy') : '');
      }
      
      return { 
        title, 
        organization, 
        length, 
        startDate: formattedStartDate,
        endDate: formattedEndDate,
        isCurrent
      };
    });
  };

  const getTotalExperience = (workExp: any, yearsExp: number | null) => {
    const workExpArray = Array.isArray(workExp) ? workExp : (workExp?.length ? workExp : []);
    
    // Use provided years_of_experience if available
    if (yearsExp) {
      return `${yearsExp} years`;
    }
    
    // Calculate from work history
    if (workExpArray.length > 0) {
      const totalYears = workExpArray.reduce((total: number, exp: any) => {
        const startDate = exp.startDate || exp.start_date;
        const endDate = exp.endDate || exp.end_date || (exp.isCurrent || exp.is_present ? new Date() : null);
        
        if (startDate) {
          const start = new Date(startDate);
          const end = endDate && !exp.isCurrent && !exp.is_present ? new Date(endDate) : new Date();
          
          const monthsDiff = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
          const yearsDiff = Math.max(0, monthsDiff / 12);
          
          return total + yearsDiff;
        }
        return total;
      }, 0);
      
      return `${Math.round(totalYears || 0)} years`;
    }
    
    return '0 years';
  };

  const getTotalUNExperience = (application: any) => {
    // Check phf_data for UN experience information
    const employment = application.phf_data?.employment || [];
    
    if (!Array.isArray(employment) || employment.length === 0) {
      return '0 years';
    }
    
    const unExperience = employment
      .filter((job: any) => job.is_un_system_post === true)
      .reduce((total: number, job: any) => {
        const fromYear = parseInt(job.period_from_year || job.from_year || '0');
        const fromMonth = parseInt(job.period_from_month || job.from_month || '1');
        const toYear = job.is_present ? new Date().getFullYear() : parseInt(job.period_to_year || job.to_year || new Date().getFullYear().toString());
        const toMonth = job.is_present ? new Date().getMonth() + 1 : parseInt(job.period_to_month || job.to_month || '12');
        
        if (fromYear > 0) {
          const monthsDiff = (toYear - fromYear) * 12 + (toMonth - fromMonth);
          const yearsDiff = Math.max(0, monthsDiff / 12);
          return total + yearsDiff;
        }
        return total;
      }, 0);
    
    return `${Math.round(unExperience)} years`;
  };

  const generateTestData = async () => {
    if (!selectedJobId) {
      toast({
        title: "Error",
        description: "Please select a job first",
        variant: "destructive",
      });
      return;
    }

    setGeneratingTestData(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-test-applicants', {
        body: { jobId: selectedJobId }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Generated ${data.candidates_created} test candidates and ${data.applications_created} applications`,
      });

      // Refresh applications list
      fetchApplications(selectedJobId);
    } catch (error: any) {
      console.error('Error generating test data:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate test data",
        variant: "destructive",
      });
    } finally {
      setGeneratingTestData(false);
    }
  };

  const updateUNExperience = async () => {
    if (!selectedJobId) {
      toast({
        title: "Error",
        description: "Please select a job first",
        variant: "destructive",
      });
      return;
    }

    setGeneratingTestData(true);
    try {
      const { data, error } = await supabase.functions.invoke('update-candidates-un-experience', {
        body: { jobId: selectedJobId }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Updated ${data.updated} of ${data.total_candidates} candidates (${data.percentage}) to have UN experience`,
      });

      // Refresh applications list
      fetchApplications(selectedJobId);
    } catch (error: any) {
      console.error('Error updating UN experience:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update UN experience",
        variant: "destructive",
      });
    } finally {
      setGeneratingTestData(false);
    }
  };

  const deleteJobApplications = async () => {
    if (!selectedJobId) {
      toast({
        title: "Error",
        description: "Please select a job first",
        variant: "destructive",
      });
      return;
    }

    setGeneratingTestData(true);
    try {
      const { data, error } = await supabase.functions.invoke('delete-job-applications', {
        body: { jobId: selectedJobId }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Deleted ${data.deleted_applications} applications and ${data.deleted_candidates} test candidates`,
      });

      // Refresh applications list
      fetchApplications(selectedJobId);
    } catch (error: any) {
      console.error('Error deleting applications:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete applications",
        variant: "destructive",
      });
    } finally {
      setGeneratingTestData(false);
    }
  };

  const simulateVideoSubmissions = async () => {
    if (!selectedJobId) {
      toast({
        title: "Error",
        description: "Please select a job first",
        variant: "destructive",
      });
      return;
    }

    setGeneratingTestData(true);
    try {
      const { data, error } = await supabase.functions.invoke('simulate-video-submissions', {
        body: { jobId: selectedJobId }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: data.message || "Video submissions simulated successfully",
      });

      // Refresh applications list
      fetchApplications(selectedJobId);
    } catch (error: any) {
      console.error('Error simulating videos:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to simulate video submissions",
        variant: "destructive",
      });
    } finally {
      setGeneratingTestData(false);
    }
  };

  const getExperienceSummary = (workExp: any, yearsExp: number | null) => {
    const currentJob = getCurrentJobDetails(workExp);
    return currentJob.title;
  };

  // Helper function to extract country from location
  const getCountryFromLocation = (location: string | null) => {
    if (!location) return null;
    
    // If location contains comma, assume it's "City, Country" format
    if (location.includes(',')) {
      const parts = location.split(',');
      return parts[parts.length - 1].trim(); // Get the last part as country
    }
    
    // Otherwise, assume the whole string is the country
    return location.trim();
  };

  // Enhanced filter and sort applications
  const filteredApplications = applications.filter(app => {
    const matchesSearch = app.candidate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         app.candidate.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filter by actual status only - no special handling needed
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    
    const matchesCompletion = completionFilter === 'all' || 
                             (completionFilter === 'completed' && app.phf_completed) ||
                             (completionFilter === 'incomplete' && !app.phf_completed);

    // Education filter
    const education = getHighestEducation(app.candidate.education);
    const matchesEducation = educationFilter === 'all' || 
                            education.toLowerCase().includes(educationFilter.toLowerCase());

    // Experience filter
    const yearsExp = app.candidate.years_of_experience || 0;
    const matchesExperience = experienceFilter === 'all' ||
                             (experienceFilter === '0-2' && yearsExp <= 2) ||
                             (experienceFilter === '3-5' && yearsExp >= 3 && yearsExp <= 5) ||
                             (experienceFilter === '6-10' && yearsExp >= 6 && yearsExp <= 10) ||
                             (experienceFilter === '10+' && yearsExp > 10);

    // Language filter (simplified - checks if specific language exists)
    const languages = getLanguageSummary(app.candidate.languages);
    const matchesLanguage = languageFilter === 'all' || 
                           languages.toLowerCase().includes(languageFilter.toLowerCase());

    // AI Score filter
    const score = app.screening_scores?.[0]?.ai_score;
    const matchesAiScore = aiScoreFilter === 'all' || 
                          (aiScoreFilter === 'high' && score !== null && score !== undefined && score >= 80) ||
                          (aiScoreFilter === 'medium' && score !== null && score !== undefined && score >= 70 && score < 80) ||
                          (aiScoreFilter === 'low' && score !== null && score !== undefined && score < 70) ||
                          (aiScoreFilter === 'not_scored' && (score === null || score === undefined));

    // Requirements filter
    const breakdown = app.screening_scores?.[0]?.rubric_breakdown;
    const matchesRequirements = requirementsFilter === 'all' ||
                               (requirementsFilter === 'recommended' && breakdown?.recommendForLonglist) ||
                               (requirementsFilter === 'meets_all' && breakdown?.passedMustHaves && breakdown?.overallScore >= 70) ||
                               (requirementsFilter === 'meets_some' && breakdown && (!breakdown.passedMustHaves || breakdown.overallScore < 70)) ||
                               (requirementsFilter === 'not_scored' && !breakdown);
    
    return matchesSearch && matchesStatus && matchesCompletion && matchesEducation && matchesExperience && matchesLanguage && matchesAiScore && matchesRequirements;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.candidate.name.localeCompare(b.candidate.name);
      case 'status':
        return a.status.localeCompare(b.status);
      case 'updated_at':
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      case 'ai_score':
        const scoreA = a.screening_scores?.[0]?.ai_score || 0;
        const scoreB = b.screening_scores?.[0]?.ai_score || 0;
        return scoreB - scoreA; // Higher scores first
      case 'video_score':
        const videoA = a.videoScore || 0;
        const videoB = b.videoScore || 0;
        return videoB - videoA; // Higher scores first
      default:
        return new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime();
    }
  });

  // Auto-sort Pre-Recorded Video phase by video score
  if (statusFilter === 'Pre-Recorded Video') {
    filteredApplications.sort((a, b) => {
      const videoA = a.videoScore || 0;
      const videoB = b.videoScore || 0;
      return videoB - videoA; // Higher scores first
    });
  }

  // Define status phases in the correct order
  const statusPhases = [
    { status: 'Application', title: 'Applications', color: 'bg-blue-100 text-blue-800' },
    { status: 'Longlist', title: 'Longlist', color: 'bg-yellow-100 text-yellow-800' },
    { status: 'Shortlist', title: 'Shortlist', color: 'bg-purple-100 text-purple-800' },
    { status: 'Pre-Recorded Video', title: 'Video Interview', color: 'bg-indigo-100 text-indigo-800' },
    { status: 'Panel Interview', title: 'Panel Interview', color: 'bg-orange-100 text-orange-800' },
    { status: 'Recommended', title: 'Recommended Candidates', color: 'bg-cyan-100 text-cyan-800' },
    { status: 'Offer', title: 'Offer', color: 'bg-green-100 text-green-800' },
    { status: 'Roster', title: 'Roster', color: 'bg-emerald-100 text-emerald-800' },
    { status: 'Rejected', title: 'Rejected', color: 'bg-red-100 text-red-800' }
  ];

  // Calculate stats by phase for the selected job
  const phaseStats = statusPhases.map(phase => {
    // Each phase only counts candidates currently at that exact status
    const phaseApps = applications.filter(app => app.status === phase.status);
    
    const womenApps = phaseApps.filter(app => app.candidate.gender === 'Female');
    const womenPercentage = phaseApps.length > 0 ? (womenApps.length / phaseApps.length) * 100 : 0;
    
    return {
      ...phase,
      count: phaseApps.length,
      womenCount: womenApps.length,
      womenPercentage: Math.round(womenPercentage)
    };
  });

  // Calculate total stats for analytics
  const totalApplications = applications.length;
  const totalWomenCount = applications.filter(app => app.candidate.gender === 'Female').length;
  const totalWomenPercentage = totalApplications > 0 ? Math.round((totalWomenCount / totalApplications) * 100) : 0;

  const getScoreBadge = (application: Application) => {
    // Get the latest score by sorting by created_at descending
    const latestScore = application.screening_scores
      ?.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
    
    const score = latestScore?.ai_score;
    if (score === null || score === undefined) {
      return (
        <Badge className="bg-gray-100 text-gray-800 text-xs">
          Match: N/A
        </Badge>
      );
    }
    
    const color = score >= 80 ? 'bg-green-100 text-green-800' : 
                  score >= 60 ? 'bg-yellow-100 text-yellow-800' : 
                  'bg-red-100 text-red-800';
    
    return (
      <Badge className={`${color} text-xs`}>
        Match: {score}%
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      'Application': 'bg-blue-100 text-blue-800',
      'Longlist': 'bg-yellow-100 text-yellow-800',
      'Shortlist': 'bg-purple-100 text-purple-800',
      'Video Interview': 'bg-indigo-100 text-indigo-800',
      'Panel Interview': 'bg-orange-100 text-orange-800',
      'Recommended': 'bg-cyan-100 text-cyan-800',
      'Offer': 'bg-green-100 text-green-800',
      'Roster': 'bg-emerald-100 text-emerald-800',
      'Rejected': 'bg-red-100 text-red-800'
    } as const;

    return (
      <Badge className={variants[status as keyof typeof variants] || 'bg-gray-100 text-gray-800'}>
        {status}
      </Badge>
    );
  };

  const toggleRowExpansion = (applicationId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(applicationId)) {
      newExpanded.delete(applicationId);
    } else {
      newExpanded.add(applicationId);
    }
    setExpandedRows(newExpanded);
  };

  const toggleApplicationSelection = (applicationId: string) => {
    const newSelected = new Set(selectedApplications);
    if (newSelected.has(applicationId)) {
      newSelected.delete(applicationId);
    } else {
      newSelected.add(applicationId);
    }
    setSelectedApplications(newSelected);
  };

  const toggleAllApplications = () => {
    if (selectedApplications.size === filteredApplications.length) {
      setSelectedApplications(new Set());
    } else {
      setSelectedApplications(new Set(filteredApplications.map(app => app.id)));
    }
  };

  const addToLonglist = async (applicationIds: string[], reason?: string) => {
    try {
      // Get current user
      const { data: user } = await supabase.auth.getUser();
      const currentUserId = user?.user?.id;

      // For single application, toggle the status
      if (applicationIds.length === 1) {
        const currentApp = applications.find(app => app.id === applicationIds[0]);
        const isCurrentlyLonglisted = currentApp?.suggested_for_longlist;
        
        const newStatus = isCurrentlyLonglisted ? 'Application' : 'Longlist';
        
        const { error } = await supabase
          .from('applications')
          .update({ 
            suggested_for_longlist: !isCurrentlyLonglisted,
            status: newStatus
          })
          .eq('id', applicationIds[0]);

        if (error) throw error;

        // Log stage change with reason and proper user attribution
        if (currentUserId) {
          await supabase
            .from('stage_events')
            .insert({
              application_id: applicationIds[0],
              from_stage: currentApp?.status as any,
              to_stage: newStatus as any,
              by_user: currentUserId,
              reason: reason || null
            });
        }

        toast({
          title: "Success",
          description: isCurrentlyLonglisted 
            ? "Application removed from longlist" 
            : "Application added to longlist",
        });
      } else {
        // For multiple applications, just add them to longlist
        const { error } = await supabase
          .from('applications')
          .update({ suggested_for_longlist: true, status: 'Longlist' })
          .in('id', applicationIds);

        if (error) throw error;

        // Log stage changes for bulk operations
        if (currentUserId) {
          const stageEvents = applicationIds.map(appId => {
            const currentApp = applications.find(app => app.id === appId);
            return {
              application_id: appId,
              from_stage: currentApp?.status as any,
              to_stage: 'Longlist' as any,
              by_user: currentUserId,
              reason: reason || 'Bulk longlist operation'
            };
          });

          await supabase
            .from('stage_events')
            .insert(stageEvents);
        }

        toast({
          title: "Success",
          description: `${applicationIds.length} application(s) added to longlist`,
        });
      }

      fetchApplications(selectedJobId);
      setSelectedApplications(new Set());
    } catch (error) {
      console.error('Error updating longlist:', error);
      toast({
        title: "Error",
        description: "Failed to update longlist",
        variant: "destructive",
      });
    }
  };

  const removeFromLonglist = async (applicationIds: string[]) => {
    try {
      // Get current user
      const { data: user } = await supabase.auth.getUser();
      const currentUserId = user?.user?.id;

      const { error } = await supabase
        .from('applications')
        .update({ suggested_for_longlist: false, status: 'Application' })
        .in('id', applicationIds);

      if (error) throw error;

      // Log stage changes for bulk operations with proper user attribution
      if (currentUserId) {
        const stageEvents = applicationIds.map(appId => {
          const currentApp = applications.find(app => app.id === appId);
          return {
            application_id: appId,
            from_stage: currentApp?.status as any,
            to_stage: 'Application' as any,
            by_user: currentUserId,
            reason: 'Bulk removal from longlist'
          };
        });

        await supabase
          .from('stage_events')
          .insert(stageEvents);
      }

      toast({
        title: "Success",
        description: `${applicationIds.length} application(s) removed from longlist`,
      });

      fetchApplications(selectedJobId);
      setSelectedApplications(new Set());
    } catch (error) {
      console.error('Error removing from longlist:', error);
      toast({
        title: "Error",
        description: "Failed to remove from longlist",
        variant: "destructive",
      });
    }
  };

  const directShortlist = async (applicationId: string, reason?: string) => {
    try {
      // Get current user
      const { data: user } = await supabase.auth.getUser();
      const currentUserId = user?.user?.id;

      // Find the current application to check its status
      const currentApp = applications.find(app => app.id === applicationId);
      const isCurrentlyShortlisted = currentApp?.status === 'Shortlist';
      
      // Check if this is the Associate Policy (Legal) Officer job
      const isAssociatePolicyJob = currentApp?.job?.title?.includes('Associate Policy (Legal) Officer');
      
      const newStatus = isCurrentlyShortlisted 
        ? (isAssociatePolicyJob ? 'Application' : 'Longlist')  // Move to Application pool for Associate Policy job, otherwise Longlist
        : 'Shortlist';
      
      const { error } = await supabase
        .from('applications')
        .update({ 
          status: newStatus,
          suggested_for_longlist: isCurrentlyShortlisted 
            ? false  // Remove from longlist when moving back
            : false  // Don't add to longlist when moving to shortlist
        })
        .eq('id', applicationId);

      if (error) throw error;

      // Log stage change with reason and proper user attribution
      if (currentUserId) {
        await supabase
          .from('stage_events')
          .insert({
            application_id: applicationId,
            from_stage: currentApp?.status as any,
            to_stage: newStatus as any,
            by_user: currentUserId,
            reason: reason || null
          });
      }

      toast({
        title: "Success",
        description: isCurrentlyShortlisted 
          ? (isAssociatePolicyJob 
              ? "Application moved back to applicant pool" 
              : "Application moved back to longlist"
            )
          : "Application moved to shortlist",
      });

      fetchApplications(selectedJobId);
    } catch (error) {
      console.error('Error updating shortlist:', error);
      toast({
        title: "Error",
        description: "Failed to update shortlist",
        variant: "destructive",
      });
    }
  };

  const addToShortlist = async (applicationId: string, reason?: string) => {
    try {
      // Get current user
      const { data: user } = await supabase.auth.getUser();
      const currentUserId = user?.user?.id;

      // Get current application
      const currentApp = applications.find(app => app.id === applicationId);
      
      const { error } = await supabase
        .from('applications')
        .update({ status: 'Shortlist' })
        .eq('id', applicationId);

      if (error) throw error;

      // Log stage change
      if (currentUserId) {
        await supabase
          .from('stage_events')
          .insert({
            application_id: applicationId,
            from_stage: currentApp?.status as any,
            to_stage: 'Shortlist' as any,
            by_user: currentUserId,
            reason: reason || 'Moved from Longlist to Shortlist'
          });
      }

      toast({
        title: "Success",
        description: "Application moved to Shortlist",
      });

      fetchApplications(selectedJobId);
    } catch (error) {
      console.error('Error moving to shortlist:', error);
      toast({
        title: "Error",
        description: "Failed to move to shortlist",
        variant: "destructive",
      });
    }
  };

  const addToVideoInterview = async (applicationId: string, reason?: string) => {
    try {
      // Get current user
      const { data: user } = await supabase.auth.getUser();
      const currentUserId = user?.user?.id;

      // Get current application
      const currentApp = applications.find(app => app.id === applicationId);
      
      const { error } = await supabase
        .from('applications')
        .update({ status: 'Pre-Recorded Video' })
        .eq('id', applicationId);

      if (error) throw error;

      // Log stage change
      if (currentUserId) {
        await supabase
          .from('stage_events')
          .insert({
            application_id: applicationId,
            from_stage: currentApp?.status as any,
            to_stage: 'Pre-Recorded Video' as any,
            by_user: currentUserId,
            reason: reason || 'Moved from Longlist to Video Interview'
          });
      }

      toast({
        title: "Success",
        description: "Application moved to Video Interview stage",
      });

      fetchApplications(selectedJobId);
    } catch (error) {
      console.error('Error moving to video interview:', error);
      toast({
        title: "Error",
        description: "Failed to move to video interview",
        variant: "destructive",
      });
    }
  };


  const rejectApplication = async (applicationId: string, reason: string) => {
    try {
      // Get current user
      const { data: user } = await supabase.auth.getUser();
      const currentUserId = user?.user?.id;

      // Get current application status for logging
      const currentApp = applications.find(app => app.id === applicationId);
      const currentStatus = currentApp?.status;

      // Update application status
      const { error } = await supabase
        .from('applications')
        .update({ 
          status: 'Rejected',
          suggested_for_longlist: false
        })
        .eq('id', applicationId);

      if (error) throw error;

      // Log the stage change with provided reason and proper user attribution
      if (currentUserId) {
        const { error: stageError } = await supabase
          .from('stage_events')
          .insert({
            application_id: applicationId,
            from_stage: currentStatus as any,
            to_stage: 'Rejected' as any,
            by_user: currentUserId,
            reason: reason || 'Rejected by hiring manager'
          });

        if (stageError) {
          console.error('Error logging stage change:', stageError);
        }
      }

      toast({
        title: "Success",
        description: "Application rejected successfully",
      });

      fetchApplications(selectedJobId);
    } catch (error) {
      console.error('Error rejecting application:', error);
      toast({
        title: "Error",
        description: "Failed to reject application",
        variant: "destructive",
      });
    }
  };

  // Dialog action handlers
  const handleLonglistAction = (applicationId: string) => {
    const app = applications.find(a => a.id === applicationId);
    if (!app) return;
    
    setDialogState({
      open: true,
      action: 'longlist',
      applicationId,
      candidateName: app.candidate.name,
      currentStatus: app.status,
      isToggleAction: app.suggested_for_longlist
    });
  };

  const handleShortlistAction = (applicationId: string) => {
    const app = applications.find(a => a.id === applicationId);
    if (!app) return;
    
    setDialogState({
      open: true,
      action: 'shortlist',
      applicationId,
      candidateName: app.candidate.name,
      currentStatus: app.status
    });
  };

  const handleRejectAction = (applicationId: string) => {
    const app = applications.find(a => a.id === applicationId);
    if (!app) return;
    
    setDialogState({
      open: true,
      action: 'reject',
      applicationId,
      candidateName: app.candidate.name,
      currentStatus: app.status
    });
  };

  const handleAddToShortlist = (applicationId: string) => {
    const app = applications.find(a => a.id === applicationId);
    if (!app) return;
    
    setDialogState({
      open: true,
      action: 'add-to-shortlist',
      applicationId,
      candidateName: app.candidate.name,
      currentStatus: app.status
    });
  };

  const handleAddToVideoInterview = (applicationId: string) => {
    const app = applications.find(a => a.id === applicationId);
    if (!app) return;
    
    setDialogState({
      open: true,
      action: 'add-to-video',
      applicationId,
      candidateName: app.candidate.name,
      currentStatus: app.status
    });
  };

  // New handlers for video stage
  const handleVideoAssignment = (applicationId: string) => {
    // Navigate directly to the application detail page with video tab
    navigate(`/admin/applications/${applicationId}?tab=video`);
  };

  const handleReviewVideos = (applicationId: string) => {
    navigate(`/admin/applications/${applicationId}?tab=video`);
  };

  const handleMoveToPanelInterview = (applicationId: string) => {
    const app = applications.find(a => a.id === applicationId);
    if (!app) return;
    
    setDialogState({
      open: true,
      action: 'move-to-panel-interview',
      applicationId,
      candidateName: app.candidate.name,
      currentStatus: app.status
    });
  };

  const moveToPanelInterview = async (applicationId: string, reason?: string) => {
    try {
      // Get current user
      const { data: user } = await supabase.auth.getUser();
      const currentUserId = user?.user?.id;

      // Get current application
      const currentApp = applications.find(app => app.id === applicationId);
      
      const { error } = await supabase
        .from('applications')
        .update({ status: 'Panel Interview' })
        .eq('id', applicationId);

      if (error) throw error;

      // Log stage change
      if (currentUserId) {
        await supabase
          .from('stage_events')
          .insert({
            application_id: applicationId,
            from_stage: currentApp?.status as any,
            to_stage: 'Panel Interview' as any,
            by_user: currentUserId,
            reason: reason || 'Moved from Video Interview to Panel Interview'
          });
      }

      toast({
        title: "Success",
        description: "Candidate moved to Panel Interview stage",
      });

      fetchApplications(selectedJobId);
    } catch (error) {
      console.error('Error moving to panel interview:', error);
      toast({
        title: "Error",
        description: "Failed to move to panel interview",
        variant: "destructive",
      });
    }
  };

  const moveToApplications = async (applicationId: string) => {
    try {
      // Get current user
      const { data: user } = await supabase.auth.getUser();
      const currentUserId = user?.user?.id;

      // Get current application
      const currentApp = applications.find(app => app.id === applicationId);
      
      const { error } = await supabase
        .from('applications')
        .update({ 
          status: 'Application',
          suggested_for_longlist: false
        })
        .eq('id', applicationId);

      if (error) throw error;

      // Log stage change
      if (currentUserId) {
        await supabase
          .from('stage_events')
          .insert({
            application_id: applicationId,
            from_stage: currentApp?.status as any,
            to_stage: 'Application' as any,
            by_user: currentUserId,
            reason: 'Moved back to Applications by HR'
          });
      }

      toast({
        title: "Success",
        description: "Candidate moved back to Applications",
      });

      fetchApplications(selectedJobId);
    } catch (error) {
      console.error('Error moving to applications:', error);
      toast({
        title: "Error",
        description: "Failed to move to applications",
        variant: "destructive",
      });
    }
  };

  const moveToRecommended = async (applicationId: string, reason?: string) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      const currentUserId = user?.user?.id;
      const currentApp = applications.find(app => app.id === applicationId);
      
      const { error } = await supabase
        .from('applications')
        .update({ status: 'Recommended' })
        .eq('id', applicationId);

      if (error) throw error;

      if (currentUserId) {
        await supabase
          .from('stage_events')
          .insert({
            application_id: applicationId,
            from_stage: currentApp?.status as any,
            to_stage: 'Recommended' as any,
            by_user: currentUserId,
            reason: reason || 'Top interview scorer (≥80%) recommended for position'
          });
      }

      toast({
        title: "Success",
        description: "Candidate recommended for position",
      });

      fetchApplications(selectedJobId);
    } catch (error) {
      console.error('Error moving to recommended:', error);
      toast({
        title: "Error",
        description: "Failed to recommend candidate",
        variant: "destructive",
      });
    }
  };

  const moveToRoster = async (applicationId: string, reason?: string) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      const currentUserId = user?.user?.id;
      const currentApp = applications.find(app => app.id === applicationId);
      
      const { error } = await supabase
        .from('applications')
        .update({ status: 'Roster' })
        .eq('id', applicationId);

      if (error) throw error;

      if (currentUserId) {
        await supabase
          .from('stage_events')
          .insert({
            application_id: applicationId,
            from_stage: currentApp?.status as any,
            to_stage: 'Roster' as any,
            by_user: currentUserId,
            reason: reason || 'Alternate candidate (≥80%) added to roster for future opportunities'
          });
      }

      toast({
        title: "Success",
        description: "Candidate added to roster as alternate",
      });

      fetchApplications(selectedJobId);
    } catch (error) {
      console.error('Error moving to roster:', error);
      toast({
        title: "Error",
        description: "Failed to add to roster",
        variant: "destructive",
      });
    }
  };

  const handleMoveToRecommended = (applicationId: string) => {
    const app = applications.find(a => a.id === applicationId);
    if (!app) return;
    
    setDialogState({
      open: true,
      action: 'move-to-recommended',
      applicationId,
      candidateName: app.candidate.name,
      currentStatus: app.status
    });
  };

  const handleMoveToRoster = (applicationId: string) => {
    const app = applications.find(a => a.id === applicationId);
    if (!app) return;
    
    setDialogState({
      open: true,
      action: 'move-to-roster',
      applicationId,
      candidateName: app.candidate.name,
      currentStatus: app.status
    });
  };

  const handleDialogConfirm = async (reason: string) => {
    const { action, applicationId } = dialogState;
    
    switch (action) {
      case 'longlist':
        await addToLonglist([applicationId], reason);
        break;
      case 'shortlist':
        await directShortlist(applicationId, reason);
        break;
      case 'reject':
        await rejectApplication(applicationId, reason);
        break;
      case 'add-to-shortlist':
        await addToShortlist(applicationId, reason);
        break;
      case 'add-to-video':
        await addToVideoInterview(applicationId, reason);
        break;
      case 'move-to-panel-interview':
        await moveToPanelInterview(applicationId, reason);
        break;
      case 'move-to-recommended':
        await moveToRecommended(applicationId, reason);
        break;
      case 'move-to-roster':
        await moveToRoster(applicationId, reason);
        break;
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {selectedJobId && (
          <Button
            onClick={() => navigate('/applications')}
            variant="outline"
            className="mb-4 flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Jobs
          </Button>
        )}
        
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Application Management</h1>
            <p className="text-muted-foreground mt-2">
              {selectedJobId ? `Applications for ${selectedJob?.title || 'Selected Job'}` : 'Select a job to view applications'}
            </p>
          </div>
          {selectedJobId && (userRoles.includes('Admin') || userRoles.includes('HR Assistant')) && (
            <div className="flex gap-2">
              <Button
                onClick={() => navigate('/admin/talent-pool')}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Search className="h-4 w-4" />
                Search Talent Pool
              </Button>
              <Button
                onClick={generateTestData}
                disabled={generatingTestData}
                variant="outline"
              >
                <Users className="h-4 w-4 mr-2" />
                {generatingTestData ? 'Generating...' : 'Generate 40 Test Applicants'}
              </Button>
              <Button
                onClick={simulateVideoSubmissions}
                disabled={generatingTestData}
                variant="outline"
              >
                <Video className="h-4 w-4 mr-2" />
                {generatingTestData ? 'Simulating...' : 'Simulate Video Interviews'}
              </Button>
            </div>
          )}
        </div>

        {/* Redirect if no job selected */}
        {!selectedJobId && (
          <Card className="mb-6">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">No job selected</p>
              <Button onClick={() => navigate('/applications')}>
                Select a Job
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Total Analytics Summary */}
        {selectedJobId && applications.length > 0 && (
          <Card className="mb-4 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Total Applicants for {selectedJob?.title}</h3>
                  <p className="text-sm text-muted-foreground">Complete hiring funnel overview</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-primary">{totalApplications}</div>
                  <div className="text-sm text-muted-foreground">{totalWomenPercentage}% Women</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Application Phase Overview */}
        {selectedJobId && applications.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Current Status Breakdown</CardTitle>
              <p className="text-sm text-muted-foreground">
                Live count of candidates at each stage
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-9 gap-4">
                {phaseStats.map((phase) => (
                  <div 
                    key={phase.status} 
                    className={`text-center p-4 rounded-lg border cursor-pointer transition-all duration-200 hover:bg-muted/50 hover:border-primary/50 hover:shadow-md ${
                      statusFilter === phase.status || (statusFilter === 'Longlist' && phase.status === 'Longlist')
                        ? 'bg-primary/10 border-primary/30 shadow-sm' 
                        : 'bg-muted/30 border-border'
                    }`}
                    onClick={() => {
                      setStatusFilter(phase.status);
                    }}
                    title={`Click to filter by ${phase.title}`}
                  >
                    <div className="text-2xl font-bold text-foreground mb-1">{phase.count}</div>
                    <div className="text-sm text-muted-foreground mb-2 font-medium">
                      {phase.title}
                    </div>
                    {phase.count > 0 && (
                      <div className={`text-xs font-medium ${
                        phase.status === 'Rejected' 
                          ? (phase.womenPercentage > 50 ? 'text-red-600' : 'text-green-600')
                          : (phase.womenPercentage < 50 ? 'text-red-600' : 'text-green-600')
                      }`}>
                        {phase.womenPercentage}% Women
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Application List */}
        {selectedJobId && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Applications</span>
                <div className="flex items-center space-x-2">
                  {userRoles.includes('Admin') && (
                    <TriggerScoringButton 
                      jobId={selectedJobId} 
                      onComplete={() => fetchApplications(selectedJobId)}
                    />
                  )}
                  {selectedJobId === 'aacafec6-4d2b-4a3b-826a-5608ec28418e' && (userRoles.includes('Admin') || userRoles.includes('HR Assistant')) && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate(`/admin/applications/manual/${selectedJobId}`)}
                      className="mr-4"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Manual Application
                    </Button>
                  )}
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {filteredApplications.length} of {applications.length} applications
                  </span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Enhanced Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4 mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search candidates..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Application">Application</SelectItem>
                    <SelectItem value="Longlist">Longlist</SelectItem>
                    <SelectItem value="Shortlist">Shortlist</SelectItem>
                    <SelectItem value="Video Interview">Video Interview</SelectItem>
                    <SelectItem value="Pre-Recorded Video">Pre-Recorded Video</SelectItem>
                    <SelectItem value="Panel Interview">Panel Interview</SelectItem>
                    <SelectItem value="Recommended">Recommended</SelectItem>
                    <SelectItem value="Offer">Offer</SelectItem>
                    <SelectItem value="Roster">Roster</SelectItem>
                    <SelectItem value="Rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={educationFilter} onValueChange={setEducationFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Education" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Education</SelectItem>
                    <SelectItem value="phd">PhD/Doctorate</SelectItem>
                    <SelectItem value="master">Master's</SelectItem>
                    <SelectItem value="bachelor">Bachelor's</SelectItem>
                    <SelectItem value="associate">Associate</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={experienceFilter} onValueChange={setExperienceFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Experience" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Experience</SelectItem>
                    <SelectItem value="0-2">0-2 years</SelectItem>
                    <SelectItem value="3-5">3-5 years</SelectItem>
                    <SelectItem value="6-10">6-10 years</SelectItem>
                    <SelectItem value="10+">10+ years</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={languageFilter} onValueChange={setLanguageFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Languages" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Languages</SelectItem>
                    <SelectItem value="english">English</SelectItem>
                    <SelectItem value="french">French</SelectItem>
                    <SelectItem value="spanish">Spanish</SelectItem>
                    <SelectItem value="arabic">Arabic</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={completionFilter} onValueChange={setCompletionFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="PHF Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="incomplete">In Progress</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="submitted_at">Submission Date</SelectItem>
                    <SelectItem value="name">Candidate Name</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                    <SelectItem value="updated_at">Last Updated</SelectItem>
                    <SelectItem value="ai_score">AI Score (High to Low)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* New AI Screening Filters Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <Select value={aiScoreFilter} onValueChange={setAiScoreFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="AI Score Range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All AI Scores</SelectItem>
                    <SelectItem value="high">High Score (80-100)</SelectItem>
                    <SelectItem value="medium">Medium Score (70-79)</SelectItem>
                    <SelectItem value="low">Low Score (&lt;70)</SelectItem>
                    <SelectItem value="not_scored">Not Yet Scored</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={requirementsFilter} onValueChange={setRequirementsFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Requirements Match" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Applications</SelectItem>
                    <SelectItem value="recommended">⭐ AI Recommended</SelectItem>
                    <SelectItem value="meets_all">✓ Meets All Requirements</SelectItem>
                    <SelectItem value="meets_some">~ Some Gaps Found</SelectItem>
                    <SelectItem value="not_scored">? Not Yet Scored</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Bulk Actions and Select All */}
              <div className="flex items-center justify-between mb-4 p-4 border rounded-lg bg-muted/20">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={selectedApplications.size === filteredApplications.length && filteredApplications.length > 0}
                    onCheckedChange={toggleAllApplications}
                  />
                  <span className="text-sm text-muted-foreground">
                    {selectedApplications.size > 0 ? (
                      `${selectedApplications.size} of ${filteredApplications.length} selected`
                    ) : (
                      `Select all ${filteredApplications.length} applications`
                    )}
                  </span>
                </div>
                
                {selectedApplications.size > 0 && (() => {
                  // Check if selected applications are in application/longlist stage
                  const selectedApps = applications.filter(app => selectedApplications.has(app.id));
                  const areInApplicationStage = selectedApps.every(app => 
                    app.status === 'Application' || app.status === 'Longlist'
                  );
                  
                  return (
                    <div className="flex gap-2">
                      {areInApplicationStage && (
                        <>
                          <Button 
                            size="sm" 
                            onClick={() => addToLonglist(Array.from(selectedApplications))}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Add to Longlist
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => removeFromLonglist(Array.from(selectedApplications))}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Remove from Longlist
                          </Button>
                        </>
                      )}
                      <Button 
                        size="sm" 
                        onClick={() => setBulkVideoAssignmentDialog(true)}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Bulk Video Assignment
                      </Button>
                    </div>
                  );
                })()}
              </div>

              {/* Card-based Layout - No more horizontal scrolling */}
              <TooltipProvider>
                <div className="space-y-4">
                  {loading ? (
                    <div className="text-center py-8">
                      Loading applications...
                    </div>
                  ) : filteredApplications.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No applications found
                    </div>
                  ) : (
                    filteredApplications.map((application) => (
                       <CandidateApplicationCard
                         key={application.id}
                         application={application}
                         userRoles={userRoles}
                         isSelected={selectedApplications.has(application.id)}
                         onToggleSelection={toggleApplicationSelection}
                         onDelete={deleteApplication}
                          onAddToLonglist={handleLonglistAction}
                          onDirectShortlist={handleShortlistAction}
                          onReject={handleRejectAction}
                          onAddToShortlist={handleAddToShortlist}
                          onAddToVideoInterview={handleAddToVideoInterview}
                          onVideoAssignment={handleVideoAssignment}
                          onReviewVideos={handleReviewVideos}
                          onMoveToPanelInterview={handleMoveToPanelInterview}
                          onMoveToApplications={moveToApplications}
                          onMoveToRecommended={handleMoveToRecommended}
                          onMoveToRoster={handleMoveToRoster}
                          interviewScore={interviewScores[application.id]?.score}
                          interviewRank={interviewScores[application.id]?.rank}
                         getFlagEmoji={getCountryFromLocation}
                         getEducationSummary={getAllEducationDetails}
                         getWorkExperienceSummary={getRecentWorkExperience}
                          getTotalExperience={getTotalExperience}
                          getTotalUNExperience={getTotalUNExperience}
                          getLanguageSummary={getLanguageSummary}
                        />
                    ))
                  )}
                </div>
              </TooltipProvider>
            </CardContent>
          </Card>
        )}

        {selectedJobId && (
          <Button
            onClick={() => navigate('/applications')}
            variant="outline"
            className="mt-6 flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Jobs
          </Button>
        )}
      </div>
      
      <ActionConfirmationDialog
        open={dialogState.open}
        onOpenChange={(open) => setDialogState(prev => ({ ...prev, open }))}
        action={dialogState.action}
        candidateName={dialogState.candidateName}
        currentStatus={dialogState.currentStatus}
        isToggleAction={dialogState.isToggleAction}
        onConfirm={handleDialogConfirm}
      />

      <VideoAssignmentDialog
        open={videoAssignmentDialog.open}
        onOpenChange={(open) => setVideoAssignmentDialog(prev => ({ ...prev, open }))}
        applicationId={videoAssignmentDialog.applicationId}
        candidateName={videoAssignmentDialog.candidateName}
      />

      <BulkVideoAssignmentDialog
        open={bulkVideoAssignmentDialog}
        onOpenChange={setBulkVideoAssignmentDialog}
        applicationIds={Array.from(selectedApplications)}
        candidates={applications
          .filter(app => selectedApplications.has(app.id))
          .map(app => ({
            id: app.candidate.id,
            name: app.candidate.name,
            email: app.candidate.email
          }))}
        jobTitle={selectedJob?.title || ''}
        jobId={selectedJobId}
        onSuccess={() => {
          setSelectedApplications(new Set());
          fetchApplications(selectedJobId);
        }}
      />
    </Layout>
  );
}

