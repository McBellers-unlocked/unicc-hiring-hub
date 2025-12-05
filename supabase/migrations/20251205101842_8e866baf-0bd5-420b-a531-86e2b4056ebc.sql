-- Create table for saving internal talent searches
CREATE TABLE public.internal_talent_saved_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  filters jsonb NOT NULL DEFAULT '{}',
  is_shared boolean DEFAULT false,
  created_by uuid NOT NULL REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.internal_talent_saved_searches ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Staff can view their own and shared searches"
  ON public.internal_talent_saved_searches
  FOR SELECT
  USING (
    created_by = auth.uid() 
    OR is_shared = true
    OR has_role(auth.uid(), 'Admin'::user_role)
    OR has_role(auth.uid(), 'HR Assistant'::user_role)
    OR has_role(auth.uid(), 'Chief of HR'::user_role)
  );

CREATE POLICY "Staff can create saved searches"
  ON public.internal_talent_saved_searches
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'Admin'::user_role)
    OR has_role(auth.uid(), 'HR Assistant'::user_role)
    OR has_role(auth.uid(), 'Chief of HR'::user_role)
    OR has_role(auth.uid(), 'Hiring Manager'::user_role)
    OR has_role(auth.uid(), 'Director'::user_role)
  );

CREATE POLICY "Users can update their own searches"
  ON public.internal_talent_saved_searches
  FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own searches"
  ON public.internal_talent_saved_searches
  FOR DELETE
  USING (created_by = auth.uid());

-- Create trigger for updated_at
CREATE TRIGGER update_internal_talent_saved_searches_updated_at
  BEFORE UPDATE ON public.internal_talent_saved_searches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();