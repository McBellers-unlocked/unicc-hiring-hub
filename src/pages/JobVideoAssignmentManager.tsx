import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { VideoQuestionManager } from '@/components/VideoQuestionManager';

export default function JobVideoAssignmentManager() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();

  const { data: job, isLoading } = useQuery({
    queryKey: ['job', jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('id, title, notice_no')
        .eq('id', jobId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!jobId,
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <Skeleton className="h-10 w-48 mb-6" />
          <Skeleton className="h-64 w-full" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Button
          variant="ghost"
          onClick={() => navigate('/admin/jobs')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Jobs
        </Button>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{job?.title}</CardTitle>
            <CardDescription>
              Notice No: {job?.notice_no || 'N/A'}
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Video Interview Configuration</CardTitle>
            <CardDescription>
              Configure video interview questions that candidates will be asked to record answers for
            </CardDescription>
          </CardHeader>
          <CardContent>
            {jobId && <VideoQuestionManager jobId={jobId} />}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
