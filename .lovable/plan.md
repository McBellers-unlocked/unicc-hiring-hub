

## Implement Performance Optimizations for AI Scoring Pipeline v4.0

All changes in `supabase/functions/score-application/index.ts`.

### 1. Add utility functions (after types, before system prompts ~line 110)

- `truncateText(text, maxLen)` — truncate to 6000 chars with `[...truncated]` suffix
- `extractExperienceBullets(text)` — regex-extract bullet-point summaries from work experience, return formatted string prefixed with `EXPERIENCE BULLETS:`
- `runWithConcurrency(tasks, max)` — generic concurrency limiter using worker pattern with `Promise.allSettled` semantics
- `preloadDecompositions(jobId, criteria)` — batch-fetch `criterion_decompositions`, call decomposer only for missing criteria via `runWithConcurrency`, return `Map<string, Decomposition>`
- `decomposeViaSingleAICall(criterionId, criterionText)` — extracted from `getOrCreateDecomposition` for reuse by preloader

### 2. Update `evaluateSubRequirement` signature (line ~630)
Add `experienceBullets: string` parameter. Prepend bullets before full work experience in the evaluator prompt.

### 3. Update `scoreCriterionV4` signature (line ~843)
- Add `decompositionMap: Map<string, Decomposition>` and `experienceBullets: string` parameters
- Read decomposition from map first, fallback to `getOrCreateDecomposition`
- Replace sequential `for` loop with parallel `runWithConcurrency(tasks, MAX_CONCURRENCY)`
- Change verifier condition from `demonstrated || confidence < 0.75` to `demonstrated && confidence < 0.80`

### 4. Update main handler (line ~1100)
- After extracting `candidateDuties` and `motivationLetter`, apply `truncateText(..., 6000)` to both
- Call `extractExperienceBullets(candidateDuties)` once
- Call `preloadDecompositions(jobId, parsedCriteria)` before the scoring loop
- Pass `decompositionMap` and `experienceBullets` to `scoreCriterionV4`

### Constants
```
MAX_CONCURRENCY = 6
MAX_TEXT_LENGTH = 6000
```

### What stays unchanged
- Database schema, prompts, recombine parser, human review, deterministic checks, evidence requirements, "no evidence = false" rule

### Expected result
- 0 decomposition AI calls per candidate (precomputed per job)
- ~6x faster evaluator (parallel)
- ~50-70% fewer verifier calls
- Reduced token usage via truncation + bullets

