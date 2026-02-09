
-- Create procurement_tors table
CREATE TABLE public.procurement_tors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  division TEXT,
  unit TEXT,
  requested_by UUID NOT NULL REFERENCES public.users(id),
  background TEXT,
  required_profile TEXT,
  scope_of_work TEXT,
  required_technical_skills TEXT,
  desired_technical_skills TEXT,
  required_soft_skills TEXT,
  desirable_certifications TEXT,
  duty_station TEXT,
  on_call_requirement TEXT,
  estimated_duration TEXT,
  estimated_start_date DATE,
  funding_status TEXT,
  funding_comments TEXT,
  additional_comments TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  slug TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.procurement_tors ENABLE ROW LEVEL SECURITY;

-- Users can read their own TORs
CREATE POLICY "Users can read own TORs"
ON public.procurement_tors FOR SELECT
USING (requested_by = auth.uid());

-- Admin/HR Assistant can read all TORs
CREATE POLICY "Admin and HR can read all TORs"
ON public.procurement_tors FOR SELECT
USING (
  public.has_role(auth.uid(), 'Admin'::user_role)
  OR public.has_role(auth.uid(), 'HR Assistant'::user_role)
);

-- Users can insert their own TORs
CREATE POLICY "Users can insert own TORs"
ON public.procurement_tors FOR INSERT
WITH CHECK (requested_by = auth.uid());

-- Users can update their own draft TORs
CREATE POLICY "Users can update own draft TORs"
ON public.procurement_tors FOR UPDATE
USING (requested_by = auth.uid() AND status = 'draft');

-- Admin can update any TOR
CREATE POLICY "Admin can update any TOR"
ON public.procurement_tors FOR UPDATE
USING (public.has_role(auth.uid(), 'Admin'::user_role));

-- Trigger for updated_at
CREATE TRIGGER update_procurement_tors_updated_at
BEFORE UPDATE ON public.procurement_tors
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Slug generation function
CREATE OR REPLACE FUNCTION public.generate_tor_slug(tor_title text, tor_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  base_slug := LOWER(REGEXP_REPLACE(COALESCE(tor_title, ''), '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := TRIM(BOTH '-' FROM base_slug);
  IF base_slug = '' OR base_slug IS NULL THEN
    base_slug := LEFT(tor_id::TEXT, 8);
  END IF;
  final_slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM procurement_tors WHERE slug = final_slug AND id != tor_id) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  RETURN final_slug;
END;
$$;
