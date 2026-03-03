
Goal: unstick scoring for “Associate Product Delivery and Development Officer” and make batch runs complete reliably.

What I confirmed
- The issue is real and reproducible:
  - `batch_scoring_jobs` for this job are repeatedly stuck at `status=processing`, `scored_count=0`, `error_count=0`.
  - `screening_scores` count is currently `0` for this job.
  - `score-application` logs show starts + criterion logs, but no “Scoring complete”, followed by `shutdown`.
  - `trigger-batch-scoring` logs show retries and then `shutdown` before progress updates.
- Current decomposition for this job is very heavy: 7 criteria with ~24 LLM subrequirements total. That makes one application run too long for orchestration time limits.

Root cause
- Two time-bound processes are colliding:
  1) `score-application` takes too long per application under current decomposition load.
  2) `trigger-batch-scoring` tries to process too much in one background invocation, then shuts down mid-batch.
- Result: no score is persisted, and batch job remains “processing” at 0.

Implementation plan

1) Make batch orchestration resumable (critical fix)
- Update `supabase/functions/trigger-batch-scoring/index.ts` so one invocation processes only a small slice, persists progress, and exits.
- Add cursor-based continuation on `batch_scoring_jobs` (reuse existing row fields with metadata/json if available, or encoded progress strategy without schema change).
- After each slice:
  - update `scored_count/error_count/last_updated_at`
  - if remaining items exist, self-invoke next slice via `EdgeRuntime.waitUntil(...)`
- This removes the “single long process” failure mode.

2) Reduce per-application runtime further in `score-application`
- Keep existing v4 pipeline/safeguards intact.
- Add one additional optimization: score criteria concurrently with a small cap (e.g., 2 criteria in parallel), while keeping subrequirement concurrency cap (6).
- Keep deterministic checks authoritative; no change to scoring logic/prompt intent/evidence rules.
- Keep verifier trigger as already optimized (`demonstrated && confidence < 0.80`).

3) Enforce per-job decomposition complexity guard (no schema change)
- Keep decomposition caching behavior, but add runtime guard to prevent pathological decompositions from exploding calls:
  - cap active LLM subrequirements per criterion (e.g., top N by order returned) with explicit flag in rubric metadata.
- This is a performance safety valve; recombine and evidence logic stay unchanged.

4) Improve failure visibility to avoid “stuck at 0” UX
- In `trigger-batch-scoring`, always set job terminal state on fatal shutdown paths:
  - if no progress for threshold => mark `incomplete` with `error_message`.
- Ensure retries increment `error_count` and persist per-application failure reason snippets (trimmed) so UI reflects movement.

5) Validate with targeted run sequence
- Test one direct `score-application` call: must return success and create one `screening_scores` row.
- Trigger batch for this job:
  - verify `scored_count` increments within first minute
  - verify `last_updated_at` advances every slice
  - confirm final terminal status (`completed` or `incomplete` with clear error details).

6) Recovery for current stuck runs
- Mark currently stale `processing` rows for this job as `incomplete`.
- Start one fresh batch run after fixes.
- Keep polling UI unchanged; it should now show advancing progress instead of permanent 0.

Files to change
- `supabase/functions/trigger-batch-scoring/index.ts` (primary reliability fix)
- `supabase/functions/score-application/index.ts` (additional runtime reduction + guardrails)

Expected outcome
- Batch no longer hangs at 0.
- First progress updates appear quickly.
- End-to-end scoring completes reliably for 40 applications without silent stalls.
