import { Button } from '@/components/ui/button';
import { Brain, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

interface TriggerScoringButtonProps {
  jobId: string;
  onComplete?: () => void;
  forceRescore?: boolean;
}

export function TriggerScoringButton({ jobId, onComplete, forceRescore = false }: TriggerScoringButtonProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const triggerScoring = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('trigger-batch-scoring', {
        body: { jobId, forceRescore }
      });

      if (error) throw error;

      if (data.errors > 0) {
        toast({
          title: "Scoring Partially Complete",
          description: `${data.success} scored, ${data.errors} failed. Click "Re-Score All" to retry failed applications.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: forceRescore ? "Re-Scoring Complete" : "Scoring Complete",
          description: `Successfully scored ${data.success} applications.${data.skipped > 0 ? ` ${data.skipped} already scored.` : ''}`,
        });
      }

      onComplete?.();
    } catch (error: any) {
      console.error('Error triggering scoring:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to trigger scoring",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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
      {loading ? 'Scoring...' : forceRescore ? 'Re-Score All' : 'Score All Applications'}
    </Button>
  );
}
