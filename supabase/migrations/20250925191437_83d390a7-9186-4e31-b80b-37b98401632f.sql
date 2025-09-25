-- Update RLS policies for job-specific hiring manager access

-- Create a function to check if a user is a job-specific hiring manager
CREATE OR REPLACE FUNCTION public.is_job_hiring_manager(user_id UUID, job_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Admin and HR Assistant have access to all jobs
  IF has_role(user_id, 'Admin'::user_role) OR has_role(user_id, 'HR Assistant'::user_role) THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user is assigned as hiring manager for this specific job
  RETURN EXISTS (
    SELECT 1 FROM public.job_hiring_managers 
    WHERE job_hiring_managers.user_id = $1 AND job_hiring_managers.job_id = $2
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Update applications RLS policy for job-specific access
DROP POLICY IF EXISTS "Allow select on applications for staff" ON public.applications;
CREATE POLICY "Allow select on applications for staff" 
ON public.applications 
FOR SELECT 
USING (
  has_role(auth.uid(), 'Admin'::user_role) OR 
  has_role(auth.uid(), 'HR Assistant'::user_role) OR 
  has_role(auth.uid(), 'Panel Member'::user_role) OR
  is_job_hiring_manager(auth.uid(), job_id)
);

-- Update jobs RLS policy for job-specific access  
DROP POLICY IF EXISTS "Staff can view all jobs" ON public.jobs;
CREATE POLICY "Staff can view all jobs" 
ON public.jobs 
FOR SELECT 
USING (
  (status = 'active'::text) OR
  has_role(auth.uid(), 'Admin'::user_role) OR 
  has_role(auth.uid(), 'HR Assistant'::user_role) OR 
  has_role(auth.uid(), 'Panel Member'::user_role) OR
  is_job_hiring_manager(auth.uid(), id)
);