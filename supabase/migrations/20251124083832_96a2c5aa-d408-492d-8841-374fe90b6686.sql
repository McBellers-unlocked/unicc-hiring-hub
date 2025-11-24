-- Drop the existing policy
DROP POLICY IF EXISTS "Hiring managers and directors can create requisitions" ON public.job_requisitions;

-- Create updated policy that includes HR roles
CREATE POLICY "Hiring managers, directors and HR can create requisitions"
ON public.job_requisitions
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'Hiring Manager'::user_role) 
  OR has_role(auth.uid(), 'Director'::user_role) 
  OR has_role(auth.uid(), 'Admin'::user_role)
  OR has_role(auth.uid(), 'HR Assistant'::user_role)
  OR has_role(auth.uid(), 'Chief of HR'::user_role)
);