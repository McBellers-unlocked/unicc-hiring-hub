import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { 
  Clock, 
  Mail, 
  Calendar, 
  Video, 
  RotateCcw, 
  Plus, 
  AlertTriangle,
  CheckCircle,
  PlayCircle,
  Calendar as CalendarIcon,
  Settings
} from 'lucide-react';
import { format, addDays, addHours } from 'date-fns';

interface VideoAssignment {
  id: string;
  status: string;
  deadline_at: string;
  opened_at?: string;
  started_at?: string;
  completed_at?: string;
  attempts: number;
  retakes_used_by_question: any;
  token: string;
  created_at: string;
  applications: any;
  video_question_sets: any;
}

interface VideoAssignmentManagerProps {
  applicationId: string;
}

export const VideoAssignmentManager: React.FC<VideoAssignmentManagerProps> = ({ applicationId }) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState<VideoAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [extendDialogOpen, setExtendDialogOpen] = useState(false);
  const [extensionDays, setExtensionDays] = useState(2);
  const [extensionReason, setExtensionReason] = useState('');
  const [jobHasQuestions, setJobHasQuestions] = useState<boolean | null>(null);
  const [jobTitle, setJobTitle] = useState<string>('');
  const [jobId, setJobId] = useState<string>('');

  useEffect(() => {
    // Reset state to force fresh check
    setJobHasQuestions(null);
    setJobTitle('');
    setJobId('');
    checkVideoQuestionsExist();
    loadAssignment();
  }, [applicationId]);

  const checkVideoQuestionsExist = async () => {
    try {
      // Get the job_id from the application
      const { data: appData } = await supabase
        .from('applications')
        .select('job_id, jobs(title)')
        .eq('id', applicationId)
        .single();
      
      if (!appData) return;
      
      console.log('[VideoAssignmentManager] Job data:', appData);
      setJobTitle(appData.jobs?.title || '');
      setJobId(appData.job_id);
      
      // Check if video question set exists for this job
      const { data: questionSets } = await supabase
        .from('video_question_sets')
        .select('id')
        .eq('job_id', appData.job_id)
        .limit(1);
      
      console.log('[VideoAssignmentManager] Question sets found:', questionSets);
      const hasQuestions = questionSets && questionSets.length > 0;
      setJobHasQuestions(hasQuestions);
      console.log('[VideoAssignmentManager] jobHasQuestions set to:', hasQuestions);
      
      if (!hasQuestions) {
        toast({
          title: "No Video Questions Configured",
          description: `The job "${appData.jobs?.title}" doesn't have video interview questions set up yet. Please configure them first.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error checking video questions:', error);
    }
  };

  const loadAssignment = async () => {
    try {
      const { data, error } = await supabase
        .from('video_assignments')
        .select(`
          *,
          applications!inner(
            id,
            candidates!inner(name, email),
            jobs!inner(title)
          ),
          video_question_sets!inner(
            name,
            questions,
            allow_retakes,
            max_retakes
          )
        `)
        .eq('application_id', applicationId)
        .maybeSingle();

      if (error) {
        console.error('Error loading video assignment:', error);
        if (error.message?.includes('Could not find a relationship')) {
          toast({
            title: "Configuration Error",
            description: "Database relationships need to be set up. Please contact support.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error",
            description: "Failed to load video assignment details",
            variant: "destructive",
          });
        }
        return;
      }

      setAssignment(data as VideoAssignment);
    } catch (error) {
      console.error('Error loading video assignment:', error);
      toast({
        title: "Error",
        description: "Failed to load video assignment details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createAssignment = async () => {
    if (jobHasQuestions === false) {
      toast({
        title: "Cannot Create Assignment",
        description: "Video questions must be configured for this job first",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create a manual stage event to trigger assignment creation
      const { error } = await supabase
        .from('stage_events')
        .insert({
          application_id: applicationId,
          from_stage: 'Application',
          to_stage: 'Pre-Recorded Video',
          reason: 'Manual video assignment creation'
        });

      if (error) throw error;

      // Wait a moment for the trigger to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check if the assignment was actually created
      const { data: checkData } = await supabase
        .from('video_assignments')
        .select('id')
        .eq('application_id', applicationId)
        .maybeSingle();

      if (!checkData) {
        toast({
          title: "Assignment Failed",
          description: "Video assignment could not be created. Please ensure video questions are configured for this job.",
          variant: "destructive",
        });
        return;
      }

      await loadAssignment();
      
      toast({
        title: "Success",
        description: "Video assignment created successfully",
      });
    } catch (error) {
      console.error('Error creating assignment:', error);
      toast({
        title: "Error",
        description: "Failed to create video assignment",
        variant: "destructive",
      });
    }
  };

  const sendInvite = async () => {
    if (!assignment) return;

    try {
      const videoLink = `${window.location.origin}/video/${assignment.token}`;
      const deadline = format(new Date(assignment.deadline_at), 'dd/MM/yyyy HH:mm');

      const { error } = await supabase.functions.invoke('send-video-invite', {
        body: {
          applicationId: assignment.applications.id,
          assignmentId: assignment.id,
          candidateName: assignment.applications.candidates.name,
          candidateEmail: assignment.applications.candidates.email,
          jobTitle: assignment.applications.jobs.title,
          videoLink,
          deadline,
          jobTimezone: 'Europe/Zurich',
          retakesAllowed: assignment.video_question_sets.allow_retakes,
          maxRetakes: assignment.video_question_sets.max_retakes,
          readTime: 30,
          prepTime: 30,
          answerTime: 180
        }
      });

      if (error) throw error;

      toast({
        title: "Invite Sent",
        description: `Video interview invitation sent to ${assignment.applications.candidates.email}`,
      });
    } catch (error) {
      console.error('Error sending invite:', error);
      toast({
        title: "Error",
        description: "Failed to send video interview invitation",
        variant: "destructive",
      });
    }
  };

  const extendDeadline = async () => {
    if (!assignment) return;

    try {
      const newDeadline = addDays(new Date(assignment.deadline_at), extensionDays);

      const { error } = await supabase
        .from('video_assignments')
        .update({
          deadline_at: newDeadline.toISOString(),
          extension_reason: extensionReason
        })
        .eq('id', assignment.id);

      if (error) throw error;

      // Send confirmation email to candidate
      const { error: emailError } = await supabase.functions.invoke('send-video-invite', {
        body: {
          applicationId: assignment.applications.id,
          assignmentId: assignment.id,
          candidateName: assignment.applications.candidates.name,
          candidateEmail: assignment.applications.candidates.email,
          jobTitle: assignment.applications.jobs.title,
          videoLink: `${window.location.origin}/video/${assignment.token}`,
          deadline: format(newDeadline, 'dd/MM/yyyy HH:mm'),
          jobTimezone: 'Europe/Zurich',
          retakesAllowed: assignment.video_question_sets.allow_retakes,
          maxRetakes: assignment.video_question_sets.max_retakes,
          readTime: 30,
          prepTime: 30,
          answerTime: 180,
          isExtension: true
        }
      });

      await loadAssignment();
      setExtendDialogOpen(false);
      setExtensionReason('');

      toast({
        title: "Deadline Extended",
        description: `Deadline extended by ${extensionDays} days. Confirmation sent to candidate.`,
      });
    } catch (error) {
      console.error('Error extending deadline:', error);
      toast({
        title: "Error",
        description: "Failed to extend deadline",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'NotStarted': return <Clock className="w-4 h-4" />;
      case 'LinkOpened': return <PlayCircle className="w-4 h-4" />;
      case 'InProgress': return <Video className="w-4 h-4" />;
      case 'Completed': return <CheckCircle className="w-4 h-4" />;
      case 'Expired': return <AlertTriangle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NotStarted': return 'bg-gray-500';
      case 'LinkOpened': return 'bg-blue-500';
      case 'InProgress': return 'bg-yellow-500';
      case 'Completed': return 'bg-green-500';
      case 'Expired': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const calculateProgress = () => {
    if (!assignment || !assignment.video_question_sets?.questions) return 0;
    
    const totalQuestions = assignment.video_question_sets.questions.length;
    const answeredQuestions = Object.keys(assignment.retakes_used_by_question || {}).length;
    
    return (answeredQuestions / totalQuestions) * 100;
  };

  const getDaysUntilDeadline = () => {
    if (!assignment) return 0;
    const now = new Date();
    const deadline = new Date(assignment.deadline_at);
    const diffTime = deadline.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!assignment) {
    console.log('[VideoAssignmentManager] No assignment, jobHasQuestions:', jobHasQuestions, 'jobId:', jobId);
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="w-5 h-5" />
            Video Interview Assignment
          </CardTitle>
        </CardHeader>
        <CardContent>
          {jobHasQuestions === false ? (
            <div className="text-center py-6 space-y-4">
              <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto" />
              <div>
                <h3 className="font-semibold text-lg mb-2">No Video Questions Configured</h3>
                <p className="text-muted-foreground mb-1">
                  The job "{jobTitle}" doesn't have video interview questions set up yet.
                </p>
                <p className="text-sm text-muted-foreground">
                  Configure video questions to enable video assignments for this job.
                </p>
              </div>
              <Button 
                onClick={() => navigate(`/admin/jobs/${jobId}/video-assignment`)}
                variant="default"
              >
                <Settings className="w-4 h-4 mr-2" />
                Configure Video Questions
              </Button>
            </div>
          ) : (
            <div className="text-center py-6">
              <Video className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                No video interview assignment found for this application.
              </p>
              <Button onClick={createAssignment} disabled={jobHasQuestions === null}>
                <Plus className="w-4 h-4 mr-2" />
                Create Video Assignment
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  const daysUntilDeadline = getDaysUntilDeadline();
  const progress = calculateProgress();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Video className="w-5 h-5" />
              Video Interview Assignment
            </div>
            <Badge className={`${getStatusColor(assignment.status)} text-white`}>
              {getStatusIcon(assignment.status)}
              <span className="ml-1">{assignment.status}</span>
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{assignment.video_question_sets.questions.length}</div>
              <div className="text-sm text-muted-foreground">Questions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{Math.round(progress)}%</div>
              <div className="text-sm text-muted-foreground">Progress</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{assignment.attempts}</div>
              <div className="text-sm text-muted-foreground">Attempts</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${daysUntilDeadline < 0 ? 'text-red-500' : daysUntilDeadline < 2 ? 'text-yellow-500' : 'text-green-500'}`}>
                {daysUntilDeadline}
              </div>
              <div className="text-sm text-muted-foreground">Days Left</div>
            </div>
          </div>

          {/* Progress Bar */}
          {assignment.status === 'InProgress' && (
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Interview Progress</span>
                <span>{Math.round(progress)}% Complete</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Timeline */}
          <div className="space-y-2">
            <h4 className="font-medium">Timeline</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Created:</span>
                <span>{format(new Date(assignment.created_at), 'dd/MM/yyyy HH:mm')}</span>
              </div>
              <div className="flex justify-between">
                <span>Deadline:</span>
                <span className={daysUntilDeadline < 0 ? 'text-red-500' : ''}>
                  {format(new Date(assignment.deadline_at), 'dd/MM/yyyy HH:mm')}
                </span>
              </div>
              {assignment.opened_at && (
                <div className="flex justify-between">
                  <span>First Opened:</span>
                  <span>{format(new Date(assignment.opened_at), 'dd/MM/yyyy HH:mm')}</span>
                </div>
              )}
              {assignment.started_at && (
                <div className="flex justify-between">
                  <span>Started:</span>
                  <span>{format(new Date(assignment.started_at), 'dd/MM/yyyy HH:mm')}</span>
                </div>
              )}
              {assignment.completed_at && (
                <div className="flex justify-between">
                  <span>Completed:</span>
                  <span>{format(new Date(assignment.completed_at), 'dd/MM/yyyy HH:mm')}</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-4 border-t">
            <Button onClick={sendInvite} variant="outline" size="sm">
              <Mail className="w-4 h-4 mr-2" />
              Resend Invite
            </Button>
            
            <Dialog open={extendDialogOpen} onOpenChange={setExtendDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  Extend Deadline
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Extend Video Interview Deadline</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="days">Extension (days)</Label>
                    <Input
                      id="days"
                      type="number"
                      value={extensionDays}
                      onChange={(e) => setExtensionDays(parseInt(e.target.value))}
                      min="1"
                      max="30"
                    />
                  </div>
                  <div>
                    <Label htmlFor="reason">Reason for Extension</Label>
                    <Textarea
                      id="reason"
                      value={extensionReason}
                      onChange={(e) => setExtensionReason(e.target.value)}
                      placeholder="Explain why the deadline is being extended..."
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setExtendDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={extendDeadline}>
                      Extend Deadline
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.open(`/video/${assignment.token}`, '_blank')}
            >
              <PlayCircle className="w-4 h-4 mr-2" />
              Preview Link
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};