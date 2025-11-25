-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Candidates can book slots" ON panel_interview_time_slots;

-- Create a corrected policy with simpler WITH CHECK
-- The USING clause already validates authorization, so WITH CHECK can be simplified
CREATE POLICY "Candidates can book slots" ON panel_interview_time_slots
FOR UPDATE 
USING (
  status = 'available' 
  AND EXISTS (
    SELECT 1 FROM panel_interview_invitations pii
    JOIN applications a ON a.id = pii.application_id
    JOIN candidates c ON c.id = a.candidate_id
    WHERE pii.job_id = panel_interview_time_slots.job_id
    AND pii.status = 'pending'
    AND c.email = (auth.jwt() ->> 'email')
  )
)
WITH CHECK (true);