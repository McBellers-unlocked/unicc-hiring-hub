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

      toast({
        title: forceRescore ? "Re-Scoring Complete" : "Scoring Complete",
        description: `Successfully scored ${data.success} applications. ${data.skipped} already scored. ${data.errors} errors.`,
      });

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
