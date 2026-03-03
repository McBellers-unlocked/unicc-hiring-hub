

## Diagnosis: Re-Score Deleted All Scores, Then New Run Was Killed

### What happened (timeline from logs)

1. **21:37-21:38** — Batch `f44ad47f` completed successfully, scoring all 40 applications (including your `0e227ddc`). Scores were saved.
2. **21:39:41** — You clicked "Score" (non-force). It found 40 existing scores, skipped all 40. Good.
3. **21:39:45** — You clicked "Re-Score All" (force). This **deleted all 40 scores immediately**, then started a new batch processing slice 1 (2 apps).
4. **21:40:30-21:41:32** — The Edge Function process **shut down** before the new batch finished even one slice. `EdgeRuntime.waitUntil` chains don't survive process shutdown.
5. **Now** — 0 scores exist. Batch `36f652f7` is stuck at `pending/0`. The UI correctly shows no data.

Additionally, the score-application logs show massive **429 rate limiting** from the AI Gateway — the concurrency settings (6 sub-requirements + 2 criteria in parallel = up to 12 simultaneous AI calls) are too aggressive.

### Three problems to fix

1. **Re-Score is destructive** — It deletes all existing scores *before* creating replacements. If the replacement run fails, you lose everything.

2. **429 rate limiting** — `MAX_CONCURRENCY=6` x `MAX_CRITERIA_CONCURRENCY=2` = up to 12 simultaneous AI calls, overwhelming the gateway.

3. **`EdgeRuntime.waitUntil` chains don't survive shutdown** — The resumable slice design relies on in-memory continuation, which is lost when the process is killed.

### Implementation plan

**File: `supabase/functions/trigger-batch-scoring/index.ts`**

- **Safe re-score**: Instead of deleting all scores upfront, delete each application's score *only after* it has been successfully re-scored. Change the `forceRescore` logic from "delete all then score" to "score with replace-on-success".
- **True resumability**: Instead of `EdgeRuntime.waitUntil` chains, store the current slice index in the `batch_scoring_jobs` row (use `error_message` field or add a metadata field). The frontend polling can detect stalls and re-trigger. Or: self-invoke via `fetch()` to the same function instead of `waitUntil`.
- **Reduce slice concurrency**: Keep `SLICE_SIZE = 1` (one app at a time) to avoid timeout pressure.

**File: `supabase/functions/score-application/index.ts`**

- **Add 429 backoff**: In `callAIWithToolCalling`, when receiving a 429 response, wait with exponential backoff (2s, 4s, 8s) before retrying, up to 3 attempts.
- **Reduce concurrency**: Change `MAX_CONCURRENCY` from 6 to 3, `MAX_CRITERIA_CONCURRENCY` from 2 to 1. This caps simultaneous AI calls at 3 per application instead of 12.
- **Per-app score delete**: Accept an optional `forceRescore` flag. If set, delete the old score for *this* application only, *after* the new score is ready (atomic replace via upsert — which it already does).

**File: `src/components/TriggerScoringButton.tsx`**

- Pass `forceRescore` flag through to the edge function (already done).

### Expected result

- Re-scoring no longer risks data loss — old scores persist until replaced
- 429 errors handled gracefully with backoff
- 3 concurrent AI calls instead of 12
- Batch progresses reliably through all 40 applications

