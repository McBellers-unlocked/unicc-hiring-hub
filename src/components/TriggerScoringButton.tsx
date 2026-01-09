import { Button } from '@/components/ui/button';
import { Brain, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useRef } from 'react';

interface TriggerScoringButtonProps {
  jobId: string;
  onComplete?: () => void;
  forceRescore?: boolean;
}

interface BatchJobProgress {
  id: string;
  status: string;
  total_applications: number;
  scored_count: number;
  skipped_count: number;
  error_count: number;
  error_message: string | null;
}

export function TriggerScoringButton({ jobId, onComplete, forceRescore = false }: TriggerScoringButtonProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<{ scored: number; total: number } | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  const pollProgress = async (batchJobId: string) => {
    pollingRef.current = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from('batch_scoring_jobs')
          .select('*')
          .eq('id', batchJobId)
          .single();

        if (error) {
          console.error('Error polling progress:', error);
          return;
        }

        if (data) {
          const job = data as BatchJobProgress;
          setProgress({ 
            scored: job.scored_count + job.skipped_count, 
            total: job.total_applications 
          });

          if (job.status === 'completed' || job.status === 'failed' || job.status === 'incomplete') {
            if (pollingRef.current) {
              clearInterval(pollingRef.current);
              pollingRef.current = null;
            }
            setLoading(false);
            setProgress(null);
            
            if (job.status === 'completed') {
              const hasErrors = job.error_count > 0;
              toast({
                title: hasErrors ? "Scoring Partially Complete" : "Scoring Complete",
                description: `Scored ${job.scored_count}, skipped ${job.skipped_count}${hasErrors ? `, ${job.error_count} errors` : ''}`,
                variant: hasErrors ? "destructive" : "default",
              });
            } else if (job.status === 'incomplete') {
              toast({
                title: "Scoring Incomplete",
                description: `Scored ${job.scored_count}/${job.total_applications}. Click again to resume.`,
                variant: "default",
              });
            } else {
              toast({
                title: "Scoring Failed",
                description: job.error_message || "An error occurred during scoring",
                variant: "destructive",
              });
            }
            onComplete?.();
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 2000); // Poll every 2 seconds
  };

  const triggerScoring = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('trigger-batch-scoring', {
        body: { jobId, forceRescore }
      });

      if (error) throw error;

      toast({
        title: "Scoring Started",
        description: `Processing ${data.toScore} applications in background...`,
      });

      setProgress({ scored: 0, total: data.total });

      // Start polling for progress
      pollProgress(data.batchJobId);

    } catch (error: any) {
      setLoading(false);
      setProgress(null);
      console.error('Error triggering scoring:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to start scoring",
        variant: "destructive",
      });
    }
  };

  const buttonText = loading 
    ? progress 
      ? `Scoring ${progress.scored}/${progress.total}...` 
      : 'Starting...'
    : forceRescore ? 'Re-Score All' : 'Score All Applications';

  return (
    <Button 
      onClick={triggerScoring} 
      disabled={loading}
      variant="outline"
      size="sm"
    >
      {forceRescore ? (
        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
      ) : (
        <Brain className="w-4 h-4 mr-2" />
      )}
      {buttonText}
    </Button>
  );
}
