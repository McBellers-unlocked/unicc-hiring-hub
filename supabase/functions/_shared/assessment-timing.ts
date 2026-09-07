/** Both evaluation and verification share this complete AI time budget. */
export const ASSESSMENT_AI_BUDGET_MS = 80_000;
/** A single provider call gets headroom above observed successful evaluation latency. */
export const GATEWAY_REQUEST_TIMEOUT_MS = 50_000;

/** Keep each attempt inside the shared deadline, including a completion margin. */
export function gatewayAttemptTimeoutMs(deadline: number, now: number): number | null {
  const remaining = deadline - now;
  if (!Number.isFinite(remaining) || remaining < 1000) return null;
  return Math.min(GATEWAY_REQUEST_TIMEOUT_MS, remaining - 500);
}
