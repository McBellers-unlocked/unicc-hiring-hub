import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { VideoRecorder } from '@/components/VideoRecorder';
import { Clock, Video, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface VideoQuestion {
  id: string;
  text: string;
  read_secs: number;
  prep_secs: number;
  answer_secs: number;
  allow_retakes: boolean;
  max_retakes: number;
}

interface VideoQuestionSet {
  id: string;
  name: string;
  questions: VideoQuestion[];
}

interface Job {
  id: string;
  title: string;
  company: string;
}

export default function VideoInterview() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [questionSet, setQuestionSet] = useState<VideoQuestionSet | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isValidLink, setIsValidLink] = useState(false);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (token) {
      validateAndLoadInterview();
    }
  }, [token]);

  const validateAndLoadInterview = async () => {
    try {
      // First, validate the token and get assignment details
      const { data: validationData, error: validationError } = await supabase
        .rpc('validate_video_assignment_token', { assignment_token: token });

      if (validationError || !validationData || validationData.length === 0) {
        throw new Error('Invalid or expired video interview link');
      }

      const assignment = validationData[0];
      setApplicationId(assignment.application_id);

      // Get application and job details
      const { data: application, error: appError } = await supabase
        .from('applications')
        .select(`
          id,
          job_id,
          jobs (
            id,
            title,
            org_unit
          )
        `)
        .eq('id', assignment.application_id)
        .single();

      if (appError || !application) {
        throw new Error('Invalid application data');
      }

      // Check if candidate has already completed video interview
      const { data: existingAnswers, error: answersError } = await supabase
        .from('video_answers')
        .select('id')
        .eq('application_id', assignment.application_id);

      if (answersError) throw answersError;

      if (existingAnswers && existingAnswers.length > 0) {
        toast({
          title: "Already Completed",
          description: "You have already completed the video interview for this position.",
          variant: "destructive",
        });
        return;
      }

      setJob({
        id: application.job_id,
        title: application.jobs.title,
        company: application.jobs.org_unit || 'UNICC'
      });

      setQuestionSet({
        id: assignment.question_set_id,
        name: 'Video Interview Questions',
        questions: (assignment.questions as any as VideoQuestion[]) || []
      });

      setIsValidLink(true);

      // Update assignment status to opened
      await supabase.rpc('update_video_assignment_status', {
        assignment_token: token,
        new_status: 'LinkOpened'
      });

    } catch (error) {
      console.error('Error loading interview:', error);
      toast({
        title: "Access Error",
        description: error instanceof Error ? error.message : "Unable to access video interview",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInterviewComplete = () => {
    toast({
      title: "Interview Complete!",
      description: "Thank you for completing the video interview. You may now close this page.",
    });
  };

  const calculateTotalTime = () => {
    if (!questionSet) return 0;
    return questionSet.questions.reduce((total, q) => 
      total + q.read_secs + q.prep_secs + q.answer_secs, 0
    );
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading video interview...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!isValidLink || !questionSet || !job) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto">
            <CardContent className="p-6 text-center">
              <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Access Denied</h2>
              <p className="text-muted-foreground">
                This video interview link is invalid or has expired.
              </p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (!hasStarted) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Card>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <Video className="w-16 h-16 text-primary" />
              </div>
              <CardTitle className="text-2xl">Video Interview</CardTitle>
              <p className="text-muted-foreground">
                {job.title} at {job.company}
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Interview Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-primary">
                      {questionSet.questions.length}
                    </div>
                    <div className="text-sm text-muted-foreground">Questions</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-primary">
                      {formatTime(calculateTotalTime())}
                    </div>
                    <div className="text-sm text-muted-foreground">Est. Time</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-primary">
                      {questionSet.questions.some(q => q.allow_retakes) ? 'Yes' : 'No'}
                    </div>
                    <div className="text-sm text-muted-foreground">Retakes Allowed</div>
                  </CardContent>
                </Card>
              </div>

              {/* Instructions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    Important Instructions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">Before You Start:</h4>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li>• Ensure good lighting on your face</li>
                        <li>• Find a quiet environment</li>
                        <li>• Test your camera and microphone</li>
                        <li>• Have a stable internet connection</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Interview Process:</h4>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li>• Read each question carefully</li>
                        <li>• Use preparation time to organize thoughts</li>
                        <li>• Speak clearly during recording</li>
                        <li>• Recording will stop automatically</li>
                      </ul>
                    </div>
                  </div>
                  
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-yellow-800">Please Note:</p>
                        <p className="text-yellow-700">
                          Once you start the interview, you must complete all questions in one session. 
                          Make sure you have enough time available before beginning.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Question Preview */}
              <Card>
                <CardHeader>
                  <CardTitle>Question Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {questionSet.questions.map((question, index) => (
                      <div key={question.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">Q{index + 1}</Badge>
                          <div className="text-sm">
                            <div className="font-medium">{question.text.substring(0, 60)}...</div>
                            <div className="text-muted-foreground">
                              Read: {question.read_secs}s | Prep: {question.prep_secs}s | Answer: {question.answer_secs}s
                            </div>
                          </div>
                        </div>
                        {question.allow_retakes && (
                          <Badge variant="secondary">
                            {question.max_retakes} retake{question.max_retakes !== 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Start Button */}
              <div className="text-center">
                <Button onClick={() => setHasStarted(true)} size="lg" className="px-8">
                  <Video className="w-5 h-5 mr-2" />
                  Start Video Interview
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Video Interview</h1>
          <p className="text-muted-foreground">{job.title} at {job.company}</p>
        </div>

        <VideoRecorder
          questions={questionSet.questions}
          applicationId={applicationId!}
          onComplete={handleInterviewComplete}
        />
      </div>
    </Layout>
  );
}