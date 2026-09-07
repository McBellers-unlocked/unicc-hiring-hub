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

export const ASSESSMENT_SLICE_SIZE = 4;

export interface AssessmentSliceResult {
  nextIndex: number;
  complete: boolean;
  scoredCount: number;
  errorCount: number;
  failures: Array<{ applicationId: string; reason: string }>;
}

/** Finish at most four independent saves before advancing durable batch progress. */
export async function assessBatchSlice(
  applicationIds: string[],
  sliceIndex: number,
  score: (applicationId: string) => Promise<string | null>,
): Promise<AssessmentSliceResult> {
  if (!Number.isInteger(sliceIndex) || sliceIndex < 0 || sliceIndex >= applicationIds.length) {
    throw new Error('The assessment slice offset is invalid.');
  }
  const slice = applicationIds.slice(sliceIndex, sliceIndex + ASSESSMENT_SLICE_SIZE);
  const outcomes = await Promise.all(slice.map(async applicationId => {
    try {
      const result = await score(applicationId);
      return { applicationId, reason: result === null ? null
        : typeof result === 'string' && result.trim() ? result : 'Assessment did not report a saved result.' };
    } catch {
      // One unexpected rejection must not discard the other saved results or
      // expose arbitrary exception details through the recruiter progress UI.
      return { applicationId, reason: 'Assessment request did not complete.' };
    }
  }));
  const failures = outcomes.filter((outcome): outcome is { applicationId: string; reason: string } => outcome.reason !== null);
  const nextIndex = sliceIndex + slice.length;
  return { nextIndex, complete: nextIndex === applicationIds.length,
    scoredCount: slice.length - failures.length, errorCount: failures.length, failures };
}
