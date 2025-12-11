-- Enable trigram extension first
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create WHED universities table for automatic education verification
CREATE TABLE public.whed_universities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  alternative_names text[] DEFAULT '{}',
  country text NOT NULL,
  country_code text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for efficient searching
CREATE INDEX idx_whed_universities_name ON public.whed_universities USING btree (lower(name));
CREATE INDEX idx_whed_universities_country ON public.whed_universities USING btree (country);
CREATE INDEX idx_whed_universities_name_trgm ON public.whed_universities USING gin (name gin_trgm_ops);

-- Enable RLS
ALTER TABLE public.whed_universities ENABLE ROW LEVEL SECURITY;

-- Everyone can read universities (needed for verification)
CREATE POLICY "Anyone can view WHED universities"
ON public.whed_universities
FOR SELECT
USING (true);

-- Only admins can manage
CREATE POLICY "Admin can manage WHED universities"
ON public.whed_universities
FOR ALL
USING (has_role(auth.uid(), 'Admin'::user_role));

-- Create function to search universities with fuzzy matching
CREATE OR REPLACE FUNCTION public.search_whed_universities(search_term text, max_results int DEFAULT 10)
RETURNS TABLE (
  id uuid,
  name text,
  alternative_names text[],
  country text,
  similarity_score real
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    u.id,
    u.name,
    u.alternative_names,
    u.country,
    GREATEST(
      similarity(lower(u.name), lower(search_term)),
      COALESCE((
        SELECT MAX(similarity(lower(alt), lower(search_term)))
        FROM unnest(u.alternative_names) AS alt
      ), 0)
    ) AS similarity_score
  FROM whed_universities u
  WHERE u.is_active = true
    AND (
      lower(u.name) ILIKE '%' || lower(search_term) || '%'
      OR EXISTS (
        SELECT 1 FROM unnest(u.alternative_names) AS alt
        WHERE lower(alt) ILIKE '%' || lower(search_term) || '%'
      )
      OR similarity(lower(u.name), lower(search_term)) > 0.3
    )
  ORDER BY similarity_score DESC, u.name
  LIMIT max_results;
$$;