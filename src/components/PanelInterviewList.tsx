import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { CalendarIcon, Clock, MapPin, Link as LinkIcon, Users } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { PanelInterviewFeedbackForm } from './PanelInterviewFeedbackForm';

interface PanelInterview {
  id: string;
  title: string;
  scheduled_at: string;
  duration_minutes: number;
  location?: string;
  meeting_link?: string;
  status: string;
  feedback_template_id?: string;
  applications?: {
    job_id: string;
  };
  participants: Array<{
    id: string;
    panelist_id: string | null;
    external_panelist_id: string | null;
    confirmed: boolean;
    users?: {
      name: string;
      email: string;
    } | null;
    external_panel_members?: {
      name: string;
      email: string;
      position: string;
      organization: string;
    } | null;
  }>;
}

interface PanelInterviewListProps {
  applicationId: string;
}

export const PanelInterviewList: React.FC<PanelInterviewListProps> = ({
  applicationId
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [interviews, setInterviews] = useState<PanelInterview[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedInterview, setExpandedInterview] = useState<string | null>(null);

  useEffect(() => {
    fetchInterviews();
  }, [applicationId]);

  const fetchInterviews = async () => {
    try {
      // First get the job_id from the application
      const { data: appData, error: appError } = await supabase
        .from('applications')
        .select('job_id')
        .eq('id', applicationId)
        .single();

      if (appError) throw appError;

      // Get manually scheduled interviews from panel_interviews
      const { data: manualInterviews, error: manualError } = await supabase
        .from('panel_interviews')
        .select(`
          *,
          participants:panel_interview_participants(
            id,
            panelist_id,
            external_panelist_id,
            confirmed,
            users(name, email),
            external_panel_members(name, email, position, organization)
          )
        `)
        .eq('application_id', applicationId)
        .order('scheduled_at', { ascending: true });

      if (manualError) throw manualError;

      // Get slot-booked interviews from panel_interview_invitations
      const { data: invitationData, error: invitationError } = await supabase
        .from('panel_interview_invitations')
        .select(`
          id,
          status,
          booked_at,
          booked_slot_id,
          panel_interview_time_slots:booked_slot_id (
            id,
            slot_datetime,
            duration_minutes,
            panel_member_ids,
            status
          )
        `)
        .eq('application_id', applicationId)
        .eq('status', 'booked');

      if (invitationError) throw invitationError;

      // Process slot-booked interviews
      const slotInterviews: PanelInterview[] = [];
      if (invitationData && invitationData.length > 0) {
        for (const invitation of invitationData) {
          const slot = invitation.panel_interview_time_slots;
          if (slot && slot.panel_member_ids && slot.panel_member_ids.length > 0) {
            // Fetch panel member details
            const { data: panelMembers, error: membersError } = await supabase
              .from('users')
              .select('id, name, email')
              .in('id', slot.panel_member_ids);

            if (!membersError && panelMembers) {
              // Convert to PanelInterview format
              slotInterviews.push({
                id: slot.id,
                title: 'Panel Interview (Booked Slot)',
                scheduled_at: slot.slot_datetime,
                duration_minutes: slot.duration_minutes,
                status: slot.status,
                applications: { job_id: appData.job_id },
                participants: panelMembers.map(member => ({
                  id: member.id,
                  panelist_id: member.id,
                  external_panelist_id: null,
                  confirmed: true, // Slot is booked, so members are confirmed
                  users: { name: member.name, email: member.email },
                  external_panel_members: null
                }))
              });
            }
          }
        }
      }

      // Merge and sort all interviews by date
      const allInterviews = [
        ...(manualInterviews || []).map(interview => ({
          ...interview,
          applications: { job_id: appData.job_id }
        })),
        ...slotInterviews
      ].sort((a, b) => 
        new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
      );
      
      setInterviews(allInterviews as any);
    } catch (error) {
      console.error('Error fetching interviews:', error);
      toast({
        title: "Error",
        description: "Failed to load panel interviews",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading interviews...</div>;
  }

  if (interviews.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">No panel interviews scheduled</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {interviews.map((interview) => (
        <Card key={interview.id}>
          <CardHeader>
            <div className="flex justify-between items-start">
              <CardTitle className="text-lg">{interview.title}</CardTitle>
              <Badge className={getStatusColor(interview.status)}>
                {interview.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {format(new Date(interview.scheduled_at), 'dd/MM/yyyy')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {format(new Date(interview.scheduled_at), 'p')} ({interview.duration_minutes}m)
                </span>
              </div>
              {interview.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{interview.location}</span>
                </div>
              )}
              {interview.meeting_link && (
                <div className="flex items-center gap-2">
                  <LinkIcon className="h-4 w-4 text-muted-foreground" />
                  <a 
                    href={interview.meeting_link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    Join Meeting
                  </a>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Panel Members
              </Label>
              <div className="space-y-1">
                {interview.participants.map((participant) => {
                  const isExternal = participant.external_panelist_id !== null;
                  const name = isExternal 
                    ? participant.external_panel_members?.name 
                    : participant.users?.name;
                  const email = isExternal 
                    ? participant.external_panel_members?.email 
                    : participant.users?.email;
                  const extraInfo = isExternal 
                    ? `${participant.external_panel_members?.position} at ${participant.external_panel_members?.organization}`
                    : null;

                  return (
                    <div key={participant.id} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="font-medium">{name}</div>
                          {isExternal && (
                            <Badge variant="outline" className="text-xs">External</Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">{email}</div>
                        {extraInfo && (
                          <div className="text-xs text-muted-foreground">{extraInfo}</div>
                        )}
                      </div>
                      <Badge variant={participant.confirmed ? "default" : "outline"}>
                        {participant.confirmed ? "Confirmed" : "Pending"}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>

            {interview.applications?.job_id && user && (
              <div className="pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setExpandedInterview(
                    expandedInterview === interview.id ? null : interview.id
                  )}
                  className="w-full"
                >
                  {expandedInterview === interview.id ? 'Hide' : 'Provide'} Interview Feedback
                </Button>
                
                {expandedInterview === interview.id && (
                  <div className="mt-4">
                    <PanelInterviewFeedbackForm
                      interviewId={interview.id}
                      applicationId={applicationId}
                      jobId={interview.applications.job_id}
                      userId={user.id}
                      readOnly={false}
                    />
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};