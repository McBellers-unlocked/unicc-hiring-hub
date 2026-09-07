/** Validate a continuation against durable batch progress, before claiming work. */
export function validateBatchContinuation(batch: {
  status: string; total_applications: number; scored_count: number; error_count: number;
}, applicationIds: unknown, sliceIndex: unknown): string | null {
  if (batch.status !== 'pending') return 'This batch is not waiting for a continuation.';
  if (!Array.isArray(applicationIds) || applicationIds.some(id => typeof id !== 'string' || !id)) return 'Application identifiers are invalid.';
  if (new Set(applicationIds).size !== applicationIds.length || applicationIds.length !== batch.total_applications) return 'The continuation does not match the batch application count.';
  if (!Number.isInteger(sliceIndex) || (sliceIndex as number) < 0 || (sliceIndex as number) >= applicationIds.length) return 'The continuation offset is invalid.';
  if (sliceIndex !== batch.scored_count + batch.error_count) return 'The continuation does not match the recorded progress.';
  return null;
}
