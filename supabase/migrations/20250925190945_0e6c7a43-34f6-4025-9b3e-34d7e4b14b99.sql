-- Create a table to manage job-specific hiring manager assignments
CREATE TABLE public.job_hiring_managers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(job_id, user_id)
);

-- Enable RLS
ALTER TABLE public.job_hiring_managers ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admin and HR can manage job hiring managers" 
ON public.job_hiring_managers 
FOR ALL 
USING (has_role(auth.uid(), 'Admin'::user_role) OR has_role(auth.uid(), 'HR Assistant'::user_role));

CREATE POLICY "Staff can view job hiring managers" 
ON public.job_hiring_managers 
FOR SELECT 
USING (has_role(auth.uid(), 'Admin'::user_role) OR has_role(auth.uid(), 'HR Assistant'::user_role) OR has_role(auth.uid(), 'Hiring Manager'::user_role) OR has_role(auth.uid(), 'Panel Member'::user_role));

-- Add trigger for audit logging
CREATE TRIGGER audit_job_hiring_managers
  AFTER INSERT OR UPDATE OR DELETE ON public.job_hiring_managers
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- First, let's find the Associate Policy (Legal) Officer job and the users
-- Get the job ID for Associate Policy (Legal) Officer
WITH target_job AS (
  SELECT id FROM public.jobs 
  WHERE title ILIKE '%Associate Policy (Legal) Officer%' 
  LIMIT 1
),
target_users AS (
  SELECT id, email FROM public.users 
  WHERE email IN ('petkov@unicc.org', 'garciaz@unicc.org')
)
-- Insert the job-specific hiring manager assignments
INSERT INTO public.job_hiring_managers (job_id, user_id, created_by)
SELECT 
  target_job.id,
  target_users.id,
  (SELECT id FROM public.users WHERE email = 'petkov@unicc.org' LIMIT 1) -- Use one of them as creator
FROM target_job, target_users;