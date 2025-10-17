import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { FileText, Calendar, MapPin, Video, Clock, AlertCircle, CheckCircle2, PlayCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow, differenceInDays } from 'date-fns';

interface VideoAssignment {
  id: string;
  status: string;
  deadline_at: string;
  token: string;
  opened_at: string | null;
  started_at: string | null;
  completed_at: string | null;
}

interface Application {
  id: string;
  status: string;
  submitted_at: string;
  phf_completed: boolean;
  job_id: string;
  job: {
    id: string;
    title: string;
    location: string;
    closing_date: string;
    notice_no: string;
  };
  video_assignment?: VideoAssignment | null;
}

export default function MyApplicationsContent() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApplications();
  }, [user]);

  const fetchApplications = async () => {
    try {
      if (user) {
        // First get the candidate record for this user
        const { data: candidate, error: candidateError } = await supabase
          .from('candidates')
          .select('id')
          .eq('email', user.email)
          .maybeSingle();

        if (candidateError) throw candidateError;

        if (!candidate) {
          setApplications([]);
          setLoading(false);
          return;
        }

        // Then get applications for this candidate with video assignments
        const { data: applicationsData, error: applicationsError } = await supabase
          .from('applications')
          .select(`
            id,
            status,
            submitted_at,
            phf_completed,
            job_id,
            jobs!inner (
              id,
              title,
              location,
              closing_date,
              notice_no
            ),
            video_assignments (
              id,
              status,
              deadline_at,
              token,
              opened_at,
              started_at,
              completed_at
            )
          `)
          .eq('candidate_id', candidate.id)
          .order('submitted_at', { ascending: false });

        if (applicationsError) throw applicationsError;

        setApplications(applicationsData?.map(app => ({
          ...app,
          job: {
            ...app.jobs,
            id: app.job_id
          },
          video_assignment: app.video_assignments?.[0] || null
        })) || []);
      } else {
        // For non-authenticated users, get from localStorage
        const savedApplications = localStorage.getItem('savedApplications');
        if (savedApplications) {
          try {
            const parsed = JSON.parse(savedApplications);
            const applicationsWithJobs = await Promise.all(
              parsed.map(async (app: any) => {
                const { data: jobData } = await supabase
                  .from('jobs')
                  .select('id, title, location, closing_date, notice_no')
                  .eq('id', app.job_id)
                  .maybeSingle();
                
                return {
                  ...app,
                  job: jobData || {
                    id: app.job_id,
                    title: 'Unknown Job',
                    location: '',
                    closing_date: '',
                    notice_no: ''
                  }
                };
              })
            );
            setApplications(applicationsWithJobs);
          } catch (error) {
            console.error('Error parsing saved applications:', error);
            setApplications([]);
          }
        } else {
          setApplications([]);
        }
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast({
        title: "Error",
        description: "Failed to load your applications",
        variant: "destructive"
      });
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'application':
        return 'bg-blue-100 text-blue-800';
      case 'screening':
        return 'bg-yellow-100 text-yellow-800';
      case 'interview':
        return 'bg-purple-100 text-purple-800';
      case 'offer':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getVideoAssignmentStatus = (assignment: VideoAssignment | null) => {
    if (!assignment) return null;

    const daysUntilDeadline = differenceInDays(new Date(assignment.deadline_at), new Date());
    const isUrgent = daysUntilDeadline <= 2 && daysUntilDeadline >= 0;
    const isExpired = daysUntilDeadline < 0;

    let statusText = '';
    let statusColor = '';
    let icon = null;

    if (isExpired) {
      statusText = 'Expired';
      statusColor = 'bg-red-100 text-red-800';
      icon = <AlertCircle className="h-4 w-4" />;
    } else if (assignment.status === 'Completed') {
      statusText = 'Completed';
      statusColor = 'bg-green-100 text-green-800';
      icon = <CheckCircle2 className="h-4 w-4" />;
    } else if (assignment.status === 'InProgress') {
      statusText = `In Progress - ${daysUntilDeadline}d left`;
      statusColor = isUrgent ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800';
      icon = <PlayCircle className="h-4 w-4" />;
    } else {
      statusText = `Not Started - ${daysUntilDeadline}d left`;
      statusColor = isUrgent ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-800';
      icon = <Clock className="h-4 w-4" />;
    }

    return { statusText, statusColor, icon, daysUntilDeadline, isUrgent, isExpired };
  };

  const getStageProgress = (status: string, hasVideoAssignment: boolean) => {
    const stages = [
      { name: 'Application', status: 'completed' },
      { name: 'Screening', status: status === 'Application' ? 'pending' : 'completed' },
      { name: 'Video Interview', status: hasVideoAssignment ? 'current' : 'pending' },
      { name: 'Panel Interview', status: 'pending' },
      { name: 'Offer', status: 'pending' }
    ];

    return stages;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No applications yet</h3>
          <p className="text-muted-foreground text-center mb-6">
            You haven't applied to any positions yet. Browse our open positions to get started.
          </p>
          <Button onClick={() => navigate('/jobs')}>
            Browse Jobs
          </Button>
        </CardContent>
      </Card>
    );
  }

  const urgentAssignments = applications.filter(app => {
    if (!app.video_assignment) return false;
    const status = getVideoAssignmentStatus(app.video_assignment);
    return status && status.isUrgent && !status.isExpired && app.video_assignment.status !== 'Completed';
  });

  return (
    <div className="space-y-6">
      {/* Urgent Alerts */}
      {urgentAssignments.length > 0 && (
        <Alert className="border-orange-500 bg-orange-50">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            You have {urgentAssignments.length} video interview{urgentAssignments.length > 1 ? 's' : ''} expiring soon. Complete them before the deadline!
          </AlertDescription>
        </Alert>
      )}

      {/* Applications List */}
      {applications.map((application) => {
        const videoStatus = getVideoAssignmentStatus(application.video_assignment);
        const stages = getStageProgress(application.status, !!application.video_assignment);
        
        return (
          <Card key={application.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-xl mb-2">{application.job.title}</CardTitle>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {application.job.location}
                    </div>
                    <div className="flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      {application.job.notice_no}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Applied: {formatDate(application.submitted_at)}
                    </div>
                  </div>
                  
                  {/* Progress Timeline */}
                  <div className="mt-4 flex items-center gap-2">
                    {stages.map((stage, index) => (
                      <div key={stage.name} className="flex items-center">
                        <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                          stage.status === 'completed' 
                            ? 'bg-green-100 text-green-700' 
                            : stage.status === 'current'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {stage.status === 'completed' && <CheckCircle2 className="h-3 w-3" />}
                          {stage.name}
                        </div>
                        {index < stages.length - 1 && (
                          <div className={`w-4 h-px ${stage.status === 'completed' ? 'bg-green-300' : 'bg-gray-300'}`} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <Badge className={getStatusColor(application.status)}>
                  {application.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* PHF Status */}
              <div className="flex items-center gap-4 text-sm">
                <div className={`flex items-center gap-2 ${
                  application.phf_completed ? 'text-green-600' : 'text-yellow-600'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    application.phf_completed ? 'bg-green-500' : 'bg-yellow-500'
                  }`} />
                  PHF: {application.phf_completed ? 'Completed' : 'Pending'}
                </div>
                {application.job.closing_date && (
                  <div className="text-muted-foreground">
                    Closes: {formatDate(application.job.closing_date)}
                  </div>
                )}
              </div>

              {/* Video Assignment Section */}
              {application.video_assignment && videoStatus && (
                <div className={`p-4 rounded-lg border-2 ${
                  videoStatus.isUrgent && !videoStatus.isExpired && application.video_assignment.status !== 'Completed'
                    ? 'border-orange-300 bg-orange-50'
                    : 'border-gray-200 bg-gray-50'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <Video className="h-5 w-5 text-purple-600 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-1">Video Interview Assessment</h4>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={videoStatus.statusColor + ' flex items-center gap-1'}>
                            {videoStatus.icon}
                            {videoStatus.statusText}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">
                          {application.video_assignment.status === 'Completed' 
                            ? `Submitted ${formatDistanceToNow(new Date(application.video_assignment.completed_at!), { addSuffix: true })}`
                            : `Deadline: ${formatDate(application.video_assignment.deadline_at)}`
                          }
                        </p>
                      </div>
                    </div>
                    <div>
                      {application.video_assignment.status === 'Completed' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Submitted
                        </Button>
                      ) : !videoStatus.isExpired ? (
                        <Button
                          size="sm"
                          onClick={() => {
                            console.log('Start Interview clicked - token:', application.video_assignment!.token);
                            console.log('Navigating to:', `/video-interview/${application.video_assignment!.token}`);
                            navigate(`/video-interview/${application.video_assignment!.token}`);
                          }}
                          className="bg-purple-600 hover:bg-purple-700"
                        >
                          <PlayCircle className="h-4 w-4 mr-1" />
                          {application.video_assignment.status === 'InProgress' ? 'Continue Interview' : 'Start Interview'}
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" disabled>
                          Expired
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                {application.phf_completed && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/my-applications/${application.id}`)}
                    className="flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    View Details
                  </Button>
                )}
                {!application.phf_completed && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/apply/${application.job_id}`)}
                  >
                    Continue Application
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}