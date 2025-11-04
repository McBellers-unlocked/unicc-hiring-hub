import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarIcon, Clock, MapPin, Link as LinkIcon, Users } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface PanelInterview {
  id: string;
  title: string;
  scheduled_at: string;
  duration_minutes: number;
  location?: string;
  meeting_link?: string;
  status: string;
  participants: Array<{
    id: string;
    panelist_id: string;
    confirmed: boolean;
    users: {
      name: string;
      email: string;
    };
  }>;
}

interface PanelInterviewListProps {
  applicationId: string;
}

export const PanelInterviewList: React.FC<PanelInterviewListProps> = ({
  applicationId
}) => {
  const { toast } = useToast();
  const [interviews, setInterviews] = useState<PanelInterview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInterviews();
  }, [applicationId]);

  const fetchInterviews = async () => {
    try {
      const { data, error } = await supabase
        .from('panel_interviews')
        .select(`
          *,
          participants:panel_interview_participants(
            id,
            panelist_id,
            confirmed,
            users(name, email)
          )
        `)
        .eq('application_id', applicationId)
        .order('scheduled_at', { ascending: true });

      if (error) throw error;
      setInterviews((data as any) || []);
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
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Join Meeting
                  </a>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Panelists:</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {interview.participants.map((participant) => (
                  <div key={participant.id} className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      participant.confirmed ? 'bg-green-500' : 'bg-yellow-500'
                    }`} />
                    <span className="text-sm">{participant.users.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open(`/panel-interview/${interview.id}/feedback`, '_blank')}
              >
                View Feedback
              </Button>
              {interview.meeting_link && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open(interview.meeting_link, '_blank')}
                >
                  Join Meeting
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};