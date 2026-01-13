-- Drop existing policy
DROP POLICY IF EXISTS "Admin and HR can manage jobs" ON jobs;

-- Create updated policy that includes Director role for review committee approvals
CREATE POLICY "Admin, HR and Director can manage jobs"
  ON jobs
  FOR ALL
  USING (
    has_role(auth.uid(), 'Admin'::user_role) OR 
    has_role(auth.uid(), 'HR Assistant'::user_role) OR 
    has_role(auth.uid(), 'Chief of HR'::user_role) OR
    has_role(auth.uid(), 'Director'::user_role)
  );