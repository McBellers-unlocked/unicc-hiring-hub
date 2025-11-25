import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { VideoQuestionManager } from '@/components/VideoQuestionManager';
import { BulkVideoAssignmentDialog } from '@/components/BulkVideoAssignmentDialog';
import { useToast } from '@/hooks/use-toast';

export default function JobVideoAssignmentManager() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [applications, setApplications] = useState<any[]>([]);

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

  // Fetch applications for this job
  const { data: applicationsData } = useQuery({
    queryKey: ['job-applications', jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('applications')
        .select(`
          id,
          status,
          candidate:candidates(id, name, email)
        `)
        .eq('job_id', jobId)
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!jobId,
  });

  // Update applications state when data changes
  useEffect(() => {
    if (applicationsData) {
      setApplications(applicationsData);
    }
  }, [applicationsData]);

  const handleBulkAssignmentSuccess = () => {
    toast({
      title: "Success",
      description: "Video assignments created successfully",
    });
    setBulkDialogOpen(false);
  };

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
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Video Interview Configuration</CardTitle>
                <CardDescription>
                  Configure video interview questions that candidates will be asked to record answers for
                </CardDescription>
              </div>
              {applicationsData && applicationsData.length > 0 && (
                <Button 
                  onClick={() => setBulkDialogOpen(true)}
                  variant="default"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Create Assignments for All Applications
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {jobId && <VideoQuestionManager jobId={jobId} />}
          </CardContent>
        </Card>

        {/* Bulk Video Assignment Dialog */}
        {jobId && job && (
          <BulkVideoAssignmentDialog
            open={bulkDialogOpen}
            onOpenChange={setBulkDialogOpen}
            applicationIds={applications.map(a => a.id)}
            candidates={applications.map(a => ({
              id: a.candidate.id,
              name: a.candidate.name,
              email: a.candidate.email,
            }))}
            jobTitle={job.title}
            jobId={jobId}
            onSuccess={handleBulkAssignmentSuccess}
          />
        )}
      </div>
    </Layout>
  );
}
