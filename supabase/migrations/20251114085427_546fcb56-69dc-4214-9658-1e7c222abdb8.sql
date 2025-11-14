-- Create panel interview time slots table
CREATE TABLE IF NOT EXISTS public.panel_interview_time_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  panel_member_ids UUID[] NOT NULL,
  slot_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'booked')),
  booked_by_application_id UUID REFERENCES public.applications(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  created_by UUID REFERENCES public.users(id)
);

-- Create index for faster job lookups
CREATE INDEX idx_panel_slots_job_id ON public.panel_interview_time_slots(job_id);
CREATE INDEX idx_panel_slots_status ON public.panel_interview_time_slots(status);

-- Enable RLS
ALTER TABLE public.panel_interview_time_slots ENABLE ROW LEVEL SECURITY;

-- Staff can manage interview slots
CREATE POLICY "Staff can manage interview slots"
ON public.panel_interview_time_slots
FOR ALL
USING (
  has_role(auth.uid(), 'Admin'::user_role) OR 
  has_role(auth.uid(), 'HR Assistant'::user_role) OR 
  has_role(auth.uid(), 'Chief of HR'::user_role) OR 
  has_role(auth.uid(), 'Hiring Manager'::user_role)
);

-- Candidates can view available slots for active jobs
CREATE POLICY "Candidates can view available slots"
ON public.panel_interview_time_slots
FOR SELECT
USING (
  status = 'available' AND
  EXISTS (
    SELECT 1 FROM public.jobs 
    WHERE jobs.id = panel_interview_time_slots.job_id 
    AND jobs.status = 'active'
  )
);

-- Candidates can book available slots
CREATE POLICY "Candidates can book slots"
ON public.panel_interview_time_slots
FOR UPDATE
USING (status = 'available')
WITH CHECK (status IN ('reserved', 'booked'));

-- Add updated_at trigger
CREATE TRIGGER update_panel_slots_updated_at
  BEFORE UPDATE ON public.panel_interview_time_slots
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();