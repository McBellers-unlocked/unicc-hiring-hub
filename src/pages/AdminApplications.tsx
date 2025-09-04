import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Search, Filter, User, FileText, Calendar, AlertCircle, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface Application {
  id: string;
  status: string;
  submitted_at: string;
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

interface StatusColumn {
  status: string;
  title: string;
  color: string;
  count: number;
  femaleCount: number;
  femalePercentage: number;
}

export default function AdminApplications() {
  const { userRoles } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [jobFilter, setJobFilter] = useState(searchParams.get('job') || 'all');
  const [aiFilter, setAiFilter] = useState('all');
  const [selectedJobTitle, setSelectedJobTitle] = useState<string | null>(null);

  // Check access permissions
  const hasAccess = userRoles.includes('Admin') || userRoles.includes('HR Assistant') || 
                   userRoles.includes('Hiring Manager') || userRoles.includes('Panel Member');
  
  useEffect(() => {
    if (hasAccess) {
      fetchApplications();
    }
  }, [hasAccess]);

  // Handle URL parameter changes and fetch job title
  useEffect(() => {
    const jobId = searchParams.get('job');
    if (jobId && jobId !== 'all') {
      setJobFilter(jobId);
      fetchJobTitle(jobId);
    }
  }, [searchParams]);

  const fetchJobTitle = async (jobId: string) => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('title')
        .eq('id', jobId)
        .single();

      if (error) throw error;
      setSelectedJobTitle(data?.title || null);
    } catch (error) {
      console.error('Error fetching job title:', error);
      setSelectedJobTitle(null);
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

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('applications')
        .select(`
          id,
          status,
          submitted_at,
          suggested_for_longlist,
          phf_completed,
          candidate:candidates(id, name, email, location, gender),
          job:jobs(id, title, org_unit),
          screening_scores(ai_score)
        `)
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
      fetchApplications();
    } catch (error) {
      console.error('Error deleting application:', error);
      toast({
        title: "Error",
        description: "Failed to delete application",
        variant: "destructive",
      });
    }
  };

  // Define status columns in the correct order
  const statusColumns: StatusColumn[] = [
    { status: 'Application', title: 'Applications', color: 'bg-blue-100 text-blue-800', count: 0, femaleCount: 0, femalePercentage: 0 },
    { status: 'Longlist', title: 'Longlist', color: 'bg-yellow-100 text-yellow-800', count: 0, femaleCount: 0, femalePercentage: 0 },
    { status: 'Shortlist', title: 'Shortlist', color: 'bg-purple-100 text-purple-800', count: 0, femaleCount: 0, femalePercentage: 0 },
    { status: 'Pre-Recorded Video', title: 'Video Interview', color: 'bg-indigo-100 text-indigo-800', count: 0, femaleCount: 0, femalePercentage: 0 },
    { status: 'Panel Interview', title: 'Panel Interview', color: 'bg-orange-100 text-orange-800', count: 0, femaleCount: 0, femalePercentage: 0 },
    { status: 'Recommended', title: 'Recommended Candidates', color: 'bg-cyan-100 text-cyan-800', count: 0, femaleCount: 0, femalePercentage: 0 },
    { status: 'Offer', title: 'Offer', color: 'bg-green-100 text-green-800', count: 0, femaleCount: 0, femalePercentage: 0 },
    { status: 'Roster', title: 'Roster', color: 'bg-emerald-100 text-emerald-800', count: 0, femaleCount: 0, femalePercentage: 0 },
    { status: 'Rejected', title: 'Rejected', color: 'bg-red-100 text-red-800', count: 0, femaleCount: 0, femalePercentage: 0 }
  ];

  // Filter applications
  const filteredApplications = applications.filter(app => {
    const matchesSearch = app.candidate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         app.candidate.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         app.job.title.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesJob = jobFilter === 'all' || app.job.id === jobFilter;
    
    let matchesAI = true;
    if (aiFilter === 'suggested') {
      matchesAI = app.suggested_for_longlist;
    } else if (aiFilter === 'not_suggested') {
      matchesAI = !app.suggested_for_longlist;
    }
    
    return matchesSearch && matchesJob && matchesAI;
  });

  // Calculate total applications count (across all stages)
  const totalApplicationsCount = filteredApplications.length;

  // Group applications by status and calculate gender diversity
  const applicationsByStatus = statusColumns.map(column => {
    const statusApps = filteredApplications.filter(app => app.status === column.status);
    const femaleApps = statusApps.filter(app => app.candidate.gender === 'Female');
    const femaleCount = femaleApps.length;
    const femalePercentage = statusApps.length > 0 ? (femaleCount / statusApps.length) * 100 : 0;
    
    return {
      ...column,
      applications: statusApps,
      count: statusApps.length,
      femaleCount,
      femalePercentage
    };
  });

  // Update the Applications column to show total count
  const updatedApplicationsByStatus = applicationsByStatus.map(column => {
    if (column.status === 'Application') {
      return {
        ...column,
        count: totalApplicationsCount, // Show total applications for first column
        title: `Applications (${totalApplicationsCount} total)`
      };
    }
    return column;
  });

  // Get unique jobs for filter
  const uniqueJobs = [...new Set(applications.map(app => app.job))].filter((job, index, self) => 
    index === self.findIndex(j => j.id === job.id)
  );

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

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {selectedJobTitle ? `Applications for ${selectedJobTitle}` : 'Applications'}
            </h1>
            <p className="text-muted-foreground mt-2">
              {selectedJobTitle 
                ? `Manage applications for this specific job position - ${filteredApplications.length} total applications`
                : 'Manage job applications across all stages'
              }
            </p>
            {selectedJobTitle && (
              <div className="mt-2">
                <Link 
                  to="/admin/applications" 
                  className="text-primary hover:text-primary/80 text-sm underline"
                >
                  ← View all applications
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Application Stats Summary (when viewing specific job) */}
        {selectedJobTitle && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Application Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-9 gap-4">
                {updatedApplicationsByStatus.map((column) => (
                  <div key={column.status} className="text-center p-3 bg-muted/30 rounded-lg">
                    <div className="text-2xl font-bold text-foreground">{column.count}</div>
                    <div className="text-sm text-muted-foreground mb-1">{column.title}</div>
                    {column.count > 0 && (
                      <div className={`text-xs font-medium ${column.femalePercentage < 50 ? 'text-red-600' : 'text-green-600'}`}>
                        {column.femalePercentage.toFixed(0)}% Female
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* PHF Completion Status Summary */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5" />
              PHF Completion Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {filteredApplications.length}
                </div>
                <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">Total Applications</div>
              </div>
              
              <div className="text-center p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {filteredApplications.filter(app => app.phf_completed).length}
                </div>
                <div className="text-sm text-green-600 dark:text-green-400 font-medium">PHF Completed</div>
              </div>
              
              <div className="text-center p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {filteredApplications.filter(app => !app.phf_completed).length}
                </div>
                <div className="text-sm text-orange-600 dark:text-orange-400 font-medium">PHF Incomplete</div>
              </div>
              
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-950/20 rounded-lg border border-gray-200 dark:border-gray-800">
                <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                  {filteredApplications.length > 0 ? Math.round((filteredApplications.filter(app => app.phf_completed).length / filteredApplications.length) * 100) : 0}%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">Completion Rate</div>
              </div>
            </div>
            
            {/* Detailed breakdown by status */}
            <div className="mt-6">
              <h4 className="font-medium mb-3 text-muted-foreground">PHF Status by Application Stage</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {updatedApplicationsByStatus.map((column) => {
                  const statusApps = filteredApplications.filter(app => app.status === column.status);
                  const completedInStatus = statusApps.filter(app => app.phf_completed).length;
                  const incompleteInStatus = statusApps.filter(app => !app.phf_completed).length;
                  
                  if (statusApps.length === 0) return null;
                  
                  return (
                    <div key={column.status} className="p-3 bg-muted/20 rounded-lg">
                      <div className="font-medium text-sm mb-2">
                        {column.title} ({statusApps.length})
                        <span className={`ml-2 text-xs ${column.femalePercentage < 50 ? 'text-red-600' : 'text-green-600'}`}>
                          {column.femalePercentage.toFixed(0)}% Female
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-green-600 dark:text-green-400">✓ Completed: {completedInStatus}</span>
                        <span className="text-orange-600 dark:text-orange-400">⧖ Incomplete: {incompleteInStatus}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search applications..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={jobFilter} onValueChange={setJobFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by job" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Jobs</SelectItem>
                  {uniqueJobs.map(job => (
                    <SelectItem key={job.id} value={job.id}>{job.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={aiFilter} onValueChange={setAiFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="AI Recommendation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Applications</SelectItem>
                  <SelectItem value="suggested">AI Suggested</SelectItem>
                  <SelectItem value="not_suggested">Not Suggested</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Kanban Board */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-9 gap-4">
          {updatedApplicationsByStatus.map((column) => (
            <Card key={column.status} className="flex flex-col h-fit">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-sm">
                  <span>{column.title.split(' (')[0]}</span>
                  <div className="flex flex-col items-end">
                    <Badge variant="secondary" className="text-xs mb-1">
                      {column.applications.length}
                    </Badge>
                    {column.applications.length > 0 && (
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${column.femalePercentage < 50 ? 'text-red-600 border-red-600' : 'text-green-600 border-green-600'}`}
                      >
                        {column.femalePercentage.toFixed(0)}% F
                      </Badge>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 flex-1">
                {loading ? (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    Loading...
                  </div>
                ) : column.applications.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    No applications
                  </div>
                ) : (
                  column.applications.map((application) => (
                    <Link 
                      key={application.id} 
                      to={`/admin/applications/${application.id}`}
                      className="block"
                    >
                        <Card className="p-3 hover:bg-muted/50 transition-colors cursor-pointer">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-2">
                              <User className="w-3 h-3 text-muted-foreground" />
                              <span className="font-medium text-sm">
                                {application.candidate.name}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              {application.suggested_for_longlist && (
                                <AlertCircle className="w-3 h-3 text-green-600" />
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => deleteApplication(application.id, application.candidate.id, e)}
                                className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <FileText className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground truncate">
                              {application.job.title}
                            </span>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(application.submitted_at), 'MMM dd')}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                              {application.candidate.location || 'Location not specified'}
                            </span>
                            {getScoreBadge(application)}
                          </div>
                        </div>
                      </Card>
                    </Link>
                  ))
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
}