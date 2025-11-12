import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { JobInterviewQuestionsBuilder } from '@/components/JobInterviewQuestionsBuilder';

export default function JobInterviewQuestions() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { userRoles } = useAuth();
  const { toast } = useToast();
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const hasAccess = userRoles.includes('Admin') || userRoles.includes('HR Assistant') || 
                    userRoles.includes('Chief of HR') || userRoles.includes('Hiring Manager');

  useEffect(() => {
    if (hasAccess && jobId) {
      fetchJob();
    }
  }, [hasAccess, jobId]);

  const fetchJob = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('jobs')
        .select('id, title')
        .eq('id', jobId)
        .single();

      if (error) throw error;
      setJob(data);
    } catch (error) {
      console.error('Error fetching job:', error);
      toast({
        title: "Error",
        description: "Failed to load job details",
        variant: "destructive",
      });
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

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <p>Loading...</p>
        </div>
      </Layout>
    );
  }

  if (!job) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <p>Job not found</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="outline" onClick={() => navigate('/admin/jobs')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Jobs
          </Button>
        </div>

        <JobInterviewQuestionsBuilder jobId={job.id} jobTitle={job.title} />
      </div>
    </Layout>
  );
}
