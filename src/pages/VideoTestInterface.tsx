import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Video, Play, User, Clock, Calendar } from 'lucide-react';
import { getPublicSiteUrl } from '@/lib/utils';

interface Application {
  id: string;
  status: string;
  candidate: {
    name: string;
    email: string;
  };
  job: {
    title: string;
  };
}

interface VideoAssignment {
  id: string;
  token: string;
  status: string;
  deadline_at: string;
  application_id: string;
  candidate_name: string;
  candidate_email: string;
  job_title: string;
}

export default function VideoTestInterface() {
  const { userRoles } = useAuth();
  const { toast } = useToast();
  const [applications, setApplications] = useState<Application[]>([]);
  const [videoAssignments, setVideoAssignments] = useState<VideoAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [simulatingVideos, setSimulatingVideos] = useState(false);

  const hasAccess = userRoles.includes('Admin') || userRoles.includes('HR Assistant') || 
                   userRoles.includes('Chief of HR') || userRoles.includes('Hiring Manager');

  useEffect(() => {
    if (hasAccess) {
      fetchData();
    }
  }, [hasAccess]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch applications that can be moved to video stage
      const { data: appsData, error: appsError } = await supabase
        .from('applications')
        .select(`
          id,
          status,
          candidate:candidates(name, email),
          job:jobs(title)
        `)
        .eq('status', 'Application')
        .limit(5);

      if (appsError) throw appsError;

      // Fetch existing video assignments
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('video_assignments')
        .select(`
          id,
          token,
          status,
          deadline_at,
          application_id
        `);

      if (assignmentsError) throw assignmentsError;

      setApplications(appsData || []);

      // Get candidate and job info for each assignment
      const transformedAssignments = [];
      for (const assignment of assignmentsData || []) {
        const { data: appData } = await supabase
          .from('applications')
          .select(`
            candidate:candidates(name, email),
            job:jobs(title)
          `)
          .eq('id', assignment.application_id)
          .single();

        if (appData) {
          transformedAssignments.push({
            id: assignment.id,
            token: assignment.token,
            status: assignment.status,
            deadline_at: assignment.deadline_at,
            application_id: assignment.application_id,
            candidate_name: appData.candidate.name,
            candidate_email: appData.candidate.email,
            job_title: appData.job.title
          });
        }
      }
      
      setVideoAssignments(transformedAssignments);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const moveToVideoStage = async (applicationId: string) => {
    try {
      // Update application status
      const { error: updateError } = await supabase
        .from('applications')
        .update({ status: 'Pre-Recorded Video' })
        .eq('id', applicationId);

      if (updateError) throw updateError;

      // Create stage event
      const { error: stageError } = await supabase
        .from('stage_events')
        .insert({
          application_id: applicationId,
          from_stage: 'Application',
          to_stage: 'Pre-Recorded Video',
          reason: 'Testing video interview workflow'
        });

      if (stageError) throw stageError;

      toast({
        title: "Success",
        description: "Application moved to Pre-Recorded Video stage",
      });

      // Refresh data
      fetchData();
    } catch (error) {
      console.error('Error moving to video stage:', error);
      toast({
        title: "Error",
        description: "Failed to move application to video stage",
        variant: "destructive",
      });
    }
  };

  const getCandidateLink = (token: string) => {
    return `${getPublicSiteUrl()}/video-interview/${token}`;
  };

  const getHiringManagerLink = (applicationId: string) => {
    return `${getPublicSiteUrl()}/admin/applications/${applicationId}`;
  };

  const simulateVideoSubmissions = async () => {
    try {
      setSimulatingVideos(true);
      
      toast({
        title: "Simulating Videos",
        description: "Creating video submissions for all candidates...",
      });

      const { data, error } = await supabase.functions.invoke('simulate-video-submissions', {
        body: { jobId: '9deaea12-c2c5-4c17-8899-a07cf938b0ba' }
      });

      if (error) throw error;

      toast({
        title: "Success!",
        description: `Simulated ${data.questionsPerCandidate} video(s) for ${data.totalCandidates} candidates`,
      });

      // Refresh data
      fetchData();
    } catch (error) {
      console.error('Error simulating videos:', error);
      toast({
        title: "Error",
        description: "Failed to simulate video submissions",
        variant: "destructive",
      });
    } finally {
      setSimulatingVideos(false);
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

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Video Interview Testing</h1>
              <p className="text-muted-foreground mt-2">
                Test the video interview workflow from both candidate and hiring manager perspectives
              </p>
            </div>
            <Button 
              onClick={simulateVideoSubmissions}
              disabled={simulatingVideos}
              size="lg"
              className="bg-purple-600 hover:bg-purple-700"
            >
              {simulatingVideos ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Simulating...
                </>
              ) : (
                <>
                  <Video className="w-4 h-4 mr-2" />
                  Simulate All Videos (Digital Public Solutions)
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Create Video Assignments */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="w-5 h-5" />
              Create Video Assignments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-4">Loading...</div>
            ) : applications.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No applications available to move to video stage
              </div>
            ) : (
              <div className="space-y-3">
                {applications.map((app) => (
                  <div key={app.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{app.candidate.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {app.job.title} • {app.candidate.email}
                      </div>
                    </div>
                    <Button 
                      onClick={() => moveToVideoStage(app.id)}
                      size="sm"
                    >
                      Move to Video Stage
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Existing Video Assignments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="w-5 h-5" />
              Video Assignments ({videoAssignments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {videoAssignments.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No video assignments created yet. Move an application to video stage first.
              </div>
            ) : (
              <div className="space-y-4">
                {videoAssignments.map((assignment) => (
                  <Card key={assignment.id} className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <User className="w-4 h-4" />
                          <span className="font-medium">{assignment.candidate_name}</span>
                          <Badge variant="outline">{assignment.status}</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {assignment.job_title} • {assignment.candidate_email}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <Clock className="w-3 h-3" />
                          Deadline: {new Date(assignment.deadline_at).toLocaleDateString('en-GB')}
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">🎥 Candidate Experience</h4>
                        <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                          <p className="text-xs text-muted-foreground mb-2">
                            Use this link to experience the candidate video recording interface:
                          </p>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => window.open(getCandidateLink(assignment.token), '_blank')}
                            className="w-full"
                          >
                            Open Candidate Interface
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">👔 Hiring Manager Experience</h4>
                        <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                          <p className="text-xs text-muted-foreground mb-2">
                            Use this link to review video responses as a hiring manager:
                          </p>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => window.open(getHiringManagerLink(assignment.application_id), '_blank')}
                            className="w-full"
                          >
                            Open Review Interface
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
