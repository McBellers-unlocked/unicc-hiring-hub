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
import { useToast } from '@/hooks/use-toast';
import { Search, Filter, User, FileText, Calendar, AlertCircle, Trash2, Eye } from 'lucide-react';
import { format } from 'date-fns';

interface Application {
  id: string;
  status: string;
  submitted_at: string;
  updated_at: string;
  suggested_for_longlist: boolean;
  phf_completed: boolean;
  candidate: {
    id: string;
    name: string;
    email: string;
    location: string | null;
    gender: string | null;
  };
  job: {
    id: string;
    title: string;
    org_unit: string | null;
  };
  screening_scores?: {
    ai_score: number | null;
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

      // Then get applications for this job
      const { data, error } = await supabase
        .from('applications')
        .select(`
          id,
          status,
          submitted_at,
          updated_at,
          suggested_for_longlist,
          phf_completed,
          candidate:candidates(id, name, email, location, gender),
          job:jobs(id, title, org_unit),
          screening_scores(ai_score)
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

  // Filter and sort applications
  const filteredApplications = applications.filter(app => {
    const matchesSearch = app.candidate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         app.candidate.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    
    const matchesCompletion = completionFilter === 'all' || 
                             (completionFilter === 'completed' && app.phf_completed) ||
                             (completionFilter === 'incomplete' && !app.phf_completed);
    
    return matchesSearch && matchesStatus && matchesCompletion;
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

  const getScoreBadge = (application: Application) => {
    const score = application.screening_scores?.[0]?.ai_score;
    if (score === null || score === undefined) return null;
    
    const color = score >= 80 ? 'bg-green-100 text-green-800' : 
                  score >= 60 ? 'bg-yellow-100 text-yellow-800' : 
                  'bg-red-100 text-red-800';
    
    return (
      <Badge className={`${color} text-xs`}>
        AI: {score}%
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

        {/* Application List */}
        {selectedJobId && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Applications</span>
                <div className="flex items-center space-x-2">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {filteredApplications.length} of {applications.length} applications
                  </span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
                    <SelectItem value="Panel Interview">Panel Interview</SelectItem>
                    <SelectItem value="Recommended">Recommended</SelectItem>
                    <SelectItem value="Offer">Offer</SelectItem>
                    <SelectItem value="Roster">Roster</SelectItem>
                    <SelectItem value="Rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={completionFilter} onValueChange={setCompletionFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Completion" />
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

              {/* Table */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Candidate</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>PHF Status</TableHead>
                      <TableHead>AI Score</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          Loading applications...
                        </TableCell>
                      </TableRow>
                    ) : filteredApplications.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No applications found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredApplications.map((application) => (
                        <TableRow key={application.id}>
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <User className="w-4 h-4 text-muted-foreground" />
                              <div>
                                <div className="font-medium">{application.candidate.name}</div>
                                <div className="text-sm text-muted-foreground">{application.candidate.email}</div>
                                <div className="text-xs text-muted-foreground">
                                  {application.candidate.location || 'Location not specified'}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(application.status)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={application.phf_completed ? "default" : "secondary"}>
                              {application.phf_completed ? "Completed" : "In Progress"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {getScoreBadge(application)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Calendar className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm">
                                {format(new Date(application.submitted_at), 'MMM dd, yyyy')}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/admin/applications/${application.id}`)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => deleteApplication(application.id, application.candidate.id, e)}
                                className="hover:bg-destructive hover:text-destructive-foreground"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
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