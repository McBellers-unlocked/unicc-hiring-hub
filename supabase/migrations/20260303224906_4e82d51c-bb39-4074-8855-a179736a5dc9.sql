
-- ============================================================
-- Talent Pool AI Matching: Tables, Indexes, Functions, RLS
-- ============================================================

-- 1. Enable pg_trgm extensions (already available but ensure GIN support)
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;

-- 2. job_match_profiles — cached normalized job profiles for matching
CREATE TABLE public.job_match_profiles (
  job_id uuid PRIMARY KEY REFERENCES public.jobs(id) ON DELETE CASCADE,
  match_profile_text text NOT NULL,
  match_profile_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. talent_candidate_embeddings — cached normalized candidate profiles
CREATE TABLE public.talent_candidate_embeddings (
  candidate_id uuid PRIMARY KEY REFERENCES public.candidates(id) ON DELETE CASCADE,
  profile_text text NOT NULL,
  normalized_skills text[] NOT NULL DEFAULT '{}',
  normalized_roles text[] NOT NULL DEFAULT '{}',
  domain_keywords text[] NOT NULL DEFAULT '{}',
  completeness_score float NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. talent_match_runs — each recruiter search session
CREATE TABLE public.talent_match_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  requested_by uuid REFERENCES public.users(id),
  filters jsonb,
  status text NOT NULL DEFAULT 'pending',
  total_candidates int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5. talent_match_results — ranked results per run
CREATE TABLE public.talent_match_results (
  run_id uuid NOT NULL REFERENCES public.talent_match_runs(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  text_similarity float,
  match_score float NOT NULL,
  confidence text NOT NULL CHECK (confidence IN ('low', 'medium', 'high')),
  tier text NOT NULL CHECK (tier IN ('strong', 'good', 'possible', 'low')),
  reasons jsonb NOT NULL DEFAULT '[]',
  gaps jsonb,
  rank int,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (run_id, candidate_id)
);

-- 6. Indexes
CREATE INDEX idx_talent_candidate_embeddings_skills ON public.talent_candidate_embeddings USING GIN (normalized_skills);
CREATE INDEX idx_talent_candidate_embeddings_profile_text ON public.talent_candidate_embeddings USING GIN (profile_text gin_trgm_ops);
CREATE INDEX idx_talent_match_results_run_id ON public.talent_match_results (run_id);
CREATE INDEX idx_talent_match_runs_job_id ON public.talent_match_runs (job_id);
CREATE INDEX idx_job_match_profiles_text ON public.job_match_profiles USING GIN (match_profile_text gin_trgm_ops);

-- 7. Full-text search function using pg_trgm + array overlap
CREATE OR REPLACE FUNCTION public.match_candidates_by_text(
  query_text text,
  query_skills text[] DEFAULT '{}',
  match_count int DEFAULT 200,
  similarity_threshold float DEFAULT 0.05
)
RETURNS TABLE(candidate_id uuid, similarity float, completeness_score float)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    tce.candidate_id,
    GREATEST(
      similarity(tce.profile_text, query_text),
      CASE WHEN array_length(query_skills, 1) > 0 AND array_length(tce.normalized_skills, 1) > 0
        THEN (
          SELECT COUNT(*)::float / GREATEST(array_length(query_skills, 1), 1)
          FROM unnest(query_skills) qs
          WHERE EXISTS (
            SELECT 1 FROM unnest(tce.normalized_skills) ns
            WHERE similarity(ns, qs) > 0.4
          )
        )
        ELSE 0
      END
    )::float AS similarity,
    tce.completeness_score
  FROM public.talent_candidate_embeddings tce
  WHERE similarity(tce.profile_text, query_text) > similarity_threshold
     OR (array_length(query_skills, 1) > 0 AND tce.normalized_skills && query_skills)
  ORDER BY similarity DESC
  LIMIT match_count;
$$;

-- 8. RLS Policies
ALTER TABLE public.job_match_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.talent_candidate_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.talent_match_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.talent_match_results ENABLE ROW LEVEL SECURITY;

-- Read access for HR roles
CREATE POLICY "HR roles can read job match profiles"
  ON public.job_match_profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('Admin', 'HR Assistant', 'Chief of HR', 'Hiring Manager', 'Director')
    )
  );

CREATE POLICY "HR roles can read candidate embeddings"
  ON public.talent_candidate_embeddings FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('Admin', 'HR Assistant', 'Chief of HR', 'Hiring Manager', 'Director')
    )
  );

CREATE POLICY "HR roles can read match runs"
  ON public.talent_match_runs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('Admin', 'HR Assistant', 'Chief of HR', 'Hiring Manager', 'Director')
    )
  );

CREATE POLICY "HR roles can read match results"
  ON public.talent_match_results FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('Admin', 'HR Assistant', 'Chief of HR', 'Hiring Manager', 'Director')
    )
  );

-- Service role write access (edge functions use service role key)
-- No INSERT/UPDATE policies needed for authenticated users since edge functions use service role
