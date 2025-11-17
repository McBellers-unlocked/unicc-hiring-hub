import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Copy, 
  Eye, 
  ToggleLeft, 
  ToggleRight, 
  Archive, 
  MoreVertical,
  Calendar,
  MapPin,
  Building2,
  Users
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';

interface Job {
  id: string;
  title: string;
  location: string | null;
  org_unit: string | null;
  closing_date: string | null;
  status: string;
  updated_at: string;
  slug: string | null;
  timezone: string;
  application_count?: number;
  application_stats?: {
    total: number;
    completed: number;
    in_progress: number;
    by_status: Record<string, number>;
  };
  application_statuses?: { status: string; count: number }[];
  requisition_status?: string | null;
}

type JobDisplayStatus = 'active' | 'closing' | 'longlisting' | 'hm_shortlisting' | 'video_interview' | 'panel_interview' | 'closed' | 'pipeline';

export default function AdminJobs() {
  const { userRoles } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [orgUnitFilter, setOrgUnitFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [closingFilter, setClosingFilter] = useState('all');
  
  // Check access permissions
  const hasAccess = userRoles.includes('Admin') || userRoles.includes('HR Assistant') || userRoles.includes('Chief of HR');

  useEffect(() => {
    if (hasAccess) {
      fetchJobs();
    }
  }, [hasAccess]);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      
      // Fetch jobs
      const { data, error } = await supabase
        .from('jobs')
        .select('id, title, location, org_unit, closing_date, status, updated_at, slug, timezone')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      
      // Fetch requisitions to identify pipeline jobs
      const { data: requisitions } = await supabase
        .from('job_requisitions')
        .select('id, converted_to_job_id, status, initial_request_approved')
        .not('converted_to_job_id', 'is', null);
      
      // Fetch application statistics for each job
      const jobsWithStats = await Promise.all(
        (data || []).map(async (job) => {
          const { data: applications, error: appError } = await supabase
            .from('applications')
            .select('id, status, phf_completed')
            .eq('job_id', job.id);

          if (appError) {
            console.error('Error fetching applications for job:', job.id, appError);
            return { 
              ...job, 
              application_count: 0,
              application_stats: { total: 0, completed: 0, in_progress: 0, by_status: {} }, 
              application_statuses: [],
              requisition_status: null 
            };
          }

          const total = applications?.length || 0;
          const completed = applications?.filter(app => app.phf_completed).length || 0;
          const in_progress = total - completed;
          
          const by_status = applications?.reduce((acc, app) => {
            acc[app.status] = (acc[app.status] || 0) + 1;
            return acc;
          }, {} as Record<string, number>) || {};

          // Convert by_status to application_statuses array format
          const application_statuses = Object.entries(by_status).map(([status, count]) => ({
            status,
            count
          }));

          // Find if this job has an associated requisition in pipeline
          const requisition = requisitions?.find(req => req.converted_to_job_id === job.id);
          const isPipeline = requisition && 
                            requisition.initial_request_approved && 
                            !['draft', 'initial_request_draft', 'initial_request_submitted', 'converted'].includes(requisition.status || '');

          return {
            ...job,
            application_count: total,
            application_stats: {
              total,
              completed,
              in_progress,
              by_status
            },
            application_statuses,
            requisition_status: isPipeline ? requisition.status : null
          };
        })
      );

      setJobs(jobsWithStats);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      toast({
        title: "Error",
        description: "Failed to load jobs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (jobId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'draft' : 'active';
    
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ status: newStatus })
        .eq('id', jobId);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: `Job ${newStatus === 'active' ? 'published' : 'unpublished'} successfully`,
      });
      
      fetchJobs();
    } catch (error) {
      console.error('Error updating job status:', error);
      toast({
        title: "Error",
        description: "Failed to update job status",
        variant: "destructive",
      });
    }
  };

  const archiveJob = async (jobId: string) => {
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ status: 'archived' })
        .eq('id', jobId);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Job archived successfully",
      });
      
      fetchJobs();
    } catch (error) {
      console.error('Error archiving job:', error);
      toast({
        title: "Error",
        description: "Failed to archive job",
        variant: "destructive",
      });
    }
  };

  const cloneJob = async (jobId: string) => {
    try {
      const { data: originalJob, error: fetchError } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (fetchError) throw fetchError;

      // Create a new job with copied data
      const { id, created_at, updated_at, slug, ...jobData } = originalJob;
      const clonedJob = {
        ...jobData,
        title: `${jobData.title} (Copy)`,
        status: 'draft',
        slug: null,
      };

      const { error: insertError } = await supabase
        .from('jobs')
        .insert([clonedJob]);

      if (insertError) throw insertError;
      
      toast({
        title: "Success",
        description: "Job cloned successfully",
      });
      
      fetchJobs();
    } catch (error) {
      console.error('Error cloning job:', error);
      toast({
        title: "Error",
        description: "Failed to clone job",
        variant: "destructive",
      });
    }
  };

  // Determine the display status for a job
  const getJobDisplayStatus = (job: Job): JobDisplayStatus => {
    // Pipeline takes precedence if job has an active requisition that hasn't been converted
    if (job.requisition_status) {
      return 'pipeline';
    }
    
    // Check if manually closed
    if (job.status === 'closed') {
      return 'closed';
    }
    
    // Check recruitment stages based on application statuses
    const statuses = job.application_statuses || [];
    const totalApps = job.application_count || 0;
    
    if (totalApps > 0 && statuses.length > 0) {
      const inApplication = statuses.find(s => s.status === 'Application')?.count || 0;
      const inRejected = statuses.find(s => s.status === 'Rejected')?.count || 0;
      const inLonglist = statuses.find(s => s.status === 'Longlist')?.count || 0;
      const inShortlist = statuses.find(s => s.status === 'Shortlist')?.count || 0;
      const inVideoInterview = (statuses.find(s => s.status === 'Video Interview')?.count || 0) + 
                               (statuses.find(s => s.status === 'Pre-Recorded Video')?.count || 0);
      const inPanelInterview = statuses.find(s => s.status === 'Panel Interview')?.count || 0;
      
      // Check if closing date has passed
      const closingDatePassed = job.closing_date ? new Date(job.closing_date) <= new Date() : false;
      
      // Panel Interview stage (always show if active)
      if (inPanelInterview > 0) {
        return 'panel_interview';
      }
      
      // Video Interview stage (always show if active)
      if (inVideoInterview > 0) {
        return 'video_interview';
      }
      
      // If closing date has passed, show recruitment stages
      if (closingDatePassed) {
        // HM Shortlisting - only if NO applications remain in "Application" status
        if (inApplication === 0 && (inLonglist > 0 || inShortlist > 0)) {
          return 'hm_shortlisting';
        }
        
        // Longlisting - if any applications are still in "Application" status
        if (inApplication > 0) {
          return 'longlisting';
        }
      }
    }
    
    // Check closing date status for active jobs
    if (job.status === 'active' && job.closing_date) {
      const closingDate = new Date(job.closing_date);
      const now = new Date();
      
      // If closing date is in the future
      if (closingDate > now) {
        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(now.getDate() + 3);
        
        if (closingDate <= threeDaysFromNow) {
          return 'closing';
        }
        
        return 'active';
      }
      
      // If closing date has passed but no applications, show active
      return 'active';
    }
    
    // Default to active for active jobs
    if (job.status === 'active') {
      return 'active';
    }
    
    // For draft/paused/archived, return closed
    return 'closed';
  };

  const getStatusBadge = (job: Job) => {
    // Check actual job status for draft/paused first
    if (job.status === 'draft') {
      return (
        <Badge className="bg-gray-500 hover:bg-gray-600 text-white">
          Draft
        </Badge>
      );
    }
    
    if (job.status === 'paused') {
      return (
        <Badge className="bg-gray-500 hover:bg-gray-600 text-white">
          Paused
        </Badge>
      );
    }
    
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
        className: 'bg-cyan-500 hover:bg-cyan-600 text-white'
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

    return (
      <Badge className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const formatClosingDate = (date: string | null, timezone: string) => {
    if (!date) return 'Not set';
    
    try {
      const parsedDate = new Date(date);
      const now = new Date();
      const isExpired = parsedDate < now;
      
      const formatted = format(parsedDate, 'dd/MM/yyyy HH:mm');
      
      return (
        <span className={isExpired ? 'text-destructive' : ''}>
          {formatted}
          <span className="text-xs text-muted-foreground ml-1">({timezone})</span>
        </span>
      );
    } catch {
      return 'Invalid date';
    }
  };

  // Auto-close jobs that have passed their closing date
  useEffect(() => {
    if (!hasAccess) return;
    
    const checkAndCloseExpiredJobs = async () => {
      const now = new Date().toISOString();
      
      try {
        const { error } = await supabase
          .from('jobs')
          .update({ status: 'closed' })
          .eq('status', 'active')
          .lt('closing_date', now);

        if (error) {
          console.error('Error auto-closing expired jobs:', error);
        }
      } catch (error) {
        console.error('Error in auto-close check:', error);
      }
    };

    // Check every minute
    const interval = setInterval(checkAndCloseExpiredJobs, 60000);
    return () => clearInterval(interval);
  }, [hasAccess]);

  // Filter and sort jobs based on search and filters
  const filteredJobs = jobs
    .filter(job => {
      const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           job.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           job.org_unit?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
      const matchesOrgUnit = orgUnitFilter === 'all' || job.org_unit === orgUnitFilter;
      const matchesLocation = locationFilter === 'all' || job.location === locationFilter;
      
      let matchesClosing = true;
      if (closingFilter === 'closing_7_days') {
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
        matchesClosing = job.closing_date ? new Date(job.closing_date) <= sevenDaysFromNow : false;
      } else if (closingFilter === 'expired') {
        const now = new Date();
        matchesClosing = job.closing_date ? new Date(job.closing_date) < now : false;
      }
      
      return matchesSearch && matchesStatus && matchesOrgUnit && matchesLocation && matchesClosing;
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
        closed: 7,
        pipeline: 8
      };
      
      const aStatus = getJobDisplayStatus(a);
      const bStatus = getJobDisplayStatus(b);
      
      const statusDiff = statusOrder[aStatus] - statusOrder[bStatus];
      if (statusDiff !== 0) return statusDiff;
      
      // Within same status, sort by updated_at (most recent first)
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });

  // Get unique values for filters
  const uniqueOrgUnits = [...new Set(jobs.map(job => job.org_unit).filter(Boolean))];
  const uniqueLocations = [...new Set(jobs.map(job => job.location).filter(Boolean))];

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

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Job Management</h1>
            <p className="text-muted-foreground mt-2">Manage job postings and applications</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Jobs</span>
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {filteredJobs.length} of {jobs.length} jobs
                </span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search jobs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>

              <Select value={orgUnitFilter} onValueChange={setOrgUnitFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Org Unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Units</SelectItem>
                  {uniqueOrgUnits.map(unit => (
                    <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {uniqueLocations.map(location => (
                    <SelectItem key={location} value={location}>{location}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={closingFilter} onValueChange={setClosingFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Closing" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dates</SelectItem>
                  <SelectItem value="closing_7_days">Closing in 7 days</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Org Unit</TableHead>
                    <TableHead>Applicants</TableHead>
                    <TableHead>Closing Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        Loading jobs...
                      </TableCell>
                    </TableRow>
                  ) : filteredJobs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No jobs found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredJobs.map((job) => (
                      <TableRow key={job.id}>
                        <TableCell className="font-medium">{job.title}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <MapPin className="w-3 h-3 mr-1 text-muted-foreground" />
                            {job.location || 'Not specified'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Building2 className="w-3 h-3 mr-1 text-muted-foreground" />
                            {job.org_unit || 'Not specified'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            className="h-auto p-0 hover:bg-transparent"
                            onClick={() => navigate(`/applications/manage?job=${job.id}`)}
                          >
                            <div className="flex items-center text-primary hover:text-primary/80">
                              <Users className="w-4 h-4 mr-2" />
                              <span className="font-medium">{job.application_stats?.total || 0}</span>
                            </div>
                          </Button>
                          {job.application_stats && (
                            <div className="text-xs text-muted-foreground mt-2 space-y-1">
                              <div>Completed Applications: <span className="font-medium">{job.application_stats.completed}</span></div>
                              <div>In progress: <span className="font-medium">{job.application_stats.in_progress}</span></div>
                              <div>Total: <span className="font-medium">{job.application_stats.total}</span></div>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Calendar className="w-3 h-3 mr-1 text-muted-foreground" />
                            {formatClosingDate(job.closing_date, job.timezone)}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(job)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(job.updated_at), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/admin/jobs/${job.id}/edit`)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate(`/admin/jobs/${job.id}/questions`)}>
                                <Users className="w-4 h-4 mr-2" />
                                Interview Management
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate(`/admin/jobs/${job.id}/review-committee`)}>
                                <Users className="w-4 h-4 mr-2" />
                                Review Committee
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => cloneJob(job.id)}>
                                <Copy className="w-4 h-4 mr-2" />
                                Clone
                              </DropdownMenuItem>
                              {job.slug && (
                                <DropdownMenuItem onClick={() => window.open(`/jobs/${job.slug}`, '_blank')}>
                                  <Eye className="w-4 h-4 mr-2" />
                                  Preview
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem 
                                onClick={() => toggleStatus(job.id, job.status)}
                                disabled={job.status === 'archived'}
                              >
                                {job.status === 'active' ? (
                                  <>
                                    <ToggleLeft className="w-4 h-4 mr-2" />
                                    Unpublish
                                  </>
                                ) : (
                                  <>
                                    <ToggleRight className="w-4 h-4 mr-2" />
                                    Publish
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => archiveJob(job.id)}
                                disabled={job.status === 'archived'}
                                className="text-destructive"
                              >
                                <Archive className="w-4 h-4 mr-2" />
                                Archive
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}