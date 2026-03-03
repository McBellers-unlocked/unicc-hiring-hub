

## Two Bugs Found

### Bug 1: "Starting..." stall — trigger-batch-scoring blocks on first slice

The `trigger-batch-scoring` function processes the first slice **synchronously** (line 254: `await processSlice(...)`) before returning the HTTP response. Since `score-application` takes 30-120 seconds per app, the client waits that entire time showing "Starting...". If it exceeds the 150s function timeout, the function is killed and the batch stays at `pending` with `scored_count: 0`.

The DB confirms this: the 5 most recent batch jobs are all stuck at `status: pending`, `scored_count: 0`.

**Fix in `supabase/functions/trigger-batch-scoring/index.ts`:**
- Remove the synchronous `await processSlice(...)` call before the response
- Instead, immediately return the response to the client with the `batchJobId`
- Self-invoke via `fetch()` to start processing the first slice asynchronously (same pattern already used for subsequent slices)

### Bug 2: "Legacy format" error — analysisVersion mismatch

The `score-application` function sets `analysisVersion: '4.1-resumable-parallel-guarded'` (line 1266). But the UI component (`ApplicationScoring.tsx` line 109-119) checks:
```
breakdown.analysisVersion?.startsWith('4.0')
```
`'4.1-...'` does not start with `'4.0'`, so the UI treats all new scores as "legacy format".

The 2 scores that successfully completed (applications `24b0cd58` and `d6818434`) are invisible because of this version check.

**Fix in `supabase/functions/score-application/index.ts`:**
- Change `analysisVersion` from `'4.1-resumable-parallel-guarded'` to `'4.0-resumable-parallel-guarded'` so it matches the UI's `startsWith('4.0')` check

### Files to change

1. **`supabase/functions/trigger-batch-scoring/index.ts`** — Replace inline `processSlice` with async self-invocation before returning response
2. **`supabase/functions/score-application/index.ts`** — Change analysisVersion string to start with `4.0`

### Expected result
- Button immediately transitions from "Starting..." to "Scoring 0/40..." within 1-2 seconds
- Existing scores display correctly instead of showing "legacy format"
- Batch progresses reliably via self-invoking slices

