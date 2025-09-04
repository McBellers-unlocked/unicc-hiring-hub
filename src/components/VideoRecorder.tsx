import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Play, 
  Square, 
  RotateCcw, 
  Upload, 
  Camera, 
  CameraOff,
  Mic,
  MicOff,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface VideoQuestion {
  id: string;
  text: string;
  read_secs: number;
  prep_secs: number;
  answer_secs: number;
  allow_retakes: boolean;
  max_retakes: number;
}

interface VideoRecorderProps {
  questions: VideoQuestion[];
  applicationId: string;
  onComplete?: () => void;
}

type RecordingPhase = 'reading' | 'preparation' | 'recording' | 'review' | 'completed';

export const VideoRecorder: React.FC<VideoRecorderProps> = ({ 
  questions, 
  applicationId, 
  onComplete 
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [phase, setPhase] = useState<RecordingPhase>('reading');
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [retakeCount, setRetakeCount] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [hasCamera, setHasCamera] = useState(false);
  const [hasMicrophone, setHasMicrophone] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const { toast } = useToast();
  const currentQuestion = questions[currentQuestionIndex];

  useEffect(() => {
    checkMediaDevices();
    initializeMedia(); // Request permissions immediately
    return () => {
      stopMediaStream();
    };
  }, []);

  useEffect(() => {
    if (currentQuestion && phase === 'reading') {
      startTimer(currentQuestion.read_secs);
    }
  }, [currentQuestionIndex, phase]);

  const checkMediaDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setHasCamera(devices.some(device => device.kind === 'videoinput'));
      setHasMicrophone(devices.some(device => device.kind === 'audioinput'));
    } catch (error) {
      console.error('Error checking media devices:', error);
    }
  };

  const initializeMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: hasCamera,
        audio: hasMicrophone
      });
      
      setMediaStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      toast({
        title: "Media Access Error",
        description: "Unable to access camera/microphone. Please check permissions.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const stopMediaStream = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      setMediaStream(null);
    }
  };

  const startTimer = (seconds: number) => {
    stopTimer(); // Clear any existing timer first
    setTimeRemaining(seconds);
    
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          handleTimerComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleTimerComplete = () => {
    stopTimer();
    
    switch (phase) {
      case 'reading':
        // Skip directly to recording, no prep phase
        startRecording();
        break;
      case 'recording':
        stopRecording();
        break;
    }
  };

  const skipToRecording = () => {
    stopTimer();
    startRecording();
  };

  const startRecording = async () => {
    try {
      let stream = mediaStream;
      if (!stream) {
        stream = await initializeMedia();
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        setRecordedBlob(blob);
        setPhase('review');
      };

      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      setPhase('recording');
      startTimer(currentQuestion.answer_secs);

      toast({
        title: "Recording Started",
        description: `You have ${currentQuestion.answer_secs} seconds to answer`,
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Recording Error",
        description: "Failed to start recording. Please try again.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      stopTimer();
    }
  };

  const retakeRecording = () => {
    if (retakeCount < currentQuestion.max_retakes) {
      setRetakeCount(prev => prev + 1);
      setRecordedBlob(null);
      setPhase('reading');
      startTimer(currentQuestion.read_secs);
    }
  };

  const uploadRecording = async () => {
    if (!recordedBlob) return;

    try {
      setIsUploading(true);
      
      // Convert blob to base64 for upload
      const base64 = await blobToBase64(recordedBlob);
      
      const { data, error } = await supabase.functions.invoke('upload-video-answer', {
        body: {
          applicationId,
          questionId: currentQuestion.id,
          videoData: base64,
          duration: currentQuestion.answer_secs - timeRemaining,
          fileSize: recordedBlob.size
        }
      });

      if (error) throw error;

      toast({
        title: "Upload Successful",
        description: "Your video answer has been uploaded",
      });

      // Move to next question or complete
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        setPhase('reading');
        setRecordedBlob(null);
        setRetakeCount(0);
      } else {
        setPhase('completed');
        onComplete?.();
      }
    } catch (error) {
      console.error('Error uploading video:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload video. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const getPhaseTitle = () => {
    switch (phase) {
      case 'reading':
        return 'Read the Question';
      case 'preparation':
        return 'Preparation Time';
      case 'recording':
        return 'Recording Your Answer';
      case 'review':
        return 'Review Your Answer';
      case 'completed':
        return 'All Questions Completed';
      default:
        return '';
    }
  };

  const getPhaseIcon = () => {
    switch (phase) {
      case 'reading':
        return <AlertCircle className="w-5 h-5" />;
      case 'preparation':
        return <Play className="w-5 h-5" />;
      case 'recording':
        return <Camera className="w-5 h-5 text-red-500" />;
      case 'review':
        return <Square className="w-5 h-5" />;
      default:
        return null;
    }
  };

  if (phase === 'completed' as RecordingPhase) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="space-y-4">
            <div className="text-6xl">🎉</div>
            <h2 className="text-2xl font-bold">Interview Complete!</h2>
            <p className="text-muted-foreground">
              Thank you for completing the video interview. Your responses have been submitted.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              Question {currentQuestionIndex + 1} of {questions.length}
            </span>
            <Badge variant="outline">
              {getPhaseIcon()}
              {getPhaseTitle()}
            </Badge>
          </div>
          <Progress 
            value={((currentQuestionIndex) / questions.length) * 100} 
            className="w-full"
          />
        </CardContent>
      </Card>

      {/* Video Preview */}
      <Card>
        <CardContent className="p-6">
          <div className="aspect-video bg-muted rounded-lg overflow-hidden relative">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            
            {isRecording && (
              <div className="absolute top-4 right-4">
                <Badge variant="destructive" className="animate-pulse">
                  <div className="w-2 h-2 rounded-full bg-red-500 mr-2" />
                  REC
                </Badge>
              </div>
            )}

            {phase !== 'completed' && (
              <div className="absolute bottom-4 left-4 right-4">
                <div className="bg-black/75 text-white p-3 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold">
                      {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                    </span>
                    <div className="flex gap-2">
                      {hasCamera ? <Camera className="w-4 h-4" /> : <CameraOff className="w-4 h-4" />}
                      {hasMicrophone ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Question Card */}
      <Card>
        <CardHeader>
          <CardTitle>Question {currentQuestionIndex + 1}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg leading-relaxed mb-4">
            {currentQuestion.text}
          </p>
          
          <Separator className="my-4" />
          
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium">Read Time:</span> {currentQuestion.read_secs}s
            </div>
            <div>
              <span className="font-medium">Prep Time:</span> {currentQuestion.prep_secs}s
            </div>
            <div>
              <span className="font-medium">Answer Time:</span> {currentQuestion.answer_secs}s
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Controls */}
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-center gap-4">
            {phase === 'reading' && (
              <Button onClick={skipToRecording} size="lg">
                <Play className="w-4 h-4 mr-2" />
                Start Recording
              </Button>
            )}

            {phase === 'recording' && (
              <Button onClick={stopRecording} variant="destructive">
                <Square className="w-4 h-4 mr-2" />
                Stop Recording
              </Button>
            )}

            {phase === 'review' && (
              <div className="flex gap-4">
                <Button onClick={uploadRecording} disabled={isUploading}>
                  <Upload className="w-4 h-4 mr-2" />
                  {isUploading ? 'Uploading...' : 'Submit Answer'}
                </Button>
                
                {currentQuestion.allow_retakes && retakeCount < currentQuestion.max_retakes && (
                  <Button onClick={retakeRecording} variant="outline">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Retake ({retakeCount + 1}/{currentQuestion.max_retakes})
                  </Button>
                )}
              </div>
            )}
          </div>

          {phase === 'reading' && (
            <div className="text-center text-muted-foreground">
              Read the question carefully. Click "Start Recording" when you're ready to answer.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};