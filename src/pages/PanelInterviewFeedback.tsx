import React, { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import { FeedbackFormRenderer } from '@/components/FeedbackFormRenderer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Clock, Users } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface PanelInterview {
  id: string;
  title: string;
  scheduled_at: string;
  duration_minutes: number;
  application_id: string;
  feedback_template_id?: string;
  status: string;
  applications: {
    candidates: {
      name: string;
      email: string;
    };
    jobs: {
      title: string;
    };
  };
  participants: Array<{
    panelist_id: string;
    users: {
      name: string;
    };
  }>;
}

export const PanelInterviewFeedback: React.FC = () => {
  const { interviewId } = useParams<{ interviewId: string }>();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [interview, setInterview] = useState<PanelInterview | null>(null);
  const [existingResponse, setExistingResponse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isParticipant, setIsParticipant] = useState(false);

  useEffect(() => {
    if (user && interviewId) {
      fetchInterview();
      fetchExistingResponse();
    }
  }, [user, interviewId]);

  const fetchInterview = async () => {
    try {
      const { data, error } = await supabase
        .from('panel_interviews')
        .select(`
          *,
          applications(
            candidates(name, email),
            jobs(title)
          ),
          participants:panel_interview_participants(
            panelist_id,
            users(name)
          )
        `)
        .eq('id', interviewId)
        .single();

      if (error) throw error;
      setInterview(data as any);
      
      // Check if current user is a participant
      const isUserParticipant = Array.isArray(data.participants) && data.participants.some(
        (p: any) => p.panelist_id === user?.id
      );
      setIsParticipant(isUserParticipant);
    } catch (error) {
      console.error('Error fetching interview:', error);
      toast({
        title: "Error",
        description: "Failed to load interview details",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchExistingResponse = async () => {
    try {
      const { data, error } = await supabase
        .from('feedback_form_responses')
        .select('*')
        .eq('panel_interview_id', interviewId)
        .eq('evaluator_id', user?.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      setExistingResponse(data);
    } catch (error) {
      console.error('Error fetching existing response:', error);
    }
  };

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="text-center py-8">Loading...</div>
      </Layout>
    );
  }

  if (!user) {
    return <Navigate to="/auth" />;
  }

  if (!interview) {
    return (
      <Layout>
        <div className="text-center py-8">Interview not found</div>
      </Layout>
    );
  }

  if (!isParticipant && !['Admin', 'HR Assistant'].includes(user.role)) {
    return (
      <Layout>
        <div className="text-center py-8">
          You are not authorized to view this interview feedback
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl">{interview.title}</CardTitle>
                <p className="text-lg text-muted-foreground mt-2">
                  {interview.applications.candidates.name} - {interview.applications.jobs.title}
                </p>
              </div>
              <Badge variant="outline">
                {interview.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {format(new Date(interview.scheduled_at), 'PPP')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {format(new Date(interview.scheduled_at), 'p')} ({interview.duration_minutes}m)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {interview.participants.length} panelists
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {interview.feedback_template_id ? (
          <FeedbackFormRenderer
            panelInterviewId={interview.id}
            applicationId={interview.application_id}
            templateId={interview.feedback_template_id}
            readonly={!!existingResponse && !['Admin', 'HR Assistant'].includes(user.role)}
            existingResponse={existingResponse}
          />
        ) : (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                No feedback template configured for this interview
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};