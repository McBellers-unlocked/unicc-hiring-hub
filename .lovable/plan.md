

# Fix: Step D Semantic Matching Timeout

## Problem

The logs confirm the function reaches Step D with 150 candidates, then shuts down before completing. Step D makes **one LLM call per candidate** for semantic skill matching — that's 150 GPT-5-mini calls in 15 sequential batches of 10. At ~2-3s per call, that's 45+ minutes of sequential work. The 25s timeout on individual calls doesn't help because the *aggregate* wall clock exceeds the function limit.

## Fix

**Only run semantic skill matching on the top 30 candidates** (by text similarity score). The remaining 120 candidates get the fast fuzzy substring fallback instead. This cuts Step D from ~150 LLM calls to ~30, saving ~4 minutes of execution time.

Additionally, **cap the retrieval to 100 candidates** instead of 200 (the current `match_count` param), since we only explain the top 10 anyway — there's no value in scoring 150 candidates with expensive LLM calls.

## Changes

**File: `supabase/functions/talent-pool-match/index.ts`**

1. **Line ~644**: Only run semantic matching on the first 30 candidates (sorted by text similarity), not all candidates:
   - Change `for (let i = 0; i < allCandidates.length; i += SEMANTIC_BATCH)` to `for (let i = 0; i < Math.min(allCandidates.length, 30); i += SEMANTIC_BATCH)`
   - Add a log line showing how many get semantic vs fuzzy matching

2. **Line ~588**: Reduce the `match_count` RPC parameter from 200 to 100 to fetch fewer candidates from retrieval

3. **Add fuzzy fallback for non-semantic candidates**: After the semantic loop, apply the substring fallback logic for candidates at index 30+ so they still get skill scores (just not LLM-powered ones)

4. **Redeploy** the function

## Expected Result

- Step D drops from ~150 LLM calls to ~30 (3 batches of 10)
- Total function runtime should drop from 3+ minutes to under 90 seconds
- Top candidates still get high-quality semantic matching; lower-ranked ones get fast fuzzy scores

