-- Drop the overly broad public SELECT policies
DROP POLICY IF EXISTS "Everyone can view active jobs" ON public.jobs;
DROP POLICY IF EXISTS "Public jobs visible to everyone" ON public.jobs;
DROP POLICY IF EXISTS "Internal jobs visible to UNICC staff" ON public.jobs;

-- 1. Public/anonymous: only active, non-internal jobs
CREATE POLICY "Public can view active non-internal jobs"
ON public.jobs
FOR SELECT
USING (
  status = 'active'
  AND (internal_only = false OR internal_only IS NULL)
);

-- 2. UNICC staff can also see active internal jobs
CREATE POLICY "UNICC staff can view active internal jobs"
ON public.jobs
FOR SELECT
TO authenticated
USING (
  status = 'active'
  AND internal_only = true
  AND (auth.jwt() ->> 'email') LIKE '%@unicc.org'
);

-- Note: "Staff can view all jobs" and "Admin, HR and Director can manage jobs" remain unchanged
-- They already properly scope access for HR/Admin/Panel/Hiring Manager roles