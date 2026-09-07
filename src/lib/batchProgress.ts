export interface AssessmentBatchProgress {
  id: string;
  status: string;
  total_applications: number;
  scored_count: number;
  skipped_count: number;
  error_count: number;
  error_message: string | null;
  last_updated_at?: string | null;
}

export const BATCH_STALE_AFTER_MS = 180_000;

export function classifyBatchStart(value: unknown): 'empty' | 'started' | 'invalid' {
  if (!value || typeof value !== 'object') return 'invalid';
  const response = value as Record<string, unknown>;
  if (response.toScore === 0 && !response.batchJobId) return 'empty';
  return typeof response.batchJobId === 'string' && response.batchJobId.length > 0 ? 'started' : 'invalid';
}

export function batchPollingStatus(job: AssessmentBatchProgress, now: number, observedAt: number): 'completed' | 'failed' | 'incomplete' | 'stalled' | 'processing' {
  if (job.status === 'completed' || job.status === 'failed' || job.status === 'incomplete') return job.status;
  const timestamp = Date.parse(job.last_updated_at || '');
  const updatedAt = Number.isFinite(timestamp) ? timestamp : observedAt;
  return now - updatedAt > BATCH_STALE_AFTER_MS ? 'stalled' : 'processing';
}
