
Goal: fix the “stuck at Starting…” + slow batch progression without changing prompts, safety rules, or scoring logic.

1) Confirm current failure mode (already evidenced)
- `trigger-batch-scoring` currently `await`s self-invocation for:
  - first kickoff (`_resumeSliceIndex: 0`)
  - next-slice continuation
- That makes each invocation block on downstream invocations, creating a chained wait that can hit the 60s edge timeout and stall the client at “Starting…”.
- DB confirms recent jobs remain `pending` with `scored_count=0` and `skipped_count=2` (hence “38 to score out of 40”).

2) Fix orchestration deadlock in `trigger-batch-scoring`
- Change both self-invocations from blocking `await fetch(...)` to non-blocking fire-and-forget with explicit `.catch(...)` logging.
- Keep immediate HTTP response to client after job creation.
- Keep slice-by-slice processing logic unchanged; only invocation strategy changes.
- Optional hardening:
  - set batch status to `processing` + heartbeat (`last_updated_at`) right when first resume starts, so UI reflects activity earlier.

3) Apply the “first essential criterion” optimization safely in `score-application`
- Implement deterministic fast-path for `years_experience` criteria so they do not require AI decomposition.
- Build a synthetic decomposition for years criteria:
  - `S1` deterministic = minimum years check (existing deterministic method)
  - `S2` llm = field-specific experience check only when a meaningful field exists (e.g., “in product development”)
  - recombine: `S1 AND S2` (or `S1` when no field is extracted)
- Exclude `years_experience` from `preloadDecompositions()` AI decomposition requests.
- This preserves logic quality (years floor + domain relevance) while removing decomposer latency.

4) Keep safety/prompt guarantees intact
- Do not modify evaluator/verifier system prompts.
- Keep:
  - No Evidence = False rule
  - verification pass
  - recombine parser
  - injection-resistant treatment of candidate text
- No DB schema changes required.

5) Validation plan after implementation
- Trigger one fresh batch for job `2776db41-6970-4445-bd02-9a53534dd117`.
- Expected:
  - UI leaves “Starting…” quickly and shows progress polling.
  - `batch_scoring_jobs` row moves `pending -> processing -> completed/incomplete`.
  - `trigger-batch-scoring` logs show kickoff + resume without long blocking chains.
  - `score-application` logs no longer spend time decomposing years criterion via AI.
- Cross-check:
  - `toScore` remains 38 because 2 applications already have v4 scores (not a bug).
