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
import { Search, Filter, User, FileText, Calendar, AlertCircle, Trash2, Eye, ChevronDown, ChevronRight, GraduationCap, Briefcase, Languages, Plus, Check, X, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { getCountryFlagUrl } from '@/lib/countryFlags';

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
  }[];
}

export default function AdminApplications() {
  const { userRoles } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
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

  // Check access permissions
  const hasAccess = userRoles.includes('Admin') || userRoles.includes('HR Assistant') || 
                   userRoles.includes('Hiring Manager') || userRoles.includes('Panel Member');
  
  useEffect(() => {
    if (hasAccess) {
      fetchJobs();
      const jobId = searchParams.get('job');
      if (jobId) {
        setSelectedJobId(jobId);
        fetchApplications(jobId);
      }
    }
  }, [hasAccess, searchParams]);

  const fetchJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('id, title, status')
        .order('updated_at', { ascending: false });

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
          source,
          candidate:candidates(
            id, name, email, location, gender, education, work_experience, 
            languages, years_of_experience, un_experience, skills
          ),
          job:jobs(id, title, org_unit),
          screening_scores(ai_score, created_at)
        `)
        .eq('job_id', jobId)
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      setApplications(data || []);
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
    
    return educationArray.map((edu: any) => ({
      degree: edu.degree || edu.degree_type || 'Not specified',
      fieldOfStudy: edu.field_of_study || edu.field || edu.main_course_of_study || edu.major || edu.subject || '',
      institution: edu.institution || edu.institution_name || edu.university || '',
      year: edu.end_date ? new Date(edu.end_date).getFullYear().toString() : 
            (edu.to_year || edu.year_awarded || '')
    }));
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
    if (workExpArray.length === 0) return [{ title: 'Not specified', organization: '', length: '' }];
    
    // Get all work experience positions
    return workExpArray.map((exp: any) => {
      const title = exp.position || exp.exact_title_of_post || exp.title || 'Not specified';
      const organization = exp.company || exp.employer_name || exp.employer || '';
      
      // Calculate length in position
      const startDate = exp.startDate || exp.start_date || exp.period_from_year;
      let length = '';
      if (startDate) {
        const start = new Date(startDate);
        const end = exp.isCurrent || exp.is_present ? new Date() : 
                    (exp.endDate || exp.end_date ? new Date(exp.endDate || exp.end_date) : new Date());
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
    });
  };

  const getTotalExperience = (workExp: any, yearsExp: number | null) => {
    const workExpArray = Array.isArray(workExp) ? workExp : (workExp?.length ? workExp : []);
    
    // Use provided years_of_experience if available
    if (yearsExp) return `${yearsExp} years`;
    
    // Calculate from work history
    if (workExpArray.length > 0) {
      const totalYears = workExpArray.reduce((total: number, exp: any) => {
        const startDate = exp.startDate || exp.start_date;
        const endDate = exp.endDate || exp.end_date || (exp.isCurrent || exp.is_present ? new Date() : null);
        
        if (startDate) {
          const start = new Date(startDate);
          const end = endDate ? new Date(endDate) : new Date();
          const monthsDiff = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
          return total + Math.max(0, monthsDiff / 12);
        }
        return total;
      }, 0);
      return `${Math.round(totalYears || 0)} years`;
    }
    
    return '0 years';
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
    
    // Special handling for Longlist filter - check suggested_for_longlist flag
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'Longlist' && app.suggested_for_longlist) ||
                         (statusFilter !== 'Longlist' && app.status === statusFilter);
    
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
    
    return matchesSearch && matchesStatus && matchesCompletion && matchesEducation && matchesExperience && matchesLanguage;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.candidate.name.localeCompare(b.candidate.name);
      case 'status':
        return a.status.localeCompare(b.status);
      case 'updated_at':
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      default:
        return new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime();
    }
  });

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
    let phaseApps;
    
    // Special handling for Longlist - count applications marked as suggested_for_longlist
    if (phase.status === 'Longlist') {
      phaseApps = applications.filter(app => app.suggested_for_longlist === true);
    } else {
      phaseApps = applications.filter(app => app.status === phase.status);
    }
    
    const femaleApps = phaseApps.filter(app => app.candidate.gender === 'Female');
    const femalePercentage = phaseApps.length > 0 ? (femaleApps.length / phaseApps.length) * 100 : 0;
    
    return {
      ...phase,
      count: phaseApps.length,
      femaleCount: femaleApps.length,
      femalePercentage: Math.round(femalePercentage)
    };
  });

  // Update Applications phase to show total count
  phaseStats[0] = {
    ...phaseStats[0],
    count: applications.length,
    title: `Applications (${applications.length} total)`,
    femalePercentage: applications.length > 0 ? Math.round((applications.filter(app => app.candidate.gender === 'Female').length / applications.length) * 100) : 0
  };

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

  const addToLonglist = async (applicationIds: string[]) => {
    try {
      const { error } = await supabase
        .from('applications')
        .update({ suggested_for_longlist: true })
        .in('id', applicationIds);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${applicationIds.length} application(s) added to longlist`,
      });

      fetchApplications(selectedJobId);
      setSelectedApplications(new Set());
    } catch (error) {
      console.error('Error adding to longlist:', error);
      toast({
        title: "Error",
        description: "Failed to add to longlist",
        variant: "destructive",
      });
    }
  };

  const removeFromLonglist = async (applicationIds: string[]) => {
    try {
      const { error } = await supabase
        .from('applications')
        .update({ suggested_for_longlist: false })
        .in('id', applicationIds);

      if (error) throw error;

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

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Application Management</h1>
            <p className="text-muted-foreground mt-2">
              {selectedJobId ? `Applications for ${selectedJob?.title || 'Selected Job'}` : 'Select a job to view applications'}
            </p>
          </div>
        </div>

        {/* Job Selection */}
        {!selectedJobId && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Select Job</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedJobId} onValueChange={(value) => {
                setSelectedJobId(value);
                fetchApplications(value);
              }}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a job to view applications" />
                </SelectTrigger>
                <SelectContent>
                  {jobs.map((job) => (
                    <SelectItem key={job.id} value={job.id}>
                      {job.title} ({job.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        {/* Application Phase Overview */}
        {selectedJobId && applications.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Application Overview by Phase</CardTitle>
              <p className="text-sm text-muted-foreground">
                Breakdown of applications for {selectedJob?.title}
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-9 gap-4">
                {phaseStats.map((phase) => (
                  <div 
                    key={phase.status} 
                    className={`text-center p-4 rounded-lg border cursor-pointer transition-all duration-200 hover:bg-muted/50 hover:border-primary/50 hover:shadow-md ${
                      statusFilter === phase.status || (statusFilter === 'Longlist' && phase.status === 'Longlist') || (statusFilter === 'all' && phase.status === 'Application')
                        ? 'bg-primary/10 border-primary/30 shadow-sm' 
                        : 'bg-muted/30 border-border'
                    }`}
                    onClick={() => {
                      // Handle special case for Applications phase - show all
                      if (phase.status === 'Application') {
                        setStatusFilter('all');
                      } else {
                        setStatusFilter(phase.status);
                      }
                    }}
                    title={`Click to filter by ${phase.title.replace(` (${applications.length} total)`, '')}`}
                  >
                    <div className="text-2xl font-bold text-foreground mb-1">{phase.count}</div>
                    <div className="text-sm text-muted-foreground mb-2 font-medium">
                      {phase.title.replace(` (${applications.length} total)`, '')}
                    </div>
                    {phase.count > 0 && (
                      <div className={`text-xs font-medium ${phase.femalePercentage < 50 ? 'text-red-600' : 'text-green-600'}`}>
                        {phase.femalePercentage}% Female
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
                  </SelectContent>
                </Select>
              </div>

              {/* Bulk Actions */}
              {selectedApplications.size > 0 && (
                <Card className="mb-4">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {selectedApplications.size} application(s) selected
                      </span>
                      <div className="flex gap-2">
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
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Enhanced Table */}
              <div className="border rounded-lg overflow-hidden shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedApplications.size === filteredApplications.length && filteredApplications.length > 0}
                          onCheckedChange={toggleAllApplications}
                        />
                      </TableHead>
                       <TableHead className="text-left font-semibold">Candidate</TableHead>
                       <TableHead className="text-left font-semibold">Education</TableHead>
                        <TableHead className="text-left font-semibold">Recent Experience</TableHead>
                        <TableHead className="text-center font-semibold">Total Experience</TableHead>
                       <TableHead className="text-left font-semibold">Languages</TableHead>
                       <TableHead className="text-center font-semibold">Status</TableHead>
                       <TableHead className="text-center font-semibold">Longlist</TableHead>
                       <TableHead className="text-center font-semibold">Match</TableHead>
                       <TableHead className="text-center font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                     {loading ? (
                       <TableRow>
                         <TableCell colSpan={10} className="text-center py-8">
                           Loading applications...
                         </TableCell>
                       </TableRow>
                     ) : filteredApplications.length === 0 ? (
                       <TableRow>
                         <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                           No applications found
                         </TableCell>
                       </TableRow>
                    ) : (
                       filteredApplications.map((application) => (
                         <>
                            <TableRow 
                              key={application.id} 
                              className="hover:bg-muted/30 transition-colors duration-150 border-b border-border/50 cursor-pointer"
                              onClick={() => navigate(`/application/${application.id}`)}
                            >
                            <TableCell>
                              <Checkbox
                                checked={selectedApplications.has(application.id)}
                                onCheckedChange={() => toggleApplicationSelection(application.id)}
                              />
                            </TableCell>
                             <TableCell className="min-w-[250px]">
                               <div className="flex items-center justify-between">
                                 <div className="flex items-start space-x-3 flex-1 min-w-0">
                                   <div className="flex-shrink-0 mt-0.5">
                                     <User className="w-4 h-4 text-muted-foreground" />
                                   </div>
                                   <div className="flex-1 min-w-0">
                                     <div className="flex items-center gap-2">
                                       <div className="font-medium text-sm leading-tight truncate" title={application.candidate.name}>
                                         {application.candidate.name}
                                       </div>
                                       {application.candidate.gender && (
                                         <span 
                                           className={`text-base flex-shrink-0 font-bold ${
                                             application.candidate.gender.toLowerCase() === 'male' ? 'text-blue-600' : 
                                             application.candidate.gender.toLowerCase() === 'female' ? 'text-pink-600' : 'text-gray-600'
                                           }`} 
                                           title={`Gender: ${application.candidate.gender}`}
                                         >
                                           {application.candidate.gender.toLowerCase() === 'male' ? '♂' : 
                                            application.candidate.gender.toLowerCase() === 'female' ? '♀' : '?'}
                                         </span>
                                       )}
                                     </div>
                                     <div className="text-xs text-muted-foreground leading-tight truncate" title={application.candidate.email}>
                                       {application.candidate.email}
                                     </div>
                                     {application.candidate.location && (
                                       <div className="flex items-center gap-1 mt-1">
                                         {(() => {
                                           const country = getCountryFromLocation(application.candidate.location);
                                           const flagUrl = country ? getCountryFlagUrl(country) : '';
                                           return (
                                             <>
                                               {flagUrl && (
                                                 <img 
                                                   src={flagUrl} 
                                                   alt={`${country} flag`} 
                                                   className="w-4 h-3 object-cover rounded-sm flex-shrink-0"
                                                   onError={(e) => {
                                                     e.currentTarget.style.display = 'none';
                                                   }}
                                                 />
                                               )}
                                               <span className="text-xs text-muted-foreground leading-tight truncate" title={country || application.candidate.location}>
                                                 {country || application.candidate.location}
                                               </span>
                                             </>
                                           );
                                         })()}
                                       </div>
                                     )}
                                   </div>
                                 </div>
                                 <Button
                                   variant="ghost"
                                   size="sm"
                                   onClick={() => toggleRowExpansion(application.id)}
                                   className="flex-shrink-0 ml-2"
                                 >
                                   {expandedRows.has(application.id) ? 
                                     <ChevronDown className="w-4 h-4" /> : 
                                     <ChevronRight className="w-4 h-4" />
                                   }
                                 </Button>
                               </div>
                             </TableCell>
              <TableCell className="min-w-[250px]">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <GraduationCap className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {(() => {
                      const allEducation = getAllEducationDetails(application.candidate.education);
                      return (
                        <div className="space-y-2">
                          {allEducation.length > 0 ? allEducation.map((edu, index) => (
                            <div key={index} className="space-y-0.5 pb-1 border-b border-border/30 last:border-b-0 last:pb-0">
                              <div className="font-medium text-sm leading-tight" title={edu.degree}>
                                {edu.degree}
                              </div>
                              {edu.fieldOfStudy && (
                                <div className="text-xs text-muted-foreground leading-tight font-medium" title={edu.fieldOfStudy}>
                                  {edu.fieldOfStudy}
                                </div>
                              )}
                              {edu.institution && (
                                <div className="text-xs text-muted-foreground leading-tight truncate" title={edu.institution}>
                                  {edu.institution}
                                </div>
                              )}
                              {edu.year && (
                                <div className="text-xs text-muted-foreground font-medium">
                                  {edu.year}
                                </div>
                              )}
                            </div>
                          )) : (
                            <div className="text-sm text-muted-foreground">No education specified</div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </TableCell>
                              <TableCell className="min-w-[280px]">
                                <div className="flex items-start space-x-3">
                                  <div className="flex-shrink-0 mt-0.5">
                                    <Briefcase className="w-4 h-4 text-muted-foreground" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    {(() => {
                                      const recentJobs = getRecentWorkExperience(application.candidate.work_experience);
                                      return (
                                        <div className="space-y-2">
                                          {recentJobs.map((job, index) => (
                                            <div key={index} className="space-y-0.5 pb-1 border-b border-border/30 last:border-b-0 last:pb-0">
                                              <div className="font-medium text-sm leading-tight" title={job.title}>
                                                {job.title}
                                                {index === 0 && (
                                                  <span className="ml-2 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">Current</span>
                                                )}
                                              </div>
                                              {job.organization && (
                                                <div className="text-xs text-muted-foreground leading-tight truncate" title={job.organization}>
                                                  {job.organization}
                                                </div>
                                              )}
                                              <div className="flex items-center gap-2">
                                                {job.length && (
                                                  <span className="text-xs text-muted-foreground font-medium">
                                                    {job.length}
                                                  </span>
                                                )}
                                                {index === 0 && application.candidate.un_experience && (
                                                  <Badge variant="outline" className="text-xs px-1.5 py-0.5">UN</Badge>
                                                )}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      );
                                    })()}
                                  </div>
                                </div>
                              </TableCell>
                             <TableCell className="min-w-[120px]">
                               <div className="flex items-center justify-center">
                                 <div className="text-center">
                                   <div className="font-semibold text-sm text-foreground">
                                     {getTotalExperience(application.candidate.work_experience, application.candidate.years_of_experience)}
                                   </div>
                                   <div className="text-xs text-muted-foreground">
                                     total
                                   </div>
                                 </div>
                               </div>
                             </TableCell>
                             <TableCell className="min-w-[150px]">
                               <div className="flex items-start space-x-3">
                                 <div className="flex-shrink-0 mt-0.5">
                                   <Languages className="w-4 h-4 text-muted-foreground" />
                                 </div>
                                 <div className="flex-1 min-w-0">
                                   <span className="text-sm leading-tight truncate block" title={getLanguageSummary(application.candidate.languages)}>
                                     {getLanguageSummary(application.candidate.languages)}
                                   </span>
                                 </div>
                               </div>
                             </TableCell>
                             <TableCell className="min-w-[120px]">
                               <div className="flex justify-center">
                                 {getStatusBadge(application.status)}
                               </div>
                             </TableCell>
                             <TableCell className="min-w-[140px]">
                               <div className="flex justify-center">
                                 <Button
                                   size="sm"
                                   variant={application.suggested_for_longlist ? "default" : "outline"}
                                   onClick={() => application.suggested_for_longlist ? 
                                     removeFromLonglist([application.id]) : 
                                     addToLonglist([application.id])
                                   }
                                   className="whitespace-nowrap"
                                 >
                                   {application.suggested_for_longlist ? (
                                     <>
                                       <Check className="w-3 h-3 mr-1.5" />
                                       Listed
                                     </>
                                   ) : (
                                     <>
                                       <Plus className="w-3 h-3 mr-1.5" />
                                       Add
                                     </>
                                   )}
                                 </Button>
                               </div>
                             </TableCell>
                             <TableCell className="min-w-[100px]">
                               <div className="flex justify-center">
                                 {getScoreBadge(application)}
                               </div>
                             </TableCell>
                             <TableCell className="min-w-[120px]">
                               <div className="flex items-center justify-center space-x-1">
                                 <Button
                                   size="sm"
                                   variant="outline"
                                   onClick={() => navigate(`/application/${application.id}`)}
                                   className="whitespace-nowrap"
                                 >
                                   <Eye className="w-3 h-3 mr-1" />
                                   View
                                 </Button>
                                  {(userRoles.includes('Admin') || userRoles.includes('HR Assistant')) && (
                                    <>
                                      {/* Show edit button for manually added candidates */}
                                      {application.source === 'manual_entry' && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            navigate(`/admin/applications/edit-manual/${application.id}`);
                                          }}
                                          className="px-2"
                                        >
                                          <Edit className="w-3 h-3" />
                                        </Button>
                                      )}
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={(e) => deleteApplication(application.id, application.candidate.id, e)}
                                        className="px-2"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    </>
                                  )}
                               </div>
                             </TableCell>
                          </TableRow>
                          
                           {/* Expanded Row Details */}
                           {expandedRows.has(application.id) && (
                             <TableRow key={`${application.id}-details`}>
                               <TableCell colSpan={10} className="bg-muted/20 p-6">
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                  {/* Education Details */}
                                  <Card>
                                    <CardHeader className="pb-3">
                                      <CardTitle className="text-sm flex items-center">
                                        <GraduationCap className="w-4 h-4 mr-2" />
                                        Education History
                                      </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                      {(() => {
                                        const educationArray = Array.isArray(application.candidate.education) ? 
                                          application.candidate.education : 
                                          (application.candidate.education?.length ? application.candidate.education : []);
                                        return educationArray.length > 0 ? (
                                          educationArray.slice(0, 3).map((edu: any, index: number) => (
                                            <div key={index} className="border-l-2 border-muted pl-3">
                                              <div className="font-medium text-sm">{edu.degree || edu.degree_type}</div>
                                              <div className="text-sm text-muted-foreground">{edu.institution || edu.institution_name}</div>
                                              <div className="text-xs text-muted-foreground">
                                                {edu.startDate || `${edu.from_year}`}
                                              </div>
                                            </div>
                                          ))
                                        ) : (
                                          <div className="text-sm text-muted-foreground">No education data</div>
                                        );
                                      })()}
                                    </CardContent>
                                  </Card>

                                  {/* Work Experience Details */}
                                  <Card>
                                    <CardHeader className="pb-3">
                                      <CardTitle className="text-sm flex items-center">
                                        <Briefcase className="w-4 h-4 mr-2" />
                                        Work Experience
                                      </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                      {(() => {
                                        const workExpArray = Array.isArray(application.candidate.work_experience) ? 
                                          application.candidate.work_experience : 
                                          (application.candidate.work_experience?.length ? application.candidate.work_experience : []);
                                        return workExpArray.length > 0 ? (
                                          workExpArray.slice(0, 3).map((exp: any, index: number) => (
                                            <div key={index} className="border-l-2 border-muted pl-3">
                                              <div className="font-medium text-sm">{exp.position || exp.exact_title_of_post}</div>
                                              <div className="text-sm text-muted-foreground">{exp.company || exp.employer_name}</div>
                                              <div className="text-xs text-muted-foreground">
                                                {exp.startDate || `${exp.period_from_year}`}
                                                {exp.isUNExperience && <Badge variant="outline" className="ml-2 text-xs">UN</Badge>}
                                              </div>
                                            </div>
                                          ))
                                        ) : (
                                          <div className="text-sm text-muted-foreground">No work experience data</div>
                                        );
                                      })()}
                                    </CardContent>
                                  </Card>

                                  {/* Languages & Skills */}
                                  <Card>
                                    <CardHeader className="pb-3">
                                      <CardTitle className="text-sm flex items-center">
                                        <Languages className="w-4 h-4 mr-2" />
                                        Languages & Skills
                                      </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                      <div>
                                        <div className="font-medium text-sm mb-2">Languages</div>
                                        <div className="flex flex-wrap gap-1">
                                          {application.candidate.languages?.un_languages && 
                                            Object.entries(application.candidate.languages.un_languages).map(([lang, level]: [string, any]) => (
                                              <Badge key={lang} variant="outline" className="text-xs">
                                                {lang}: {level}
                                              </Badge>
                                            ))
                                          }
                                        </div>
                                      </div>
                                      <div>
                                        <div className="font-medium text-sm mb-2">Skills</div>
                                        <div className="flex flex-wrap gap-1">
                                          {(() => {
                                            const skillsArray = Array.isArray(application.candidate.skills) ? 
                                              application.candidate.skills : 
                                              (application.candidate.skills?.length ? application.candidate.skills : []);
                                            return skillsArray.slice(0, 5).map((skill: any, index: number) => (
                                              <Badge key={index} variant="secondary" className="text-xs">
                                                {typeof skill === 'string' ? skill : skill.name || skill}
                                              </Badge>
                                            ));
                                          })()}
                                        </div>
                                      </div>
                                      <div className="text-sm">
                                        <span className="font-medium">PHF Status:</span>{' '}
                                        <span className={application.phf_completed ? "text-green-600" : "text-yellow-600"}>
                                          {application.phf_completed ? "Complete" : "In Progress"}
                                        </span>
                                      </div>
                                      <div className="text-sm">
                                        <span className="font-medium">Submitted:</span>{' '}
                                        {format(new Date(application.submitted_at), 'MMM dd, yyyy HH:mm')}
                                      </div>
                                    </CardContent>
                                  </Card>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}

