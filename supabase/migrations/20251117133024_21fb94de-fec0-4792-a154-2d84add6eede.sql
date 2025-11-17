-- Create table for interview panel reports
CREATE TABLE IF NOT EXISTS public.interview_panel_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  introduction TEXT,
  skills TEXT,
  competencies TEXT,
  recommendation TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(application_id)
);

-- Enable RLS
ALTER TABLE public.interview_panel_reports ENABLE ROW LEVEL SECURITY;

-- Policy for staff to view reports
CREATE POLICY "Staff can view interview panel reports"
  ON public.interview_panel_reports
  FOR SELECT
  USING (
    has_role(auth.uid(), 'Admin'::user_role) OR
    has_role(auth.uid(), 'HR Assistant'::user_role) OR
    has_role(auth.uid(), 'Chief of HR'::user_role) OR
    has_role(auth.uid(), 'Panel Member'::user_role) OR
    has_role(auth.uid(), 'Hiring Manager'::user_role)
  );

-- Policy for staff to create reports
CREATE POLICY "Staff can create interview panel reports"
  ON public.interview_panel_reports
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'Admin'::user_role) OR
    has_role(auth.uid(), 'HR Assistant'::user_role) OR
    has_role(auth.uid(), 'Chief of HR'::user_role) OR
    has_role(auth.uid(), 'Panel Member'::user_role)
  );

-- Policy for staff to update reports
CREATE POLICY "Staff can update interview panel reports"
  ON public.interview_panel_reports
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'Admin'::user_role) OR
    has_role(auth.uid(), 'HR Assistant'::user_role) OR
    has_role(auth.uid(), 'Chief of HR'::user_role) OR
    has_role(auth.uid(), 'Panel Member'::user_role)
  );

-- Create updated_at trigger
CREATE TRIGGER update_interview_panel_reports_updated_at
  BEFORE UPDATE ON public.interview_panel_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_interview_panel_reports_application_id ON public.interview_panel_reports(application_id);
CREATE INDEX idx_interview_panel_reports_job_id ON public.interview_panel_reports(job_id);