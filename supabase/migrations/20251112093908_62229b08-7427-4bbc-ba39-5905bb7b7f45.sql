-- Update RLS policy on job_requisitions to include Chief of HR
DROP POLICY IF EXISTS "Staff can view requisitions" ON public.job_requisitions;
CREATE POLICY "Staff can view requisitions"
ON public.job_requisitions
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'Admin'::user_role) OR 
  has_role(auth.uid(), 'HR Assistant'::user_role) OR 
  has_role(auth.uid(), 'Hiring Manager'::user_role) OR
  has_role(auth.uid(), 'Chief of HR'::user_role)
);

DROP POLICY IF EXISTS "Creators and approvers can update" ON public.job_requisitions;
CREATE POLICY "Creators and approvers can update"
ON public.job_requisitions
FOR UPDATE
TO authenticated
USING (
  created_by = auth.uid() OR 
  has_role(auth.uid(), 'Admin'::user_role) OR 
  has_role(auth.uid(), 'HR Assistant'::user_role) OR
  has_role(auth.uid(), 'Chief of HR'::user_role)
);