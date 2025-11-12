import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Briefcase, Search, Users, Clock, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import StatsCard from '@/components/dashboard/StatsCard';
import { formatDistanceToNow } from 'date-fns';

interface Job {
  id: string;
  title: string;
  status: string;
  org_unit: string | null;
  closing_date: string | null;
  timezone: string;
  application_count?: number;
  requisition_status?: string | null;
  application_statuses?: { status: string; count: number }[];
}

type JobDisplayStatus = 'active' | 'closing' | 'longlisting' | 'hm_shortlisting' | 'video_interview' | 'panel_interview' | 'closed' | 'pipeline';

export default function ApplicationJobSelection() {
  const { userRoles } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active-closing' | JobDisplayStatus>('active-closing');
  const [showClosed, setShowClosed] = useState(false);

  const hasAccess = userRoles.includes('Admin') || userRoles.includes('HR Assistant') || 
                   userRoles.includes('Chief of HR') || userRoles.includes('Hiring Manager') || 
                   userRoles.includes('Panel Member');

  useEffect(() => {
    if (hasAccess) {
      fetchJobs();
    }
  }, [hasAccess]);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('jobs')
        .select('id, title, status, org_unit, closing_date, timezone')
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
            setJobs([]);
            setLoading(false);
            return;
          }
        }
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch requisitions to identify pipeline jobs (remove converted filter to get all requisitions)
      const { data: requisitions } = await supabase
        .from('job_requisitions')
        .select('id, converted_to_job_id, status, initial_request_approved');

      // Fetch application counts and statuses for each job
      if (data) {
        const jobsWithCounts = await Promise.all(
          data.map(async (job) => {
            const { count } = await supabase
              .from('applications')
              .select('*', { count: 'exact', head: true })
              .eq('job_id', job.id);
            
            // Fetch application status breakdown
            const { data: statusData } = await supabase
              .from('applications')
              .select('status')
              .eq('job_id', job.id);
            
            // Count applications by status
            const statusCounts = statusData?.reduce((acc, app) => {
              const status = app.status || 'Application';
              acc[status] = (acc[status] || 0) + 1;
              return acc;
            }, {} as Record<string, number>);
            
            const application_statuses = Object.entries(statusCounts || {}).map(([status, count]) => ({
              status,
              count
            }));
            
            // Find if this job has an associated requisition in pipeline
            const requisition = requisitions?.find(req => req.converted_to_job_id === job.id);
            
            // Pipeline statuses: requisitions that are in workflow but not yet published
            const pipelineStatuses = [
              'initial_request_approved',
              'hr_review',
              'hiring_manager_review',
              'chief_division_review',
              'chief_of_division_review',
              'deputy_director_review',
              'director_review',
              'approved'
            ];
            
            const isPipeline = requisition && 
                              pipelineStatuses.includes(requisition.status || '') &&
                              !requisition.converted_to_job_id;
            
            return { 
              ...job, 
              application_count: count || 0,
              application_statuses,
              requisition_status: isPipeline ? requisition.status : null
            };
          })
        );
        setJobs(jobsWithCounts);
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
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

  // Determine the display status for a job
  const getJobDisplayStatus = (job: Job): JobDisplayStatus => {
    // Pipeline takes precedence if job has an active requisition
    if (job.requisition_status) {
      return 'pipeline';
    }
    
    // Check recruitment stage based on application statuses (takes precedence over everything except pipeline)
    const statuses = job.application_statuses || [];
    const totalApps = job.application_count || 0;
    
    if (totalApps > 0 && statuses.length > 0) {
      const inVideoInterview = statuses.find(s => s.status === 'Video Interview')?.count || 0;
      const inPanelInterview = statuses.find(s => s.status === 'Panel Interview')?.count || 0;
      
      // Panel Interview Stage: If any apps are in panel interview
      if (inPanelInterview > 0) {
        return 'panel_interview';
      }
      
      // Video Interview Stage: If any apps are in video interview
      if (inVideoInterview > 0) {
        return 'video_interview';
      }
    }
    
    // Check if job is still active/open (for jobs not in interview stages)
    if (job.status === 'active' && job.closing_date) {
      const closingDate = new Date(job.closing_date);
      const now = new Date();
      
      // If closing date is in the future, job is either Active or Closing
      if (closingDate > now) {
        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(now.getDate() + 3);
        
        // Closing within 3 days
        if (closingDate <= threeDaysFromNow) {
          return 'closing';
        }
        
        // Still active
        return 'active';
      }
    }
    
    // Default to active for active jobs without closing date
    if (job.status === 'active') {
      return 'active';
    }
    
    // For CLOSED jobs not in interview stages, determine other recruitment stages
    if (job.status === 'closed' || (job.closing_date && new Date(job.closing_date) < new Date())) {
      if (totalApps > 0 && statuses.length > 0) {
        const inApplication = statuses.find(s => s.status === 'Application')?.count || 0;
        const inLonglist = statuses.find(s => s.status === 'Longlist')?.count || 0;
        const inShortlist = statuses.find(s => s.status === 'Shortlist')?.count || 0;
        
        // Hiring Manager Shortlisting: No apps in "Application" status AND there are longlisted/shortlisted apps
        if (inApplication === 0 && (inLonglist + inShortlist) > 0) {
          return 'hm_shortlisting';
        }
      }
      
      // Check if within 14-day longlisting period
      if (job.closing_date) {
        const closingDate = new Date(job.closing_date);
        const now = new Date();
        const fourteenDaysAfterClosing = new Date(closingDate);
        fourteenDaysAfterClosing.setDate(closingDate.getDate() + 14);
        
        // If within 14 days of closing, show as longlisting
        if (now <= fourteenDaysAfterClosing && now > closingDate) {
          return 'longlisting';
        }
      }
      
      return 'closed';
    }
    
    // For draft/archived, return closed
    return 'closed';
  };

  // Calculate stats
  const stats = {
    active: jobs.filter(j => getJobDisplayStatus(j) === 'active').length,
    closing: jobs.filter(j => getJobDisplayStatus(j) === 'closing').length,
    longlisting: jobs.filter(j => getJobDisplayStatus(j) === 'longlisting').length,
    hm_shortlisting: jobs.filter(j => getJobDisplayStatus(j) === 'hm_shortlisting').length,
    video_interview: jobs.filter(j => getJobDisplayStatus(j) === 'video_interview').length,
    panel_interview: jobs.filter(j => getJobDisplayStatus(j) === 'panel_interview').length,
    closed: jobs.filter(j => getJobDisplayStatus(j) === 'closed').length,
    pipeline: jobs.filter(j => getJobDisplayStatus(j) === 'pipeline').length,
    totalApplications: jobs.reduce((sum, j) => sum + (j.application_count || 0), 0),
  };

  // Filter and sort jobs
  const filteredJobs = jobs
    .filter(job => {
      // Search filter
      const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (job.org_unit?.toLowerCase() || '').includes(searchTerm.toLowerCase());
      
      if (!matchesSearch) return false;
      
      // Status filter
      if (activeFilter === 'all') return true;
      if (activeFilter === 'active-closing') {
        const status = getJobDisplayStatus(job);
        return status === 'active' || status === 'closing' || status === 'longlisting' || 
               status === 'hm_shortlisting' || status === 'video_interview' || status === 'panel_interview';
      }
      return getJobDisplayStatus(job) === activeFilter;
    })
    .sort((a, b) => {
      // Sort by display status priority
      const statusOrder: Record<JobDisplayStatus, number> = {
        active: 1,
        closing: 2,
        longlisting: 3,
        hm_shortlisting: 4,
        video_interview: 5,
        panel_interview: 6,
        pipeline: 7,
        closed: 8
      };
      
      const aStatus = getJobDisplayStatus(a);
      const bStatus = getJobDisplayStatus(b);
      
      const statusDiff = statusOrder[aStatus] - statusOrder[bStatus];
      if (statusDiff !== 0) return statusDiff;
      
      // Within same status, sort by application count (descending)
      return (b.application_count || 0) - (a.application_count || 0);
    });

  // Group jobs by status
  const groupedJobs = {
    active: filteredJobs.filter(j => getJobDisplayStatus(j) === 'active'),
    closing: filteredJobs.filter(j => getJobDisplayStatus(j) === 'closing'),
    longlisting: filteredJobs.filter(j => getJobDisplayStatus(j) === 'longlisting'),
    hm_shortlisting: filteredJobs.filter(j => getJobDisplayStatus(j) === 'hm_shortlisting'),
    video_interview: filteredJobs.filter(j => getJobDisplayStatus(j) === 'video_interview'),
    panel_interview: filteredJobs.filter(j => getJobDisplayStatus(j) === 'panel_interview'),
    closed: filteredJobs.filter(j => getJobDisplayStatus(j) === 'closed'),
    pipeline: filteredJobs.filter(j => getJobDisplayStatus(j) === 'pipeline'),
  };

  const getStatusBadge = (job: Job) => {
    const displayStatus = getJobDisplayStatus(job);
    
    const badgeConfig = {
      active: { 
        label: 'Active', 
        className: 'bg-green-500 hover:bg-green-600 text-white'
      },
      closing: { 
        label: 'Closing', 
        className: 'bg-amber-500 hover:bg-amber-600 text-white'
      },
      longlisting: { 
        label: 'Longlisting', 
        className: 'bg-orange-500 hover:bg-orange-600 text-white'
      },
      hm_shortlisting: { 
        label: 'HM Shortlisting', 
        className: 'bg-blue-500 hover:bg-blue-600 text-white'
      },
      video_interview: { 
        label: 'Video Interview', 
        className: 'bg-indigo-500 hover:bg-indigo-600 text-white'
      },
      panel_interview: { 
        label: 'Panel Interview', 
        className: 'bg-violet-500 hover:bg-violet-600 text-white'
      },
      closed: { 
        label: 'Closed', 
        className: 'bg-red-500 hover:bg-red-600 text-white'
      },
      pipeline: { 
        label: 'Pipeline', 
        className: 'bg-purple-400 hover:bg-purple-500 text-white'
      }
    } as const;

    const config = badgeConfig[displayStatus];
    return config.className;
  };

  const getStatusLabel = (job: Job) => {
    const displayStatus = getJobDisplayStatus(job);
    
    const labels = {
      active: 'Active',
      closing: 'Closing',
      longlisting: 'Longlisting',
      hm_shortlisting: 'HM Shortlisting',
      video_interview: 'Video Interview',
      panel_interview: 'Panel Interview',
      closed: 'Closed',
      pipeline: 'Pipeline'
    } as const;

    return labels[displayStatus];
  };

  const getRelativeClosingTime = (job: Job) => {
    if (!job.closing_date) return null;
    
    const closingDate = new Date(job.closing_date);
    const now = new Date();
    
    if (closingDate < now) return 'Closed';
    
    return `Closes ${formatDistanceToNow(closingDate, { addSuffix: true })}`;
  };

  const isUrgent = (job: Job) => {
    if (!job.closing_date || job.status !== 'active') return false;
    
    const closingDate = new Date(job.closing_date);
    const now = new Date();
    const oneDayFromNow = new Date();
    oneDayFromNow.setDate(now.getDate() + 1);
    
    return closingDate <= oneDayFromNow && closingDate > now;
  };

  const renderJobCard = (job: Job) => {
    const displayStatus = getJobDisplayStatus(job);
    const urgent = isUrgent(job);
    const relativeTime = getRelativeClosingTime(job);
    
    return (
      <Card
        key={job.id}
        className={`cursor-pointer hover:shadow-lg transition-all hover:border-primary/50 ${
          urgent ? 'border-l-4 border-l-destructive' : ''
        } ${displayStatus === 'closed' ? 'opacity-60' : ''} ${displayStatus === 'longlisting' ? 'border-l-4 border-l-orange-500' : ''}`}
        onClick={() => navigate(`/applications/manage?job=${job.id}`)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-primary" />
              {urgent && <AlertCircle className="w-4 h-4 text-destructive animate-pulse" />}
            </div>
            <Badge className={getStatusBadge(job)}>
              {getStatusLabel(job)}
            </Badge>
          </div>
          <CardTitle className="text-lg line-clamp-2">{job.title}</CardTitle>
          {job.org_unit && (
            <p className="text-sm text-muted-foreground mt-1">{job.org_unit}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center text-sm text-muted-foreground">
            <Users className="w-4 h-4 mr-2" />
            <span>{job.application_count} application{job.application_count !== 1 ? 's' : ''}</span>
          </div>
          {relativeTime && displayStatus !== 'closed' && displayStatus !== 'longlisting' && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Clock className="w-4 h-4 mr-2" />
              <span className={urgent ? 'text-destructive font-medium' : ''}>{relativeTime}</span>
            </div>
          )}
          {displayStatus === 'longlisting' && job.closing_date && (
            <div className="flex items-center text-sm text-orange-600 font-medium">
              <Clock className="w-4 h-4 mr-2" />
              <span>14-day longlisting period</span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderJobSection = (title: string, jobs: Job[], count: number) => {
    if (jobs.length === 0) return null;
    
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
          {title}
          <Badge variant="secondary" className="text-xs">
            {count}
          </Badge>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {jobs.map(renderJobCard)}
        </div>
      </div>
    );
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Application Management</h1>
          <p className="text-muted-foreground">Select a job to view and manage applications</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading jobs...</p>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4 mb-8">
              <StatsCard
                title="Active Jobs"
                value={stats.active}
                subtitle="Accepting applications"
                icon={Briefcase}
                className="cursor-pointer"
                onClick={() => setActiveFilter('active')}
              />
              <StatsCard
                title="Closing Soon"
                value={stats.closing}
                subtitle="Next 3 days"
                icon={Clock}
                alert={stats.closing > 0}
                className="cursor-pointer"
                onClick={() => setActiveFilter('closing')}
              />
              <StatsCard
                title="Longlisting"
                value={stats.longlisting}
                subtitle="14-day KPI"
                icon={AlertCircle}
                alert={stats.longlisting > 0}
                className="cursor-pointer"
                onClick={() => setActiveFilter('longlisting')}
              />
              <StatsCard
                title="HM Shortlisting"
                value={stats.hm_shortlisting}
                subtitle="Manager review"
                icon={Users}
                alert={stats.hm_shortlisting > 0}
                className="cursor-pointer"
                onClick={() => setActiveFilter('hm_shortlisting')}
              />
              <StatsCard
                title="Video Interview"
                value={stats.video_interview}
                subtitle="Video stage"
                icon={Users}
                className="cursor-pointer"
                onClick={() => setActiveFilter('video_interview')}
              />
              <StatsCard
                title="Panel Interview"
                value={stats.panel_interview}
                subtitle="Panel stage"
                icon={Users}
                className="cursor-pointer"
                onClick={() => setActiveFilter('panel_interview')}
              />
              <StatsCard
                title="Pipeline"
                value={stats.pipeline}
                subtitle="PD workflow"
                icon={Users}
                className="cursor-pointer"
                onClick={() => setActiveFilter('pipeline')}
              />
              <StatsCard
                title="Closed"
                value={stats.closed}
                subtitle="Completed"
                className="cursor-pointer"
                onClick={() => setActiveFilter('closed')}
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-2 mb-6">
              <Button
                variant={activeFilter === 'active-closing' ? 'default' : 'outline'}
                onClick={() => setActiveFilter('active-closing')}
                size="sm"
              >
                Active & In Progress
                {activeFilter === 'active-closing' && (
                  <Badge variant="secondary" className="ml-2 bg-primary-foreground text-primary">
                    {stats.active + stats.closing + stats.longlisting + stats.hm_shortlisting + stats.video_interview + stats.panel_interview}
                  </Badge>
                )}
              </Button>
              <Button
                variant={activeFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setActiveFilter('all')}
                size="sm"
              >
                All
                {activeFilter === 'all' && (
                  <Badge variant="secondary" className="ml-2 bg-primary-foreground text-primary">
                    {jobs.length}
                  </Badge>
                )}
              </Button>
              <Button
                variant={activeFilter === 'active' ? 'default' : 'outline'}
                onClick={() => setActiveFilter('active')}
                size="sm"
              >
                Active
                {activeFilter === 'active' && (
                  <Badge variant="secondary" className="ml-2 bg-primary-foreground text-primary">
                    {stats.active}
                  </Badge>
                )}
              </Button>
              <Button
                variant={activeFilter === 'closing' ? 'default' : 'outline'}
                onClick={() => setActiveFilter('closing')}
                size="sm"
              >
                Closing
                {activeFilter === 'closing' && (
                  <Badge variant="secondary" className="ml-2 bg-primary-foreground text-primary">
                    {stats.closing}
                  </Badge>
                )}
              </Button>
              <Button
                variant={activeFilter === 'longlisting' ? 'default' : 'outline'}
                onClick={() => setActiveFilter('longlisting')}
                size="sm"
              >
                Longlisting
                {activeFilter === 'longlisting' && (
                  <Badge variant="secondary" className="ml-2 bg-primary-foreground text-primary">
                    {stats.longlisting}
                  </Badge>
                )}
              </Button>
              <Button
                variant={activeFilter === 'hm_shortlisting' ? 'default' : 'outline'}
                onClick={() => setActiveFilter('hm_shortlisting')}
                size="sm"
              >
                HM Shortlisting
                {activeFilter === 'hm_shortlisting' && (
                  <Badge variant="secondary" className="ml-2 bg-primary-foreground text-primary">
                    {stats.hm_shortlisting}
                  </Badge>
                )}
              </Button>
              <Button
                variant={activeFilter === 'video_interview' ? 'default' : 'outline'}
                onClick={() => setActiveFilter('video_interview')}
                size="sm"
              >
                Video Interview
                {activeFilter === 'video_interview' && (
                  <Badge variant="secondary" className="ml-2 bg-primary-foreground text-primary">
                    {stats.video_interview}
                  </Badge>
                )}
              </Button>
              <Button
                variant={activeFilter === 'panel_interview' ? 'default' : 'outline'}
                onClick={() => setActiveFilter('panel_interview')}
                size="sm"
              >
                Panel Interview
                {activeFilter === 'panel_interview' && (
                  <Badge variant="secondary" className="ml-2 bg-primary-foreground text-primary">
                    {stats.panel_interview}
                  </Badge>
                )}
              </Button>
              <Button
                variant={activeFilter === 'pipeline' ? 'default' : 'outline'}
                onClick={() => setActiveFilter('pipeline')}
                size="sm"
              >
                Pipeline
                {activeFilter === 'pipeline' && (
                  <Badge variant="secondary" className="ml-2 bg-primary-foreground text-primary">
                    {stats.pipeline}
                  </Badge>
                )}
              </Button>
              <Button
                variant={activeFilter === 'closed' ? 'default' : 'outline'}
                onClick={() => setActiveFilter('closed')}
                size="sm"
              >
                Closed
                {activeFilter === 'closed' && (
                  <Badge variant="secondary" className="ml-2 bg-primary-foreground text-primary">
                    {stats.closed}
                  </Badge>
                )}
              </Button>
            </div>

            {/* Search */}
            <div className="mb-8">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search jobs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Jobs by Section */}
            {filteredJobs.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Briefcase className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {searchTerm ? 'No jobs found matching your search' : 'No jobs available in this category'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-8">
                {/* Active Jobs */}
                {renderJobSection('Active Jobs', groupedJobs.active, groupedJobs.active.length)}
                
                {/* Closing Soon */}
                {renderJobSection('Closing Soon', groupedJobs.closing, groupedJobs.closing.length)}
                
                {/* Longlisting - 14 day KPI period */}
                {groupedJobs.longlisting.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                        Active Longlisting
                        <Badge variant="secondary" className="text-xs">
                          {groupedJobs.longlisting.length}
                        </Badge>
                      </h2>
                      <Badge className="bg-orange-500 text-white">14-day KPI Period</Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {groupedJobs.longlisting.map(renderJobCard)}
                    </div>
                  </div>
                )}
                
                {/* Hiring Manager Shortlisting */}
                {groupedJobs.hm_shortlisting.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                        Hiring Manager Shortlisting
                        <Badge variant="secondary" className="text-xs">
                          {groupedJobs.hm_shortlisting.length}
                        </Badge>
                      </h2>
                      <Badge className="bg-blue-500 text-white">Manager Review Stage</Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {groupedJobs.hm_shortlisting.map(renderJobCard)}
                    </div>
                  </div>
                )}
                
                {/* Video Interview */}
                {renderJobSection('Video Interview Stage', groupedJobs.video_interview, groupedJobs.video_interview.length)}
                
                {/* Panel Interview */}
                {renderJobSection('Panel Interview Stage', groupedJobs.panel_interview, groupedJobs.panel_interview.length)}
                
                {/* Pipeline Jobs */}
                {renderJobSection('Pipeline Jobs', groupedJobs.pipeline, groupedJobs.pipeline.length)}
                
                {/* Closed Jobs - Collapsible */}
                {groupedJobs.closed.length > 0 && (
                  <div className="space-y-4">
                    <Button
                      variant="ghost"
                      onClick={() => setShowClosed(!showClosed)}
                      className="w-full justify-between hover:bg-muted"
                    >
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-semibold text-foreground">Closed Jobs</h2>
                        <Badge variant="secondary" className="text-xs">
                          {groupedJobs.closed.length}
                        </Badge>
                        <span className="text-sm text-muted-foreground">(Past 14-day period)</span>
                      </div>
                      {showClosed ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </Button>
                    {showClosed && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {groupedJobs.closed.map(renderJobCard)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
