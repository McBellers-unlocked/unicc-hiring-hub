

## Diagnosis: 60-Second Edge Function Timeout Kills Both Functions

### Root cause

The edge function logs show `score-application` boots at `T+0`, processes criteria sequentially (`MAX_CRITERIA_CONCURRENCY = 1`), and is killed by a **shutdown** event exactly **60 seconds** later — the default Supabase Edge Function wall-clock timeout.

With 7 criteria scored sequentially at ~10-15s each, the function needs ~70-100s. It's killed at 60s every time.

This also kills `trigger-batch-scoring` because it awaits `supabase.functions.invoke('score-application')` synchronously. When score-application is killed at 60s, trigger-batch-scoring is also at ~60s and gets killed too — before it can update the DB or self-invoke the next slice.

The "2/40" the UI shows is actually `scored_count (0) + skipped_count (2)` — zero new apps were scored.

### Fix (2 files, no prompt/safety/logic changes)

**1. `supabase/functions/score-application/index.ts`** — Increase criteria concurrency

Change `MAX_CRITERIA_CONCURRENCY` from `1` to `3`. With 7 criteria at concurrency 3, execution takes ~3 rounds x 10-15s = **30-45s**, well within the 60s timeout.

The 429 backoff logic (`AI_RETRY_ATTEMPTS = 3` with exponential backoff) already handles rate limiting gracefully, so increasing concurrency is safe. Previously we reduced from 6 to 3 for `MAX_CONCURRENCY` and 2 to 1 for criteria — going back to 3 for criteria is a middle ground that fits the timeout.

**2. `supabase/functions/trigger-batch-scoring/index.ts`** — Remove retries

Change `MAX_RETRIES` from `2` to `0`. With retries, if score-application fails after 45s, the retry would push trigger-batch-scoring past its own 60s timeout (45s + 3s delay + 45s = 93s). Without retries, each slice completes in ~45s, leaving time for the DB update and self-invoke.

Failed applications will show in `error_count` and can be re-run.

### Summary of changes

| File | Line | Change |
|------|------|--------|
| `score-application/index.ts` | 23 | `MAX_CRITERIA_CONCURRENCY = 1` → `3` |
| `trigger-batch-scoring/index.ts` | 10 | `MAX_RETRIES = 2` → `0` |

### Expected result
- score-application completes in ~30-45s (within 60s timeout)
- trigger-batch-scoring finishes each slice in ~45s, updates DB, self-invokes next slice
- Batch progresses through all 38 applications
- No changes to prompts, scoring logic, or safety checks

