import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Edit, Video, MessageSquare, Users } from 'lucide-react';
import { VideoQuestionManager } from '@/components/VideoQuestionManager';
import { BulkVideoAssignmentDialog } from '@/components/BulkVideoAssignmentDialog';
import { JobInterviewQuestionsBuilder } from '@/components/JobInterviewQuestionsBuilder';
import { ReviewCommitteeComposition } from '@/components/ReviewCommitteeComposition';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';

export default function JobManagement() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [applications, setApplications] = useState<any[]>([]);

  // Fetch job details including review committee status
  const { data: job, isLoading } = useQuery({
    queryKey: ['job', jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('id, title, notice_no, review_committee_status, review_committee_approved, review_committee_is_resubmission')
        .eq('id', jobId)
        .single();

      if (error) throw error;
      return data as {
        id: string;
        title: string;
        notice_no: string | null;
        review_committee_status: string | null;
        review_committee_approved: boolean | null;
        review_committee_is_resubmission: boolean | null;
      };
    },
    enabled: !!jobId,
  });

  // Fetch applications for this job (for video assignment)
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
          <Skeleton className="h-24 w-full mb-6" />
          <Skeleton className="h-96 w-full" />
        </div>
      </Layout>
    );
  }

  if (!job) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-destructive mb-4">Job Not Found</h1>
            <p className="text-muted-foreground mb-4">The job you're looking for doesn't exist.</p>
            <Button onClick={() => navigate('/admin/jobs')}>Back to Jobs</Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Back button */}
        <Button
          variant="ghost"
          onClick={() => navigate('/admin/jobs')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Jobs
        </Button>

        {/* Job header */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">{job.title}</CardTitle>
                <CardDescription className="text-base">
                  Notice No: {job.notice_no || 'N/A'}
                </CardDescription>
              </div>
              <Button 
                variant="outline"
                onClick={() => navigate(`/admin/jobs/${jobId}/edit`)}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Job
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Tab Navigation */}
        <Tabs defaultValue="video-assignment" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="video-assignment" className="flex items-center gap-2">
              <Video className="w-4 h-4" />
              <span className="hidden sm:inline">Video Assignment</span>
              <span className="sm:hidden">Video</span>
            </TabsTrigger>
            <TabsTrigger value="interview" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Interview Management</span>
              <span className="sm:hidden">Interview</span>
            </TabsTrigger>
            <TabsTrigger value="review-committee" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Review Committee</span>
              <span className="sm:hidden">Committee</span>
              {job?.review_committee_approved && (
                <Badge variant="default" className="ml-1 text-xs">Approved</Badge>
              )}
              {job?.review_committee_status === 'pending_approval' && !job?.review_committee_approved && (
                <Badge variant="secondary" className="ml-1 text-xs">Pending</Badge>
              )}
              {(!job?.review_committee_status || job?.review_committee_status === 'draft') && (
                <Badge variant="outline" className="ml-1 text-xs">Draft</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Video Assignment Tab */}
          <TabsContent value="video-assignment" className="space-y-6">
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
                      Create Assignments for All
                    </Button>
                  )}
                </div>
              </CardHeader>
            </Card>
            {jobId && <VideoQuestionManager jobId={jobId} />}
          </TabsContent>

          {/* Interview Management Tab */}
          <TabsContent value="interview" className="space-y-6">
            {jobId && <JobInterviewQuestionsBuilder jobId={jobId} jobTitle={job.title} />}
          </TabsContent>

          {/* Review Committee Tab */}
          <TabsContent value="review-committee" className="space-y-6">
            {jobId && <ReviewCommitteeComposition jobId={jobId} />}
            
            <Card>
              <CardHeader>
                <CardTitle>Access Review Pack</CardTitle>
                <CardDescription>
                  Review committee members can access the complete review pack including all candidate applications, interview scores, and recommendations
                </CardDescription>
              </CardHeader>
              <div className="px-6 pb-6">
                <Button onClick={() => navigate(`/admin/jobs/${jobId}/review-committee`)}>
                  Open Full Review Pack
                </Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Bulk Video Assignment Dialog */}
        {jobId && job && (
          <BulkVideoAssignmentDialog
            open={bulkDialogOpen}
            onOpenChange={setBulkDialogOpen}
            applicationIds={applications.map(a => a.id)}
            candidates={applications.map(a => ({
              id: a.candidate?.id || '',
              name: a.candidate?.name || '',
              email: a.candidate?.email || '',
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
