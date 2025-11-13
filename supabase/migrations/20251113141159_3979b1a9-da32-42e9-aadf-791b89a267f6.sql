-- Create table for external panel members
CREATE TABLE IF NOT EXISTS public.external_panel_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  position TEXT NOT NULL,
  organization TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.external_panel_members ENABLE ROW LEVEL SECURITY;

-- Allow staff to manage external panel members
CREATE POLICY "Staff can manage external panel members"
ON public.external_panel_members
FOR ALL
USING (
  has_role(auth.uid(), 'Admin'::user_role) OR 
  has_role(auth.uid(), 'HR Assistant'::user_role) OR 
  has_role(auth.uid(), 'Chief of HR'::user_role) OR
  has_role(auth.uid(), 'Hiring Manager'::user_role)
);

-- Add external_panelist_id column to panel_interview_participants
ALTER TABLE public.panel_interview_participants 
ADD COLUMN IF NOT EXISTS external_panelist_id UUID REFERENCES public.external_panel_members(id) ON DELETE CASCADE;

-- Make panelist_id nullable since we now support external members
ALTER TABLE public.panel_interview_participants 
ALTER COLUMN panelist_id DROP NOT NULL;

-- Add check constraint to ensure either panelist_id or external_panelist_id is set
ALTER TABLE public.panel_interview_participants 
ADD CONSTRAINT panelist_type_check 
CHECK (
  (panelist_id IS NOT NULL AND external_panelist_id IS NULL) OR
  (panelist_id IS NULL AND external_panelist_id IS NOT NULL)
);