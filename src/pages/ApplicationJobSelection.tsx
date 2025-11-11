import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Briefcase, Search, Users } from 'lucide-react';

interface Job {
  id: string;
  title: string;
  status: string;
  org_unit: string | null;
  application_count?: number;
}

export default function ApplicationJobSelection() {
  const { userRoles } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const hasAccess = userRoles.includes('Admin') || userRoles.includes('HR Assistant') || 
                   userRoles.includes('Hiring Manager') || userRoles.includes('Panel Member');

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
        .select('id, title, status, org_unit')
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

      // Fetch application counts for each job
      if (data) {
        const jobsWithCounts = await Promise.all(
          data.map(async (job) => {
            const { count } = await supabase
              .from('applications')
              .select('*', { count: 'exact', head: true })
              .eq('job_id', job.id);
            return { ...job, application_count: count || 0 };
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

  const filteredJobs = jobs.filter(job =>
    job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (job.org_unit?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20';
      case 'draft':
        return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20';
      case 'closed':
        return 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Application Management</h1>
          <p className="text-muted-foreground">Select a job to view and manage applications</p>
        </div>

        {/* Search */}
        <div className="mb-6">
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

        {/* Jobs Grid */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading jobs...</p>
          </div>
        ) : filteredJobs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Briefcase className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? 'No jobs found matching your search' : 'No jobs available'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredJobs.map((job) => (
              <Card
                key={job.id}
                className="cursor-pointer hover:shadow-lg transition-all hover:border-primary/50"
                onClick={() => navigate(`/applications/manage?job=${job.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <Briefcase className="w-5 h-5 text-primary" />
                    <Badge className={getStatusColor(job.status)}>
                      {job.status}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg line-clamp-2">{job.title}</CardTitle>
                  {job.org_unit && (
                    <p className="text-sm text-muted-foreground mt-1">{job.org_unit}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Users className="w-4 h-4 mr-2" />
                    <span>{job.application_count} application{job.application_count !== 1 ? 's' : ''}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
