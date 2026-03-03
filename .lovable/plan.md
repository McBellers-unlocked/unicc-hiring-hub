

# Fix: Deploy `talent-pool-match` Edge Function

## Root Cause

The edge function `talent-pool-match` was never deployed. It exists in the codebase but has zero logs on the server, meaning the client gets `FunctionsFetchError: Failed to fetch` because there is no function listening at that URL.

## Plan

1. **Deploy the edge function** using the deploy tool. The code and `config.toml` entry already exist — it just needs to be pushed to Supabase.

2. **Verify the migration ran** — the tables (`job_match_profiles`, `talent_candidate_embeddings`, `talent_match_runs`, `talent_match_results`) and the `match_candidates_by_text` RPC function need to exist. If not, we'll need to re-run the migration.

3. **Test the function** after deployment by invoking it from the AI Match tab.

No code changes needed — this is purely a deployment issue.

