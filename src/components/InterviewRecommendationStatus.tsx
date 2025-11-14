import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Award, Users, TrendingUp } from 'lucide-react';

interface InterviewRecommendationStatusProps {
  applicationId: string;
  jobId: string;
}

export function InterviewRecommendationStatus({ applicationId, jobId }: InterviewRecommendationStatusProps) {
  const [status, setStatus] = useState<{
    recommendation: string;
    percentage: number;
    rank: number | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecommendationStatus();
    
    // Set up real-time subscription for feedback updates
    const channel = supabase
      .channel(`feedback-${applicationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'feedback_form_responses',
          filter: `application_id=eq.${applicationId}`
        },
        () => {
          loadRecommendationStatus();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [applicationId, jobId]);

  const loadRecommendationStatus = async () => {
    try {
      setLoading(true);

      // Fetch template to calculate max possible score
      const { data: templateData } = await supabase
        .from('feedback_form_templates')
        .select('*')
        .eq('job_id', jobId)
        .eq('auto_generated', true)
        .single();

      if (!templateData) {
        setStatus(null);
        return;
      }

      // Calculate total possible criteria
      let totalCriteria = 0;
      const sections = templateData.sections as any[];
      sections.forEach((section: any) => {
        totalCriteria += section.criteria.length;
      });
      totalCriteria += 2; // Add 2 for overall_fit and potential
      const maxPossible = totalCriteria * 5;

      // Fetch all feedback responses for this job
      const { data: allResponses } = await supabase
        .from('feedback_form_responses')
        .select('application_id, overall')
        .eq('panel_interview_id', (await supabase
          .from('feedback_form_responses')
          .select('panel_interview_id')
          .eq('application_id', applicationId)
          .single()).data?.panel_interview_id);

      if (!allResponses || allResponses.length === 0) {
        setStatus(null);
        return;
      }

      // Group by application and calculate average overall score per candidate
      const candidateScores = allResponses.reduce((acc: any, curr: any) => {
        if (!acc[curr.application_id]) {
          acc[curr.application_id] = [];
        }
        acc[curr.application_id].push(curr.overall);
        return acc;
      }, {});

      // Calculate average overall score for each candidate
      const candidateAverages = Object.entries(candidateScores).map(([appId, scores]: [string, any]) => {
        const avgScore = scores.reduce((sum: number, s: number) => sum + s, 0) / scores.length;
        const percentage = Math.round((avgScore / maxPossible) * 100);
        return { applicationId: appId, avgScore, percentage };
      });

      // Sort by score to get rankings
      candidateAverages.sort((a, b) => b.avgScore - a.avgScore);

      // Find this application's status
      const thisCandidate = candidateAverages.find(c => c.applicationId === applicationId);
      if (!thisCandidate) {
        setStatus(null);
        return;
      }

      const rank = candidateAverages.findIndex(c => c.applicationId === applicationId) + 1;
      
      let recommendation: string;
      if (thisCandidate.percentage < 80) {
        recommendation = 'Not Recommended';
      } else if (rank === 1) {
        recommendation = 'Recommended';
      } else {
        recommendation = 'Alternate';
      }

      setStatus({
        recommendation,
        percentage: thisCandidate.percentage,
        rank
      });
    } catch (error) {
      console.error('Error loading recommendation status:', error);
      setStatus(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Interview Outcome</h4>
        <div className="text-sm text-muted-foreground">Loading scores...</div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="space-y-3">
        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Interview Outcome</h4>
        <div className="text-sm text-muted-foreground">Awaiting panel feedback</div>
      </div>
    );
  }

  const getStatusVariant = () => {
    if (status.recommendation === 'Recommended') return 'default';
    if (status.recommendation === 'Alternate') return 'secondary';
    return 'destructive';
  };

  const getStatusIcon = () => {
    if (status.recommendation === 'Recommended') return <Award className="w-4 h-4" />;
    if (status.recommendation === 'Alternate') return <Users className="w-4 h-4" />;
    return null;
  };

  return (
    <div className="space-y-3">
      <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Interview Outcome</h4>
      <div className="space-y-2">
        <Badge variant={getStatusVariant()} className="text-base px-4 py-2 font-semibold">
          {getStatusIcon()}
          {status.recommendation}
        </Badge>
        <div className="flex flex-col gap-1 text-sm">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-3 h-3 text-muted-foreground" />
            <span className="text-muted-foreground">Score: <span className="font-semibold text-foreground">{status.percentage}%</span></span>
          </div>
          {status.rank && (
            <div className="flex items-center gap-2">
              <Award className="w-3 h-3 text-muted-foreground" />
              <span className="text-muted-foreground">Rank: <span className="font-semibold text-foreground">#{status.rank}</span></span>
            </div>
          )}
        </div>
        {status.recommendation === 'Alternate' && (
          <p className="text-xs text-muted-foreground mt-2 p-2 bg-muted/50 rounded">
            Appointable candidate. May be considered for similar positions without re-interview.
          </p>
        )}
        {status.recommendation === 'Not Recommended' && (
          <p className="text-xs text-muted-foreground mt-2 p-2 bg-muted/50 rounded">
            Score below 80% threshold for appointment consideration.
          </p>
        )}
      </div>
    </div>
  );
}
