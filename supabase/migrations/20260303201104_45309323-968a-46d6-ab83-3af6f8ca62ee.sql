
-- Enum for reviewer decisions
CREATE TYPE public.scoring_review_decision AS ENUM ('agree', 'disagree', 'needs_review');

-- Cached decompositions (one per job criterion)
CREATE TABLE public.criterion_decompositions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  criterion_id text NOT NULL,
  criterion_text text NOT NULL,
  subrequirements jsonb NOT NULL,
  recombine_logic text NOT NULL DEFAULT 'S1',
  created_at timestamptz DEFAULT now(),
  UNIQUE(job_id, criterion_id)
);

-- Human review feedback
CREATE TABLE public.scoring_review_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid REFERENCES public.applications(id) ON DELETE CASCADE NOT NULL,
  criterion_id text NOT NULL,
  ai_demonstrated boolean NOT NULL,
  ai_confidence float NOT NULL,
  ai_evidence jsonb,
  ai_verified boolean,
  criterion_text text,
  criterion_version text,
  reviewer_decision public.scoring_review_decision NOT NULL,
  reviewer_id uuid REFERENCES public.users(id) NOT NULL,
  reviewer_comment text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(application_id, criterion_id, reviewer_id)
);

-- Indexes for scoring_review_feedback
CREATE INDEX idx_review_feedback_app ON public.scoring_review_feedback(application_id);
CREATE INDEX idx_review_feedback_app_criterion ON public.scoring_review_feedback(application_id, criterion_id);

-- Add pipeline_version to screening_scores
ALTER TABLE public.screening_scores ADD COLUMN IF NOT EXISTS pipeline_version text DEFAULT '3.0';

-- Drop the existing unique constraint on application_id (isOneToOne)
ALTER TABLE public.screening_scores DROP CONSTRAINT IF EXISTS screening_scores_application_id_key;

-- Add new unique constraint for idempotent upserts by app + pipeline version
ALTER TABLE public.screening_scores ADD CONSTRAINT screening_scores_app_version_unique 
  UNIQUE(application_id, pipeline_version);

-- Enable RLS on new tables
ALTER TABLE public.criterion_decompositions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scoring_review_feedback ENABLE ROW LEVEL SECURITY;

-- RLS policies for criterion_decompositions (read-only for authenticated users)
CREATE POLICY "Authenticated users can read decompositions"
  ON public.criterion_decompositions FOR SELECT
  TO authenticated USING (true);

-- RLS policies for scoring_review_feedback
CREATE POLICY "Authenticated users can read review feedback"
  ON public.scoring_review_feedback FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert review feedback"
  ON public.scoring_review_feedback FOR INSERT
  TO authenticated WITH CHECK (reviewer_id = auth.uid());

CREATE POLICY "Reviewers can update own feedback"
  ON public.scoring_review_feedback FOR UPDATE
  TO authenticated USING (reviewer_id = auth.uid());

-- Auto-update updated_at trigger for scoring_review_feedback
CREATE OR REPLACE FUNCTION public.update_scoring_review_feedback_updated_at()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_scoring_review_feedback_updated_at
  BEFORE UPDATE ON public.scoring_review_feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.update_scoring_review_feedback_updated_at();
