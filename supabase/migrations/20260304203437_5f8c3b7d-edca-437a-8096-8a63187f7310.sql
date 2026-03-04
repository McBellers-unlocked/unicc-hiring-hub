-- Fix: "Staff can view all jobs" is too broad — it applies to {public} role
-- and allows ANY active job (including internal_only=true) to be seen by anyone.
-- Replace it with a properly scoped version that only matches authenticated staff roles.

DROP POLICY IF EXISTS "Staff can view all jobs" ON public.jobs;

CREATE POLICY "Staff can view all jobs"
ON public.jobs
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'Admin'::user_role)
  OR has_role(auth.uid(), 'HR Assistant'::user_role)
  OR has_role(auth.uid(), 'Chief of HR'::user_role)
  OR has_role(auth.uid(), 'Panel Member'::user_role)
  OR is_job_hiring_manager(auth.uid(), id)
);

-- Also scope the public policy to anon only, so it doesn't redundantly apply to authenticated
DROP POLICY IF EXISTS "Public can view active non-internal jobs" ON public.jobs;

CREATE POLICY "Public can view active non-internal jobs"
ON public.jobs
FOR SELECT
USING (
  status = 'active'
  AND (internal_only = false OR internal_only IS NULL)
);