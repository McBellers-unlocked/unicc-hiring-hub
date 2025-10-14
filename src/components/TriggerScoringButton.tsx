import { Button } from '@/components/ui/button';
import { Brain } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

interface TriggerScoringButtonProps {
  jobId: string;
  onComplete?: () => void;
}

export function TriggerScoringButton({ jobId, onComplete }: TriggerScoringButtonProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const triggerScoring = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('trigger-batch-scoring', {
        body: { jobId }
      });

      if (error) throw error;

      toast({
        title: "Scoring Complete",
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
      <Brain className="w-4 h-4 mr-2" />
      {loading ? 'Scoring...' : 'Score All Applications'}
    </Button>
  );
}
