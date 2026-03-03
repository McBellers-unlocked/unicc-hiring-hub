

## Diagnosis: score-application Takes 120s Per App (Not 30-45s)

### Evidence from logs and DB

The batch IS progressing — both batch jobs show sequential slice advancement:
- `58732cb1`: slice 0→1→2→3→4, scored 4 apps in 6 minutes
- `00cbb094`: slice 0→1→2, scored 1 app in 2.5 minutes

The self-invoke chain works. The problem is **speed**: each `score-application` invocation takes **120 seconds**, not the estimated 30-45s. At that rate, 37 apps would take **74 minutes**. That's why it appears "stuck."

### Root cause: MAX_CRITERIA_CONCURRENCY = 3 is too low

With 7 criteria and concurrency of 3:
```text
Round 1: criteria 1-3 start (each ~20-30s for subs + evaluate + verify)
Round 2: criteria 4-6 start
Round 3: criterion 7 starts
Total: ~90-120s per application
```

Each criterion involves 2-5 LLM calls (evaluate subrequirements + verify borderline positives). With 3 criteria processing at a time, it takes 3 rounds of ~40s each.

### Fix: Two changes, no prompt/safety/logic modifications

**1. `score-application/index.ts` line 23: MAX_CRITERIA_CONCURRENCY = 3 → 5**

Process 5 criteria simultaneously instead of 3. With 7 total criteria:
```text
Round 1: criteria 1-5 start (~20-30s)
Round 2: criteria 6-7 start (~20-30s)
Total: ~40-50s per application (3x faster)
```

Peak concurrent LLM calls: ~15 (5 criteria × ~3 subs each). The existing 429 backoff with `AI_RETRY_ATTEMPTS=3` handles rate limiting. This is well below the AI gateway's capacity.

**2. `score-application/index.ts` line 24: MAX_SUBS_PER_CRITERION = 5 → 3**

Cap subrequirements per criterion to 3 instead of 5. Most criteria only have 2-3 atomic subrequirements anyway (the decomposer rarely produces more). This prevents outlier criteria from adding excessive LLM calls when combined with higher criteria concurrency.

### What stays unchanged
- All prompts (evaluator, verifier, decomposer)
- No Evidence = False rule
- Verification pass (borderline positive check)
- Recombine logic parser (safe, no eval())
- Injection-resistant treatment of candidate text
- Deterministic years_experience decomposition
- Fire-and-forget self-invoke architecture in trigger-batch-scoring
- No DB schema changes

### Expected results
- `score-application` completes in ~40-50s (down from ~120s)
- Full batch of 37 apps completes in ~30-35 minutes (down from ~74 minutes)
- UI polling shows steady progress (~1 app per minute)
- No changes to scoring quality or safety guarantees

### Files to change

| File | Line | Change |
|------|------|--------|
| `score-application/index.ts` | 23 | `MAX_CRITERIA_CONCURRENCY = 3` → `5` |
| `score-application/index.ts` | 24 | `MAX_SUBS_PER_CRITERION = 5` → `3` |

