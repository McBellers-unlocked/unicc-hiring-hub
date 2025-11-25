import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Star, Play, Pause, Volume2, VolumeX, Download, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface VideoAnswer {
  id: string;
  question_id: string;
  url: string;
  transcript: string | null;
  duration: number | null;
  taken_at: string;
}

interface VideoRating {
  id: string;
  rating: number;
  comments: string | null;
  evaluator_id: string;
}

interface VideoQuestion {
  id: string;
  text: string;
}

interface VideoRatingInterfaceProps {
  applicationId: string;
  questions: VideoQuestion[];
  videoAnswers: VideoAnswer[];
  onRatingUpdate?: () => void;
  onSubmitFeedback?: () => void;
  showSubmitButton?: boolean;
}

export const VideoRatingInterface: React.FC<VideoRatingInterfaceProps> = ({
  applicationId,
  questions,
  videoAnswers,
  onRatingUpdate,
  onSubmitFeedback,
  showSubmitButton = true
}) => {
  const [ratings, setRatings] = useState<Record<string, VideoRating>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const [videoProgress, setVideoProgress] = useState<Record<string, number>>({});
  const [isMuted, setIsMuted] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadExistingRatings();
  }, [applicationId]);

  const loadExistingRatings = async () => {
    try {
      const videoAnswerIds = videoAnswers.map(va => va.id);
      
      const { data, error } = await supabase
        .from('video_ratings')
        .select('*')
        .in('video_answer_id', videoAnswerIds);

      if (error) throw error;

      const ratingsMap: Record<string, VideoRating> = {};
      const commentsMap: Record<string, string> = {};

      data?.forEach(rating => {
        ratingsMap[rating.video_answer_id] = rating;
        commentsMap[rating.video_answer_id] = rating.comments || '';
      });

      setRatings(ratingsMap);
      setComments(commentsMap);
    } catch (error) {
      console.error('Error loading ratings:', error);
      toast({
        title: "Error",
        description: "Failed to load existing ratings",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRatingChange = async (videoAnswerId: string, rating: number) => {
    try {
      const existingRating = ratings[videoAnswerId];
      
      if (existingRating) {
        const { error } = await supabase
          .from('video_ratings')
          .update({ rating, comments: comments[videoAnswerId] || null })
          .eq('id', existingRating.id);
        
        if (error) throw error;
      } else {
        const { data: currentUser } = await supabase.auth.getUser();
        
        const { data, error } = await supabase
          .from('video_ratings')
          .insert({
            video_answer_id: videoAnswerId,
            evaluator_id: currentUser.user?.id!,
            rating,
            comments: comments[videoAnswerId] || null
          })
          .select()
          .single();
        
        if (error) throw error;
        
        setRatings(prev => ({
          ...prev,
          [videoAnswerId]: data
        }));
      }

      setRatings(prev => ({
        ...prev,
        [videoAnswerId]: {
          ...prev[videoAnswerId],
          rating
        }
      }));
      
      toast({
        title: "Rating Saved",
        description: `Rated ${rating} star${rating !== 1 ? 's' : ''}`,
      });
    } catch (error) {
      console.error('Error saving rating:', error);
      toast({
        title: "Error",
        description: "Failed to save rating",
        variant: "destructive",
      });
    }
  };

  const handleCommentsChange = async (videoAnswerId: string, newComments: string) => {
    setComments(prev => ({ ...prev, [videoAnswerId]: newComments }));
    
    // Debounced save
    const existingRating = ratings[videoAnswerId];
    if (existingRating) {
      try {
        const { error } = await supabase
          .from('video_ratings')
          .update({ comments: newComments || null })
          .eq('id', existingRating.id);
        
        if (error) throw error;
      } catch (error) {
        console.error('Error saving comments:', error);
      }
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'Unknown';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getQuestionText = (questionId: string) => {
    const question = questions.find(q => q.id === questionId);
    return question?.text || 'Question text not found';
  };

  const calculateTotalScore = () => {
    const totalRatings = Object.values(ratings).reduce((sum, rating) => sum + rating.rating, 0);
    const ratingCount = Object.keys(ratings).length;
    return ratingCount > 0 ? (totalRatings / ratingCount).toFixed(1) : 'N/A';
  };

  const downloadTranscript = (videoAnswer: VideoAnswer, question: VideoQuestion) => {
    const content = `Question: ${question.text}\n\nTranscript:\n${videoAnswer.transcript || 'No transcript available'}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-q${questions.indexOf(question) + 1}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSubmitFeedback = async () => {
    // Check if all videos are rated
    const allRated = videoAnswers.every(va => ratings[va.id]?.rating);
    
    if (!allRated) {
      toast({
        title: "Incomplete Evaluation",
        description: "Please rate all video answers before submitting feedback",
        variant: "destructive",
      });
      return;
    }

    try {
      // Update video assignment to mark feedback as submitted
      const { data: assignment } = await supabase
        .from('video_assignments')
        .select('id')
        .eq('application_id', applicationId)
        .single();

      if (assignment) {
        const { error } = await supabase
          .from('video_assignments')
          .update({ feedback_submitted_at: new Date().toISOString() })
          .eq('id', assignment.id);

        if (error) throw error;
      }

      setFeedbackSubmitted(true);
      
      toast({
        title: "Feedback Submitted",
        description: "Video interview evaluation has been submitted successfully",
      });

      onSubmitFeedback?.();
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({
        title: "Error",
        description: "Failed to submit feedback",
        variant: "destructive",
      });
    }
  };

  const allVideosRated = videoAnswers.length > 0 && videoAnswers.every(va => ratings[va.id]?.rating);
  const ratedCount = Object.keys(ratings).length;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          Loading video ratings...
        </CardContent>
      </Card>
    );
  }

  // Show all questions with placeholders if no videos submitted
  if (questions.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">No video questions configured for this job.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Video Interview Evaluation
            <Badge variant="outline" className="text-lg px-3 py-1">
              Total Score: {calculateTotalScore()}/5.0
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium">Questions:</span> {questions.length}
            </div>
            <div>
              <span className="font-medium">Answered:</span> {videoAnswers.length}/{questions.length}
            </div>
            <div>
              <span className="font-medium">Rated:</span> {Object.keys(ratings).length}{videoAnswers.length > 0 ? `/${videoAnswers.length}` : ''}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Video Questions and Ratings - Show all questions with placeholders */}
      {questions.map((question, index) => {
        const videoAnswer = videoAnswers.find(va => va.question_id === question.id);
        const rating = videoAnswer ? ratings[videoAnswer.id] : undefined;
        const hasVideo = !!videoAnswer;

        return (
          <Card key={question.id} className={`border-l-4 ${hasVideo ? 'border-l-primary' : 'border-l-muted'}`}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Question {index + 1}
                <div className="flex items-center gap-2">
                  {hasVideo ? (
                    <>
                      <Badge variant="secondary">
                        {formatDuration(videoAnswer.duration)}
                      </Badge>
                      {videoAnswer.transcript && (
                        <Button
                          onClick={() => downloadTranscript(videoAnswer, question)}
                          size="sm"
                          variant="outline"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Transcript
                        </Button>
                      )}
                    </>
                  ) : (
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
                      Not Submitted Yet
                    </Badge>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Question Text */}
              <div>
                <h4 className="font-medium mb-2">Question:</h4>
                <p className="text-muted-foreground">{question.text}</p>
              </div>

              {/* Video Player or Placeholder */}
              <div className="aspect-video bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                {hasVideo ? (
                  <video
                    controls
                    className="w-full h-full"
                    src={videoAnswer.url}
                    onPlay={() => setPlayingVideo(videoAnswer.id)}
                    onPause={() => setPlayingVideo(null)}
                  />
                ) : (
                  <div className="text-center p-8">
                    <Play className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                    <p className="text-muted-foreground text-sm">
                      Video answer not yet submitted by candidate
                    </p>
                  </div>
                )}
              </div>

              {/* Transcript */}
              {hasVideo && videoAnswer.transcript && (
                <div>
                  <h4 className="font-medium mb-2">Transcript:</h4>
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm whitespace-pre-wrap">
                      {videoAnswer.transcript}
                    </p>
                  </div>
                </div>
              )}

              <Separator />

              {/* Rating - Always show, even without video */}
              <div className="space-y-4">
                <h4 className="font-medium">
                  {hasVideo ? 'Your Rating:' : 'Rating (Available when video is submitted):'}
                </h4>
                
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Button
                      key={star}
                      variant="ghost"
                      size="sm"
                      onClick={() => hasVideo && handleRatingChange(videoAnswer.id, star)}
                      className="p-1"
                      disabled={!hasVideo}
                    >
                      <Star
                        className={`w-6 h-6 ${
                          star <= (rating?.rating || 0)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-muted-foreground'
                        } ${!hasVideo ? 'opacity-30' : ''}`}
                      />
                    </Button>
                  ))}
                  
                  {rating && (
                    <Badge variant="outline" className="ml-2">
                      {rating.rating}/5
                    </Badge>
                  )}
                </div>

                <Textarea
                  placeholder={hasVideo ? "Add your comments and feedback..." : "Comments will be available when video is submitted"}
                  value={videoAnswer ? (comments[videoAnswer.id] || '') : ''}
                  onChange={(e) => hasVideo && handleCommentsChange(videoAnswer.id, e.target.value)}
                  className="min-h-[100px]"
                  disabled={!hasVideo}
                />
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Submit Feedback Button */}
      {showSubmitButton && videoAnswers.length > 0 && (
        <Card className="border-t-4 border-t-primary">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Video Interview Evaluation</p>
                <p className="text-sm text-muted-foreground">
                  {allVideosRated 
                    ? `All ${videoAnswers.length} videos rated. Ready to submit.`
                    : `Rate all videos to submit feedback (${ratedCount}/${videoAnswers.length})`}
                </p>
              </div>
              <Button 
                onClick={handleSubmitFeedback}
                disabled={!allVideosRated || feedbackSubmitted}
              >
                <Send className="w-4 h-4 mr-2" />
                {feedbackSubmitted ? 'Feedback Submitted' : 'Submit Feedback'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};