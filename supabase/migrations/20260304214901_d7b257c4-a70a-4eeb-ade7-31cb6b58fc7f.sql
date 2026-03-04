
-- Drop both conflicting SELECT policies
DROP POLICY IF EXISTS "Staff can view applications" ON public.applications;
DROP POLICY IF EXISTS "Allow select on applications for staff" ON public.applications;

-- Create single correctly-scoped SELECT policy
CREATE POLICY "Staff can view applications"
ON public.applications FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'Admin'::user_role)
  OR has_role(auth.uid(), 'HR Assistant'::user_role)
  OR has_role(auth.uid(), 'Chief of HR'::user_role)
  OR is_job_hiring_manager(auth.uid(), job_id)
  OR EXISTS (
    SELECT 1 FROM public.job_interview_panel_members pm
    WHERE pm.user_id = auth.uid() AND pm.job_id = applications.job_id
  )
);

-- Fix UPDATE policy: scope Hiring Manager to assigned jobs
DROP POLICY IF EXISTS "Allow update on applications for staff" ON public.applications;
CREATE POLICY "Allow update on applications for staff"
ON public.applications FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'Admin'::user_role)
  OR has_role(auth.uid(), 'HR Assistant'::user_role)
  OR has_role(auth.uid(), 'Chief of HR'::user_role)
  OR is_job_hiring_manager(auth.uid(), job_id)
);
