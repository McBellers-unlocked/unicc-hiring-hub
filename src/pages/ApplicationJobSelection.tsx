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
}

type JobDisplayStatus = 'active' | 'closing' | 'closed' | 'pipeline';

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

      // Fetch requisitions to identify pipeline jobs
      const { data: requisitions } = await supabase
        .from('job_requisitions')
        .select('id, converted_to_job_id, status, initial_request_approved')
        .not('converted_to_job_id', 'is', null);

      // Fetch application counts for each job
      if (data) {
        const jobsWithCounts = await Promise.all(
          data.map(async (job) => {
            const { count } = await supabase
              .from('applications')
              .select('*', { count: 'exact', head: true })
              .eq('job_id', job.id);
            
            // Find if this job has an associated requisition in pipeline
            const requisition = requisitions?.find(req => req.converted_to_job_id === job.id);
            const isPipeline = requisition && 
                              requisition.initial_request_approved && 
                              !['draft', 'initial_request_draft', 'initial_request_submitted'].includes(requisition.status || '');
            
            return { 
              ...job, 
              application_count: count || 0,
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
    
    // Check if closed
    if (job.status === 'closed') {
      return 'closed';
    }
    
    // Check if closing within 3 days
    if (job.status === 'active' && job.closing_date) {
      const closingDate = new Date(job.closing_date);
      const now = new Date();
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(now.getDate() + 3);
      
      if (closingDate <= threeDaysFromNow && closingDate > now) {
        return 'closing';
      }
    }
    
    // Default to active for active jobs
    if (job.status === 'active') {
      return 'active';
    }
    
    // For draft/archived, return closed
    return 'closed';
  };

  // Calculate stats
  const stats = {
    active: jobs.filter(j => getJobDisplayStatus(j) === 'active').length,
    closing: jobs.filter(j => getJobDisplayStatus(j) === 'closing').length,
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
        return status === 'active' || status === 'closing';
      }
      return getJobDisplayStatus(job) === activeFilter;
    })
    .sort((a, b) => {
      // Sort by display status priority: Active, Closing, Closed, Pipeline
      const statusOrder: Record<JobDisplayStatus, number> = {
        active: 1,
        closing: 2,
        closed: 3,
        pipeline: 4
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
        } ${displayStatus === 'closed' ? 'opacity-60' : ''}`}
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
          {relativeTime && displayStatus !== 'closed' && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Clock className="w-4 h-4 mr-2" />
              <span className={urgent ? 'text-destructive font-medium' : ''}>{relativeTime}</span>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatsCard
                title="Active Jobs"
                value={stats.active}
                subtitle={`${stats.totalApplications} total applications`}
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
                title="Pipeline Jobs"
                value={stats.pipeline}
                subtitle="PD in progress"
                icon={Users}
                className="cursor-pointer"
                onClick={() => setActiveFilter('pipeline')}
              />
              <StatsCard
                title="Closed Jobs"
                value={stats.closed}
                subtitle="No longer accepting"
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
                Active & Closing
                {activeFilter === 'active-closing' && (
                  <Badge variant="secondary" className="ml-2 bg-primary-foreground text-primary">
                    {stats.active + stats.closing}
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
