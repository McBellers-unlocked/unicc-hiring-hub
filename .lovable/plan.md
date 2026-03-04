

# Plan: Upgrade talent-pool-match to GPT-5 + semantic search improvements

## 1. Switch model to OpenAI GPT-5

In `supabase/functions/talent-pool-match/index.ts`:

- Change `MODEL` constant (line 11) from `"google/gemini-3-flash-preview"` to `"openai/gpt-5"`
- Optionally use a tiered approach: `openai/gpt-5-mini` for bulk candidate normalization (Step B), `openai/gpt-5` for job profile extraction (Step A) and explanations (Step E) — to control cost since a single match run can make 120+ LLM calls

## 2. Improve skill matching with semantic comparison

Replace the naive `fuzzyMatch` and `includes()` logic in `computeDeterministicScore` with LLM-powered semantic skill matching:

- Add a new tool schema `semantic_skill_match` that accepts arrays of required skills and candidate skills, returning a similarity matrix
- Call it once per scoring batch (not per candidate) to get semantic overlap scores
- This replaces the character-overlap heuristic at lines 288-303 and the substring matching at lines 211-216

## 3. Improve retrieval (optional, requires pgvector)

This is a larger change that could be done as a follow-up:
- Enable `pgvector` extension in Supabase
- Add a `profile_embedding vector(1536)` column to `talent_candidate_embeddings`
- Generate embeddings using an embedding model (would need OpenAI embeddings API key or similar)
- Replace `match_candidates_by_text` RPC with a vector similarity query using `<=>` operator
- This would eliminate the need for `pg_trgm`-based retrieval entirely

**Recommendation**: Steps 1-2 are quick wins. Step 3 is architecturally better but requires an embeddings endpoint not currently available through the Lovable AI Gateway, so it would need an additional API key or a workaround.

## Changes summary

**File**: `supabase/functions/talent-pool-match/index.ts`
- Line 11: Change MODEL constant to `"openai/gpt-5"`
- Optionally add a second model constant `MODEL_FAST = "openai/gpt-5-mini"` for candidate normalization calls
- Update `callAI` to accept an optional model parameter
- Redeploy the edge function

