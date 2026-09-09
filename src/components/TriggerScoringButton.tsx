import { Button } from '@/components/ui/button';
import { Brain, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useRef } from 'react';
import { batchPollingStatus, classifyBatchStart, type AssessmentBatchProgress } from '@/lib/batchProgress';

interface TriggerScoringButtonProps {
  jobId: string;
  onComplete?: () => void;
  forceRescore?: boolean;
}

export function TriggerScoringButton({ jobId, onComplete, forceRescore = false }: TriggerScoringButtonProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [checkPending, setCheckPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ processed: number; total: number } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const epochRef = useRef(0);
  const batchRef = useRef<string | null>(null);
  const observedAtRef = useRef(0);
  const failuresRef = useRef(0);
  const completeRef = useRef(onComplete);
  completeRef.current = onComplete;

  const cancelRequests = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    requestRef.current?.abort();
    requestRef.current = null;
  };

  useEffect(() => {
    epochRef.current++;
    cancelRequests();
    batchRef.current = null;
    setLoading(false);
    setCheckPending(false);
    setNotice(null);
    setProgress(null);
    return () => { epochRef.current++; cancelRequests(); };
  }, [jobId]);

  const pausePolling = (message: string) => {
    cancelRequests();
    setLoading(false);
    setProgress(null);
    setCheckPending(true);
    setNotice(message);
  };

  const pollProgress = async (batchJobId: string, epoch: number) => {
    if (epoch !== epochRef.current) return;
    const controller = new AbortController();
    requestRef.current = controller;
    const deadline = setTimeout(() => controller.abort(), 10_000);
    try {
      const { data, error } = await supabase.from('batch_scoring_jobs').select('*')
        .eq('id', batchJobId).abortSignal(controller.signal).single();
      if (epoch !== epochRef.current) return;
      if (error || !data) throw error || new Error('The assessment batch could not be found.');
      failuresRef.current = 0;
      const job = data as AssessmentBatchProgress;
      setProgress({ processed: job.scored_count + job.skipped_count + job.error_count, total: job.total_applications });
      const state = batchPollingStatus(job, Date.now(), observedAtRef.current);
      if (state === 'stalled') {
        pausePolling('Assessment progress has not changed for several minutes. Check this batch before starting another assessment.');
        completeRef.current?.();
        return;
      }
      if (state !== 'processing') {
        cancelRequests();
        batchRef.current = null;
        setLoading(false);
        setCheckPending(false);
        setProgress(null);
        const message = state === 'completed'
          ? `Assessed ${job.scored_count} applications${job.error_count ? `; ${job.error_count} need another attempt` : ''}.`
          : job.error_message || 'The assessment did not finish. You can start a new assessment.';
        setNotice(message);
        toast({ title: state === 'completed' ? 'Assessment complete' : 'Assessment incomplete', description: message,
          variant: state === 'completed' && !job.error_count ? 'default' : 'destructive' });
        completeRef.current?.();
        return;
      }
    } catch (error) {
      if (epoch !== epochRef.current) return;
      failuresRef.current++;
      if (failuresRef.current >= 3) {
        pausePolling('Progress could not be confirmed. Check your connection or sign in again, then check assessment progress.');
        return;
      }
    } finally {
      clearTimeout(deadline);
      if (requestRef.current === controller) requestRef.current = null;
    }
    if (epoch === epochRef.current) timerRef.current = setTimeout(() => void pollProgress(batchJobId, epoch), 2_000);
  };

  const triggerAssessment = async () => {
    cancelRequests();
    const epoch = ++epochRef.current;
    setLoading(true);
    setNotice(null);
    failuresRef.current = 0;
    if (batchRef.current) {
      setCheckPending(false);
      void pollProgress(batchRef.current, epoch);
      return;
    }
    const controller = new AbortController();
    requestRef.current = controller;
    const deadline = setTimeout(() => controller.abort(), 15_000);
    try {
      // Recover a batch accepted before a previous connection loss, and share a
      // running batch across the assessment and reassessment buttons.
      const { data: activeBatch, error: activeError } = await supabase.from('batch_scoring_jobs')
        .select('*').eq('job_id', jobId).in('status', ['pending', 'processing'])
        .order('created_at', { ascending: false }).limit(1).abortSignal(controller.signal).maybeSingle();
      if (epoch !== epochRef.current) return;
      if (activeError) throw activeError;
      if (activeBatch && batchPollingStatus(activeBatch, Date.now(), Date.parse(activeBatch.created_at || '') || Date.now()) !== 'stalled') {
        batchRef.current = activeBatch.id;
        observedAtRef.current = Date.now();
        void pollProgress(activeBatch.id, epoch);
        return;
      }
      const { data, error } = await supabase.functions.invoke('trigger-batch-scoring', {
        body: { jobId, forceRescore }, signal: controller.signal,
      } as Parameters<typeof supabase.functions.invoke>[1]);

      if (epoch !== epochRef.current) return;
      if (error) throw error;
      const start = classifyBatchStart(data);
      if (start === 'empty') {
        setLoading(false);
        setProgress(null);
        setNotice('No completed applications are ready for assessment.');
        completeRef.current?.();
        return;
      }
      if (start !== 'started') throw new Error('The assessment service did not return a batch reference. Refresh to check its status before trying again.');
      batchRef.current = data.batchJobId;
      observedAtRef.current = Date.now();
      setProgress({ processed: 0, total: data.total });
      void pollProgress(data.batchJobId, epoch);
    } catch (error) {
      if (epoch !== epochRef.current) return;
      setLoading(false);
      setProgress(null);
      const message = error && typeof error === 'object' && 'message' in error ? String(error.message) : 'The assessment could not be started. Please try again.';
      setNotice(message);
      toast({ title: 'Assessment could not be started', description: message, variant: 'destructive' });
    } finally {
      clearTimeout(deadline);
      if (requestRef.current === controller) requestRef.current = null;
    }
  };

  const label = loading ? progress ? `Assessing ${progress.processed}/${progress.total}…` : 'Starting…'
    : checkPending ? 'Check assessment progress' : forceRescore ? 'Reassess applications' : 'Assess applications';
  return (
    <div className="max-w-sm space-y-1">
      <Button onClick={triggerAssessment} disabled={loading} variant="outline" size="sm">
        {forceRescore || checkPending ? <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> : <Brain className="w-4 h-4 mr-2" />}
        {label}
      </Button>
      {notice && <p role="status" className="text-xs font-normal text-muted-foreground">{notice}</p>}
    </div>
  );
}
