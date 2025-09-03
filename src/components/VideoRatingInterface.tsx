import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Star, Play, Pause, Volume2, VolumeX, Download } from 'lucide-react';
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
}

export const VideoRatingInterface: React.FC<VideoRatingInterfaceProps> = ({
  applicationId,
  questions,
  videoAnswers,
  onRatingUpdate
}) => {
  const [ratings, setRatings] = useState<Record<string, VideoRating>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const [videoProgress, setVideoProgress] = useState<Record<string, number>>({});
  const [isMuted, setIsMuted] = useState(false);
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

      onRatingUpdate?.();
      
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

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          Loading video ratings...
        </CardContent>
      </Card>
    );
  }

  if (videoAnswers.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">No video answers submitted yet.</p>
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
              <span className="font-medium">Answered:</span> {videoAnswers.length}
            </div>
            <div>
              <span className="font-medium">Rated:</span> {Object.keys(ratings).length}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Video Questions and Ratings */}
      {videoAnswers.map((videoAnswer, index) => {
        const question = questions.find(q => q.id === videoAnswer.question_id);
        const rating = ratings[videoAnswer.id];
        
        if (!question) return null;

        return (
          <Card key={videoAnswer.id} className="border-l-4 border-l-primary">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Question {index + 1}
                <div className="flex items-center gap-2">
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
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Question Text */}
              <div>
                <h4 className="font-medium mb-2">Question:</h4>
                <p className="text-muted-foreground">{question.text}</p>
              </div>

              {/* Video Player */}
              <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                <video
                  controls
                  className="w-full h-full"
                  src={videoAnswer.url}
                  onPlay={() => setPlayingVideo(videoAnswer.id)}
                  onPause={() => setPlayingVideo(null)}
                />
              </div>

              {/* Transcript */}
              {videoAnswer.transcript && (
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

              {/* Rating */}
              <div className="space-y-4">
                <h4 className="font-medium">Your Rating:</h4>
                
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Button
                      key={star}
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRatingChange(videoAnswer.id, star)}
                      className="p-1"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          star <= (rating?.rating || 0)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-muted-foreground'
                        }`}
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
                  placeholder="Add your comments and feedback..."
                  value={comments[videoAnswer.id] || ''}
                  onChange={(e) => handleCommentsChange(videoAnswer.id, e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};