import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { VideoRecorder } from '@/components/VideoRecorder';
import { Clock, Video, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { UNICCLogo } from '@/components/UNICCLogo';

interface VideoQuestion {
  id: string;
  text: string;
  prep_and_read_secs: number;
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
  const [showInstructions, setShowInstructions] = useState(false);
  const [showPractice, setShowPractice] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isValidLink, setIsValidLink] = useState(false);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [assignmentStatus, setAssignmentStatus] = useState<string | null>(null);
  const { toast } = useToast();

  const practiceQuestion: VideoQuestion = {
    id: 'practice',
    text: 'Please use this time to test your microphone and camera. Tell us a bit about yourself and why you are interested in this position. This is just for testing - your answer will not be evaluated or reviewed by the hiring team.',
    prep_and_read_secs: 60,
    answer_secs: 120,
    allow_retakes: true,
    max_retakes: 999
  };

  useEffect(() => {
    console.log('VideoInterview - useEffect triggered, token:', token);
    if (token) {
      console.log('VideoInterview - Calling validateAndLoadInterview');
      validateAndLoadInterview();
    } else {
      console.error('VideoInterview - No token provided!');
    }
  }, [token]);

  const validateAndLoadInterview = async () => {
    console.log('VideoInterview - START validateAndLoadInterview');
    try {
      console.log('VideoInterview - Validating token:', token);
      
      // First, validate the token and get assignment details
      const { data: validationData, error: validationError } = await supabase
        .rpc('validate_video_assignment_token', { assignment_token: token });

      console.log('VideoInterview - Validation result:', { validationData, validationError });

      if (validationError) {
        console.error('VideoInterview - Validation error:', validationError);
        throw new Error(`Validation failed: ${validationError.message}`);
      }
      
      if (!validationData || validationData.length === 0) {
        console.error('VideoInterview - No validation data returned');
        throw new Error('Invalid or expired video interview link');
      }

      const assignment = validationData[0];
      setApplicationId(assignment.application_id);
      setAssignmentStatus(assignment.status);

      // Check if candidate has actually recorded any real answers (not just completed practice)
      const { data: realAnswers, error: answersCheckError } = await supabase
        .from('video_answers')
        .select('id')
        .eq('application_id', assignment.application_id);

      if (answersCheckError) throw answersCheckError;

      // Only block if they have actually recorded answers
      if (realAnswers && realAnswers.length > 0) {
        toast({
          title: "Interview Already Started",
          description: "You have already begun this interview. For fairness, you cannot restart after viewing the questions.",
          variant: "destructive",
        });
        setTimeout(() => {
          navigate('/my-applications');
        }, 3000);
        return;
      }

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
        setTimeout(() => {
          navigate('/my-applications');
        }, 2000);
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
      console.error('VideoInterview - ERROR in validateAndLoadInterview:', error);
      toast({
        title: "Access Error",
        description: error instanceof Error ? error.message : "Unable to access video interview",
        variant: "destructive",
      });
      console.log('VideoInterview - Redirecting to /my-applications due to error');
      setTimeout(() => {
        navigate('/my-applications');
      }, 2000);
    } finally {
      console.log('VideoInterview - Setting isLoading to false');
      setIsLoading(false);
    }
  };

  const handleStartActualInterview = async () => {
    // Just transition to the actual interview
    // Status will be updated when they start recording their first answer
    setShowPractice(false);
    setHasStarted(true);
  };

  const handleInterviewComplete = () => {
    toast({
      title: "Interview Complete!",
      description: "Thank you for completing the video interview. You may now close this page.",
    });
  };

  // Prevent navigation away during interview
  useEffect(() => {
    if (hasStarted) {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = 'Are you sure you want to leave? Your interview progress will be lost and you will not be able to restart.';
        return e.returnValue;
      };

      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  }, [hasStarted]);

  const calculateTotalTime = () => {
    if (!questionSet) return 0;
    return questionSet.questions.reduce((total, q) => 
      total + q.prep_and_read_secs + q.answer_secs, 0
    );
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const VideoHeader = () => (
    <header className="bg-primary text-primary-foreground shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center h-16">
          <Link to="/" className="flex items-center space-x-3">
            <UNICCLogo size="md" variant="blue" className="text-primary-foreground" />
            <span className="text-xl font-bold">UNICConnect</span>
          </Link>
        </div>
      </div>
    </header>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <VideoHeader />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading video interview...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isValidLink || !questionSet || !job) {
    return (
      <div className="min-h-screen bg-background">
        <VideoHeader />
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
      </div>
    );
  }

  if (showPractice) {
    return (
      <div className="min-h-screen bg-background">
        <VideoHeader />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto mb-6">
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-primary mb-1">Practice Question</h3>
                  <p className="text-sm text-muted-foreground">
                    This is a practice question to help you test your camera and microphone setup. 
                    <strong className="text-foreground"> Your answer will NOT be recorded or reviewed</strong> by the hiring team.
                    You can practice as many times as you want. When you are satisfied with your setup, proceed to the actual interview.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <VideoRecorder
            key="practice-recorder"
            questions={[practiceQuestion]}
            applicationId={applicationId!}
            onComplete={handleStartActualInterview}
            onPracticeAgain={() => {
              // Force remount of VideoRecorder by toggling state
              setShowPractice(false);
              setTimeout(() => setShowPractice(true), 10);
            }}
            isPractice={true}
          />
        </div>
      </div>
    );
  }

  if (!hasStarted) {
    return (
      <div className="min-h-screen bg-background">
        <VideoHeader />
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {showInstructions ? (
            // Detailed Instructions Screen
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Video Interview Instructions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Welcome */}
                <div>
                  <h3 className="text-lg font-semibold mb-2">Welcome to Your Video Interview</h3>
                  <p className="text-muted-foreground">
                    Thank you for taking the time to complete this video interview for the position of <strong>{job.title}</strong> at <strong>{job.company}</strong>.
                  </p>
                </div>

                {/* Technical Requirements */}
                <div className="border rounded-lg p-4 bg-muted/50">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Video className="h-5 w-5" />
                    Technical Requirements
                  </h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-primary">✓</span>
                      <span>A working camera and microphone</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">✓</span>
                      <span>A stable internet connection</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">✓</span>
                      <span>A quiet, well-lit environment</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">✓</span>
                      <span>Allow browser permissions for camera and microphone access</span>
                    </li>
                  </ul>
                </div>

                {/* Interview Format */}
                <div className="border rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Interview Format
                  </h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="font-semibold text-primary">1.</span>
                      <span>You will be presented with <strong>{questionSet.questions.length} questions</strong> one at a time</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-semibold text-primary">2.</span>
                      <span>For each question, you will have time to read and prepare before recording starts</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-semibold text-primary">3.</span>
                      <span>Once recording begins, answer the question clearly and concisely</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-semibold text-primary">4.</span>
                      <span>You can review your answer before submitting</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-semibold text-primary">5.</span>
                      <span>Some questions may allow retakes if you are not satisfied with your answer</span>
                    </li>
                  </ul>
                </div>

                {/* Tips */}
                <div className="border rounded-lg p-4 bg-primary/5">
                  <h3 className="text-lg font-semibold mb-3">Tips for Success</h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <span>•</span>
                      <span>Position your camera at eye level</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span>•</span>
                      <span>Look directly at the camera when speaking</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span>•</span>
                      <span>Speak clearly and at a moderate pace</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span>•</span>
                      <span>Take a moment to organize your thoughts during preparation time</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span>•</span>
                      <span>Be yourself and show your personality</span>
                    </li>
                  </ul>
                </div>

                {/* Time Estimate */}
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm">
                    <strong>Estimated Time:</strong> Approximately {formatTime(calculateTotalTime())} to complete this interview
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button
                    size="lg"
                    className="flex-1"
                    onClick={() => {
                      setShowInstructions(false);
                      setShowPractice(true);
                    }}
                  >
                    <Video className="mr-2 h-4 w-4" />
                    Begin Interview
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => setShowInstructions(false)}
                  >
                    Back
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            // Overview Screen
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

              {/* Start Button */}
              <div className="text-center">
                <Button onClick={() => setShowInstructions(true)} size="lg" className="px-8">
                  <Video className="w-5 h-5 mr-2" />
                  Start Interview
                </Button>
              </div>
            </CardContent>
          </Card>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <VideoHeader />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Video Interview</h1>
          <p className="text-muted-foreground">{job.title} at {job.company}</p>
        </div>

        <VideoRecorder
          key="actual-interview-recorder"
          questions={questionSet.questions}
          applicationId={applicationId!}
          onComplete={handleInterviewComplete}
        />
      </div>
    </div>
  );
}