

# Fix: talent-pool-match Edge Function Timeout

## Problem

The edge function is crashing/timing out. The logs show the function boots successfully but shuts down ~3 minutes later with no request-processing logs, and the client gets `Failed to fetch`. This is a **wall clock timeout** — the function does too much work in a single invocation:

1. Build job profile (1 GPT-5 call)
2. Fetch up to 500 candidates, normalize unindexed ones in batches of 10 (potentially 50+ GPT-5-mini calls)
3. Retrieve top 200 via `match_candidates_by_text` RPC
4. Run semantic skill matching per batch of 10 candidates (more GPT-5-mini calls)
5. Generate explanations for top 20 (20 GPT-5 calls)

That's 70+ LLM round-trips in a single HTTP request. Supabase edge functions have a ~150s wall clock limit (or 60s on some plans).

## Fix

Reduce the work per invocation by:

1. **Cap candidate normalization** — only normalize candidates that don't already have embeddings, and limit to 50 per run (down from 500 fetched). Skip normalization entirely if enough indexed candidates exist.

2. **Reduce explanation generation** — drop from top 20 to top 10 candidates getting LLM explanations. The rest get deterministic-only scores.

3. **Add request-level timeouts on LLM calls** — use `AbortSignal.timeout(25000)` on each `fetch` to the AI gateway so a single slow call doesn't stall the entire function.

4. **Add progress logging** — `console.log` at each pipeline stage so we can see where it stalls in edge function logs.

5. **Reduce candidate fetch limit** — fetch 200 candidates instead of 500 for normalization, and reduce batch size awareness.

## File Changes

**`supabase/functions/talent-pool-match/index.ts`**:
- Add `signal: AbortSignal.timeout(25000)` to the `fetch` call in `callAI`
- Add `console.log` breadcrumbs at each pipeline stage (Steps A through E)
- Change candidate fetch limit from 500 to 200 (line ~530)
- Change normalization cap from 100 to 50 (around line ~555)
- Change explanation generation from top 20 to top 10 (around line ~680)
- Redeploy the function

