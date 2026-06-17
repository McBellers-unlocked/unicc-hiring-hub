-- Scoring pipeline: model/prompt version stamping + per-sub verdict cache

ALTER TABLE public.screening_scores
  ADD COLUMN IF NOT EXISTS model_version text,
  ADD COLUMN IF NOT EXISTS prompt_version text;

ALTER TABLE public.criterion_decompositions
  ADD COLUMN IF NOT EXISTS decomposition_version text NOT NULL DEFAULT '1',
  ADD COLUMN IF NOT EXISTS model_version text;

CREATE TABLE IF NOT EXISTS public.subrequirement_verdicts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid REFERENCES public.applications(id) ON DELETE CASCADE NOT NULL,
  criterion_id text NOT NULL,
  sub_id text NOT NULL,
  decomposition_version text NOT NULL,
  phf_hash text NOT NULL,
  demonstrated boolean NOT NULL,
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  missing text,
  confidence double precision NOT NULL,
  model_version text,
  prompt_version text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (application_id, criterion_id, sub_id, decomposition_version, phf_hash)
);

CREATE INDEX IF NOT EXISTS idx_subreq_verdicts_app
  ON public.subrequirement_verdicts(application_id);
CREATE INDEX IF NOT EXISTS idx_subreq_verdicts_lookup
  ON public.subrequirement_verdicts(application_id, criterion_id, decomposition_version, phf_hash);

GRANT SELECT ON public.subrequirement_verdicts TO authenticated;
GRANT ALL    ON public.subrequirement_verdicts TO service_role;

ALTER TABLE public.subrequirement_verdicts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read subrequirement verdicts"
  ON public.subrequirement_verdicts FOR SELECT
  TO authenticated USING (true);
