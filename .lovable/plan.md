

## Diagnosis: Score-Application Function is Timing Out

### What's happening
The logs show a clear pattern:
1. Batch scoring starts 3 applications concurrently
2. Each `score-application` instance begins processing: gets through `years_experience` (deterministic, instant), starts `specific_experience` (requires AI calls)
3. After ~150 seconds the function **shuts down** (Supabase edge function wall clock limit)
4. The batch trigger retries twice, same result — all 3 apps fail both retries
5. The batch job stays at `scored_count: 0` permanently

The database confirms: **0 screening_scores exist** for this job (the forceRescore deleted them), and the latest batch job `ea1d13e3` is stuck at 0/40 with status "processing".

### Root cause
Each criterion with LLM subrequirements requires **sequential** AI calls (evaluate → verify, for each sub). With GPT-5 taking 10-30s per call, a single criterion with 3-4 subs can take 60-120s. Seven criteria sequentially easily exceeds the 150s function timeout.

### Fix: Implement the approved v4.0 performance optimizations

These directly solve the timeout by:

1. **Parallelize evaluator calls** — Process subrequirements concurrently (max 6) instead of sequentially. A criterion with 4 subs takes ~30s instead of ~120s.

2. **Reduce verifier calls** — Change condition from `demonstrated || confidence < 0.75` to `demonstrated && confidence < 0.80`. This cuts ~50-70% of verifier AI calls.

3. **Input truncation** — Truncate work experience and motivation letter to 6000 chars each, reducing token count and response time.

4. **Experience bullets cache** — Extract key bullet points once, prepend to evaluator prompts for faster model context.

5. **Preload decompositions** — Already cached (7 exist), but add batch-fetch at start to avoid per-criterion DB lookups.

All changes in `supabase/functions/score-application/index.ts`. No schema changes needed.

### Expected result
- Function completes well within the 150s timeout
- Batch scoring progresses through all 40 applications
- 3-10x faster per candidate

