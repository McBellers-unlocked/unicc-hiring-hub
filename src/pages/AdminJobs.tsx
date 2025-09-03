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
}

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
  const hasAccess = userRoles.includes('Admin') || userRoles.includes('HR Assistant');
  
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

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('jobs')
        .select('id, title, location, org_unit, closing_date, status, updated_at, slug, timezone')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      
      // Fetch application statistics for each job
      const jobsWithStats = await Promise.all(
        (data || []).map(async (job) => {
          const { data: applications, error: appError } = await supabase
            .from('applications')
            .select('id, status, phf_completed')
            .eq('job_id', job.id);

          if (appError) {
            console.error('Error fetching applications for job:', job.id, appError);
            return { ...job, application_stats: { total: 0, completed: 0, in_progress: 0, by_status: {} } };
          }

          const total = applications?.length || 0;
          const completed = applications?.filter(app => app.phf_completed).length || 0;
          const in_progress = total - completed;
          
          const by_status = applications?.reduce((acc, app) => {
            acc[app.status] = (acc[app.status] || 0) + 1;
            return acc;
          }, {} as Record<string, number>) || {};

          return {
            ...job,
            application_count: total,
            application_stats: {
              total,
              completed,
              in_progress,
              by_status
            }
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

  const getStatusBadge = (status: string) => {
    const variants = {
      draft: "secondary",
      active: "default",
      closed: "outline",
      archived: "destructive"
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || "secondary"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatClosingDate = (date: string | null, timezone: string) => {
    if (!date) return 'Not set';
    
    try {
      const parsedDate = new Date(date);
      const now = new Date();
      const isExpired = parsedDate < now;
      
      const formatted = format(parsedDate, 'MMM dd, yyyy HH:mm');
      
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
  }, []);

  // Filter jobs based on search and filters
  const filteredJobs = jobs.filter(job => {
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
  });

  // Get unique values for filters
  const uniqueOrgUnits = [...new Set(jobs.map(job => job.org_unit).filter(Boolean))];
  const uniqueLocations = [...new Set(jobs.map(job => job.location).filter(Boolean))];

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Job Management</h1>
            <p className="text-muted-foreground mt-2">Manage job postings and applications</p>
          </div>
          <Link to="/admin/jobs/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Job
            </Button>
          </Link>
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
                            onClick={() => navigate(`/admin/applications?job=${job.id}`)}
                          >
                            <div className="flex items-center text-primary hover:text-primary/80">
                              <Users className="w-3 h-3 mr-1" />
                              <span className="font-medium">{job.application_stats?.total || 0}</span>
                            </div>
                          </Button>
                          {job.application_stats && job.application_stats.total > 0 && (
                            <div className="text-xs text-muted-foreground mt-1">
                              <div className="flex gap-2">
                                <span>Completed: {job.application_stats.completed}</span>
                                <span>•</span>
                                <span>In Progress: {job.application_stats.in_progress}</span>
                              </div>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Calendar className="w-3 h-3 mr-1 text-muted-foreground" />
                            {formatClosingDate(job.closing_date, job.timezone)}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(job.status)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(job.updated_at), 'MMM dd, yyyy')}
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