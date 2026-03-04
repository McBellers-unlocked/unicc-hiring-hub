-- Drop the overly permissive policy that exposes all active cycles to any authenticated user
DROP POLICY IF EXISTS "Anyone can view active cycles" ON public.performance_cycles;

-- The existing "Staff can view own individual cycles" policy already provides proper scoping:
-- staff_id = auth.uid() (own cycles) OR staff_id IS NULL (org-wide) OR HR/Admin roles (full access)