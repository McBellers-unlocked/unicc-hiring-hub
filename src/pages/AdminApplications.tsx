import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Search, Filter, User, FileText, Calendar, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

interface Application {
  id: string;
  status: string;
  submitted_at: string;
  suggested_for_longlist: boolean;
  candidate: {
    id: string;
    name: string;
    email: string;
    location: string | null;
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
}

export default function AdminApplications() {
  const { userRoles } = useAuth();
  const { toast } = useToast();
  
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [jobFilter, setJobFilter] = useState('all');
  const [aiFilter, setAiFilter] = useState('all');

  // Check access permissions
  const hasAccess = userRoles.includes('Admin') || userRoles.includes('HR Assistant') || 
                   userRoles.includes('Hiring Manager') || userRoles.includes('Panel Member');
  
  useEffect(() => {
    if (hasAccess) {
      fetchApplications();
    }
  }, [hasAccess]);

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
          candidate:candidates(id, name, email, location),
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

  // Define status columns
  const statusColumns: StatusColumn[] = [
    { status: 'Application', title: 'Applications', color: 'bg-blue-100 text-blue-800', count: 0 },
    { status: 'Longlist', title: 'Longlist', color: 'bg-yellow-100 text-yellow-800', count: 0 },
    { status: 'Shortlist', title: 'Shortlist', color: 'bg-purple-100 text-purple-800', count: 0 },
    { status: 'Panel Interview', title: 'Panel Interview', color: 'bg-orange-100 text-orange-800', count: 0 },
    { status: 'Offer', title: 'Offer', color: 'bg-green-100 text-green-800', count: 0 },
    { status: 'Rejected', title: 'Rejected', color: 'bg-red-100 text-red-800', count: 0 }
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

  // Group applications by status and update counts
  const applicationsByStatus = statusColumns.map(column => ({
    ...column,
    applications: filteredApplications.filter(app => app.status === column.status),
    count: filteredApplications.filter(app => app.status === column.status).length
  }));

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
            <h1 className="text-3xl font-bold text-foreground">Applications</h1>
            <p className="text-muted-foreground mt-2">Manage job applications across all stages</p>
          </div>
        </div>

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {applicationsByStatus.map((column) => (
            <Card key={column.status} className="flex flex-col h-fit">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-sm">
                  <span>{column.title}</span>
                  <Badge variant="secondary" className="text-xs">
                    {column.count}
                  </Badge>
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
                            {application.suggested_for_longlist && (
                              <AlertCircle className="w-3 h-3 text-green-600" />
                            )}
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