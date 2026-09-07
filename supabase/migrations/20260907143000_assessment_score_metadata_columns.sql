-- Older deployments may not have the June scoring metadata migration. The
-- assessment save RPC writes these columns in its latest-score projection;
-- ensure they exist without changing historical scores or assessment records.
BEGIN;
ALTER TABLE public.screening_scores
  ADD COLUMN IF NOT EXISTS model_version text,
  ADD COLUMN IF NOT EXISTS prompt_version text;
COMMIT;
