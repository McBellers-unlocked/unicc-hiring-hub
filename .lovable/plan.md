

## Performance Optimizations for AI Scoring Pipeline v4.0

### Changes — all in `supabase/functions/score-application/index.ts`

**1. Precompute decompositions before scoring loop**
Before the per-criterion scoring loop (line ~1117), add a preload step:
- Collect all non-education criteria
- Batch-query `criterion_decompositions` for the job
- Call the decomposer only for missing criteria
- Store results in a local `Map<string, Decomposition>`
- `scoreCriterionV4` reads from this map instead of calling `getOrCreateDecomposition` per criterion

This eliminates N sequential DB lookups + potential AI calls during candidate scoring.

**2. Parallelize evaluator calls with concurrency limiter**
In `scoreCriterionV4` (line ~856), the `for` loop over subrequirements is sequential. Change to:
- Add a concurrency limiter utility (`MAX_CONCURRENCY = 6`) that wraps `Promise.allSettled()`
- Deterministic subs resolve instantly; LLM subs go through the limiter
- All subrequirement evaluations for a single criterion run in parallel

**3. Reduce verifier calls — only verify positive borderline results**
In `scoreCriterionV4` (line ~869), current condition is:
```
if (evalResult.demonstrated || evalResult.confidence < 0.75)
```
Change to:
```
if (evalResult.demonstrated && evalResult.confidence < 0.80)
```
This skips verification for `demonstrated=false` results entirely, dramatically reducing verifier calls.

**4. Input truncation**
Add a `truncateText` helper. Before passing to evaluator prompts:
- Work experience (`candidateDuties`): truncate to 6000 chars, keeping most recent roles first (they appear first in the array already)
- Motivation letter: truncate to 6000 chars, keeping from the start

Applied once at the top of the scoring flow, before the criteria loop.

**5. Experience bullets cache (in-memory per scoring run)**
After truncation, extract bullet-point summaries from work experience:
- Use a simple regex/split to pull key responsibility lines
- Prepend as `EXPERIENCE BULLETS:\n...` before the full truncated work experience in evaluator prompts
- No database table needed — lives only for the duration of one function invocation

**6. No changes to:**
- Database schema, prompts' core logic, recombine parser, human review, deterministic checks, evidence requirements, "no evidence = false" rule

### Expected result
- Decomposition: 0 AI calls per candidate (precomputed)
- Evaluator: parallel instead of sequential (~6x faster for criteria with multiple subs)
- Verifier: ~50-70% fewer calls
- Token usage: reduced via truncation + bullets
- Net improvement: 3-10x faster per candidate

