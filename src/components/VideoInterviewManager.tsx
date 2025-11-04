import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Clock, Users, Video, Send, Star } from 'lucide-react';
import { format } from 'date-fns';

interface VideoInterviewManagerProps {
  applicationId: string;
  applicationData: any;
  onUpdate: () => void;
}

export const VideoInterviewManager: React.FC<VideoInterviewManagerProps> = ({
  applicationId,
  applicationData,
  onUpdate
}) => {
  const { toast } = useToast();
  const [videoQuestionSets, setVideoQuestionSets] = useState<any[]>([]);
  const [videoAnswers, setVideoAnswers] = useState<any[]>([]);
  const [panelInterviews, setPanelInterviews] = useState<any[]>([]);
  const [selectedQuestionSet, setSelectedQuestionSet] = useState<string>('');
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [scheduleData, setScheduleData] = useState({
    title: '',
    scheduled_at: '',
    duration_minutes: 60,
    location: '',
    meeting_link: '',
    notes: ''
  });

  useEffect(() => {
    fetchVideoData();
  }, [applicationId]);

  const fetchVideoData = async () => {
    try {
      // Fetch video question sets for the job
      const { data: questionSets } = await supabase
        .from('video_question_sets')
        .select('*')
        .eq('job_id', applicationData.job_id);

      // Fetch video answers for this application
      const { data: answers } = await supabase
        .from('video_answers')
        .select('*')
        .eq('application_id', applicationId);

      // Fetch panel interviews for this application
      const { data: interviews } = await supabase
        .from('panel_interviews')
        .select(`
          *,
          panel_interview_participants (
            id,
            panelist_id,
            role,
            confirmed,
            users (name, email)
          )
        `)
        .eq('application_id', applicationId);

      setVideoQuestionSets(questionSets || []);
      setVideoAnswers(answers || []);
      setPanelInterviews(interviews || []);
    } catch (error) {
      console.error('Error fetching video data:', error);
    }
  };

  const sendVideoInvite = async () => {
    if (!selectedQuestionSet) {
      toast({
        title: "Error",
        description: "Please select a video question set",
        variant: "destructive"
      });
      return;
    }

    try {
      // Update the application status to Pre-Recorded Video
      await supabase
        .from('applications')
        .update({ status: 'Pre-Recorded Video' })
        .eq('id', applicationId);

      toast({
        title: "Success",
        description: "Video interview invitation sent to candidate"
      });

      setShowInviteDialog(false);
      onUpdate();
    } catch (error) {
      console.error('Error sending video invite:', error);
      toast({
        title: "Error",
        description: "Failed to send video invitation",
        variant: "destructive"
      });
    }
  };

  const schedulePanel = async () => {
    try {
      const { data, error } = await supabase
        .from('panel_interviews')
        .insert({
          application_id: applicationId,
          title: scheduleData.title,
          scheduled_at: scheduleData.scheduled_at,
          duration_minutes: scheduleData.duration_minutes,
          location: scheduleData.location,
          meeting_link: scheduleData.meeting_link,
          notes: scheduleData.notes,
          created_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Panel interview scheduled successfully"
      });

      setShowScheduleDialog(false);
      setScheduleData({
        title: '',
        scheduled_at: '',
        duration_minutes: 60,
        location: '',
        meeting_link: '',
        notes: ''
      });
      onUpdate();
    } catch (error) {
      console.error('Error scheduling panel:', error);
      toast({
        title: "Error",
        description: "Failed to schedule panel interview",
        variant: "destructive"
      });
    }
  };

  const moveToPanel = async () => {
    try {
      await supabase
        .from('applications')
        .update({ status: 'Panel Interview' })
        .eq('id', applicationId);

      toast({
        title: "Success",
        description: "Application moved to Panel Interview stage"
      });

      onUpdate();
    } catch (error) {
      console.error('Error moving to panel:', error);
      toast({
        title: "Error",
        description: "Failed to move to panel stage",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Application': return 'bg-blue-100 text-blue-800';
      case 'Longlist': return 'bg-yellow-100 text-yellow-800';
      case 'Pre-Recorded Video': return 'bg-purple-100 text-purple-800';
      case 'Panel Interview': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Interview Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Current Status:</span>
              <Badge className={getStatusColor(applicationData.status)}>
                {applicationData.status}
              </Badge>
            </div>
            
            <div className="flex gap-2">
              {(applicationData.status === 'Longlist' || applicationData.suggested_for_longlist) && (
                <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Send className="h-4 w-4 mr-1" />
                      Send Video Invite
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Send Video Interview Invitation</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Video Question Set</Label>
                        <Select value={selectedQuestionSet} onValueChange={setSelectedQuestionSet}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select question set" />
                          </SelectTrigger>
                          <SelectContent>
                            {videoQuestionSets.map((set) => (
                              <SelectItem key={set.id} value={set.id}>
                                {set.name} ({set.questions?.length || 0} questions)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {selectedQuestionSet && (
                        <div className="text-sm text-muted-foreground">
                          {(() => {
                            const set = videoQuestionSets.find(s => s.id === selectedQuestionSet);
                            return set ? (
                              <div>
                                <p>Read: {set.read_secs}s | Prep: {set.prep_secs}s | Answer: {set.answer_secs}s</p>
                                <p>Retakes: {set.allow_retakes ? `Allowed (max ${set.max_retakes})` : 'Not allowed'}</p>
                              </div>
                            ) : null;
                          })()}
                        </div>
                      )}
                      
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
                          Cancel
                        </Button>
                        <Button onClick={sendVideoInvite}>
                          Send Invitation
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
              
              {applicationData.status === 'Pre-Recorded Video' && videoAnswers.length > 0 && (
                <Button variant="outline" size="sm" onClick={moveToPanel}>
                  <Users className="h-4 w-4 mr-1" />
                  Move to Panel
                </Button>
              )}
              
              {applicationData.status === 'Panel Interview' && (
                <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Calendar className="h-4 w-4 mr-1" />
                      Schedule Panel
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Schedule Panel Interview</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Interview Title</Label>
                        <Input
                          value={scheduleData.title}
                          onChange={(e) => setScheduleData(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="Panel Interview - Administrative Assistant"
                        />
                      </div>
                      
                      <div>
                        <Label>Scheduled Date & Time</Label>
                        <Input
                          type="datetime-local"
                          value={scheduleData.scheduled_at}
                          onChange={(e) => setScheduleData(prev => ({ ...prev, scheduled_at: e.target.value }))}
                        />
                      </div>
                      
                      <div>
                        <Label>Duration (minutes)</Label>
                        <Input
                          type="number"
                          value={scheduleData.duration_minutes}
                          onChange={(e) => setScheduleData(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) }))}
                        />
                      </div>
                      
                      <div>
                        <Label>Meeting Link (Teams/Zoom)</Label>
                        <Input
                          value={scheduleData.meeting_link}
                          onChange={(e) => setScheduleData(prev => ({ ...prev, meeting_link: e.target.value }))}
                          placeholder="https://teams.microsoft.com/..."
                        />
                      </div>
                      
                      <div>
                        <Label>Notes</Label>
                        <Textarea
                          value={scheduleData.notes}
                          onChange={(e) => setScheduleData(prev => ({ ...prev, notes: e.target.value }))}
                          placeholder="Additional instructions for the panel interview..."
                        />
                      </div>
                      
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowScheduleDialog(false)}>
                          Cancel
                        </Button>
                        <Button onClick={schedulePanel}>
                          Schedule Interview
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Video Question Sets */}
      {videoQuestionSets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Available Video Question Sets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {videoQuestionSets.map((set) => (
                <div key={set.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{set.name}</h4>
                    <Badge variant="outline">{set.questions?.length || 0} questions</Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                    <div>
                      <span className="font-medium">Read:</span> {set.read_secs}s
                    </div>
                    <div>
                      <span className="font-medium">Prep:</span> {set.prep_secs}s
                    </div>
                    <div>
                      <span className="font-medium">Answer:</span> {set.answer_secs}s
                    </div>
                    <div>
                      <span className="font-medium">Retakes:</span> {set.allow_retakes ? `Max ${set.max_retakes}` : 'None'}
                    </div>
                  </div>
                  
                  {set.questions && set.questions.length > 0 && (
                    <div className="mt-3">
                      <details className="cursor-pointer">
                        <summary className="text-sm font-medium text-primary hover:underline">
                          View Questions
                        </summary>
                        <div className="mt-2 space-y-2">
                          {set.questions.map((q: any, idx: number) => (
                            <div key={idx} className="text-sm bg-muted p-2 rounded">
                              <span className="font-medium">Q{idx + 1}:</span> {q.question}
                            </div>
                          ))}
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Video Answers */}
      {videoAnswers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Video Interview Responses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {videoAnswers.map((answer) => (
                <div key={answer.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Question {answer.question_id}</span>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {answer.duration ? `${Math.floor(answer.duration / 60)}:${(answer.duration % 60).toString().padStart(2, '0')}` : 'N/A'}
                      </span>
                    </div>
                  </div>
                  
                  {answer.transcript && (
                    <div className="bg-muted p-3 rounded text-sm mb-2">
                      <strong>Transcript:</strong> {answer.transcript}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <Button variant="outline" size="sm" asChild>
                      <a href={answer.url} target="_blank" rel="noopener noreferrer">
                        <Video className="h-4 w-4 mr-1" />
                        View Video
                      </a>
                    </Button>
                    
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm">Rate Response</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Panel Interviews */}
      {panelInterviews.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Panel Interviews</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {panelInterviews.map((interview) => (
                <div key={interview.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{interview.title}</h4>
                    <Badge variant="outline">{interview.status}</Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                    <div>
                      <Calendar className="h-4 w-4 inline mr-1" />
                      {format(new Date(interview.scheduled_at), 'dd/MM/yyyy HH:mm')}
                    </div>
                    <div>
                      <Clock className="h-4 w-4 inline mr-1" />
                      {interview.duration_minutes} minutes
                    </div>
                  </div>
                  
                  {interview.meeting_link && (
                    <div className="mt-2">
                      <Button variant="outline" size="sm" asChild>
                        <a href={interview.meeting_link} target="_blank" rel="noopener noreferrer">
                          Join Meeting
                        </a>
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};