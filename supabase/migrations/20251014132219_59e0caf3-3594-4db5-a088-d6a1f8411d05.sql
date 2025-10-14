-- Create candidate notes table for private HR notes
CREATE TABLE IF NOT EXISTS public.candidate_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES public.candidates(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES public.users(id) NOT NULL,
  note TEXT NOT NULL,
  is_private BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create candidate flags table
CREATE TABLE IF NOT EXISTS public.candidate_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES public.candidates(id) ON DELETE CASCADE NOT NULL,
  flagged_by UUID REFERENCES public.users(id) NOT NULL,
  flag_type TEXT NOT NULL, -- 'high_potential', 'future_opportunity', 'roster', etc.
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create talent pool searches table for saved searches
CREATE TABLE IF NOT EXISTS public.talent_pool_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES public.users(id) NOT NULL,
  name TEXT NOT NULL,
  search_criteria JSONB NOT NULL DEFAULT '{}',
  is_shared BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.candidate_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.talent_pool_searches ENABLE ROW LEVEL SECURITY;

-- RLS Policies for candidate_notes
CREATE POLICY "Admin and HR can view all candidate notes"
ON public.candidate_notes FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'Admin'::user_role) OR has_role(auth.uid(), 'HR Assistant'::user_role));

CREATE POLICY "Admin and HR can create candidate notes"
ON public.candidate_notes FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'Admin'::user_role) OR has_role(auth.uid(), 'HR Assistant'::user_role));

CREATE POLICY "Admin and HR can update their own notes"
ON public.candidate_notes FOR UPDATE
TO authenticated
USING (created_by = auth.uid() AND (has_role(auth.uid(), 'Admin'::user_role) OR has_role(auth.uid(), 'HR Assistant'::user_role)));

CREATE POLICY "Admin and HR can delete their own notes"
ON public.candidate_notes FOR DELETE
TO authenticated
USING (created_by = auth.uid() AND (has_role(auth.uid(), 'Admin'::user_role) OR has_role(auth.uid(), 'HR Assistant'::user_role)));

-- RLS Policies for candidate_flags
CREATE POLICY "Admin and HR can view all candidate flags"
ON public.candidate_flags FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'Admin'::user_role) OR has_role(auth.uid(), 'HR Assistant'::user_role));

CREATE POLICY "Admin and HR can create candidate flags"
ON public.candidate_flags FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'Admin'::user_role) OR has_role(auth.uid(), 'HR Assistant'::user_role));

CREATE POLICY "Admin and HR can delete candidate flags"
ON public.candidate_flags FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'Admin'::user_role) OR has_role(auth.uid(), 'HR Assistant'::user_role));

-- RLS Policies for talent_pool_searches
CREATE POLICY "Users can view their own searches and shared searches"
ON public.talent_pool_searches FOR SELECT
TO authenticated
USING (created_by = auth.uid() OR is_shared = true);

CREATE POLICY "Admin and HR can create saved searches"
ON public.talent_pool_searches FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'Admin'::user_role) OR has_role(auth.uid(), 'HR Assistant'::user_role));

CREATE POLICY "Users can update their own searches"
ON public.talent_pool_searches FOR UPDATE
TO authenticated
USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own searches"
ON public.talent_pool_searches FOR DELETE
TO authenticated
USING (created_by = auth.uid());

-- Create indexes for search performance
CREATE INDEX IF NOT EXISTS idx_candidates_name ON public.candidates(name);
CREATE INDEX IF NOT EXISTS idx_candidates_location ON public.candidates(location);
CREATE INDEX IF NOT EXISTS idx_candidates_years_exp ON public.candidates(years_of_experience);
CREATE INDEX IF NOT EXISTS idx_candidates_skills ON public.candidates USING GIN(skills);
CREATE INDEX IF NOT EXISTS idx_candidates_work_exp ON public.candidates USING GIN(work_experience);
CREATE INDEX IF NOT EXISTS idx_candidates_languages ON public.candidates USING GIN(languages);
CREATE INDEX IF NOT EXISTS idx_candidates_current_position ON public.candidates(current_position);
CREATE INDEX IF NOT EXISTS idx_candidates_email ON public.candidates(email);
CREATE INDEX IF NOT EXISTS idx_candidates_updated_at ON public.candidates(updated_at DESC);

-- Create indexes for new tables
CREATE INDEX IF NOT EXISTS idx_candidate_notes_candidate ON public.candidate_notes(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_flags_candidate ON public.candidate_flags(candidate_id);
CREATE INDEX IF NOT EXISTS idx_talent_searches_creator ON public.talent_pool_searches(created_by);

-- Create triggers for updated_at
CREATE TRIGGER update_candidate_notes_updated_at
BEFORE UPDATE ON public.candidate_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_talent_pool_searches_updated_at
BEFORE UPDATE ON public.talent_pool_searches
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();