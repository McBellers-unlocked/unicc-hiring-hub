-- Drop the vulnerable policy that allows unauthenticated access to available slots
DROP POLICY IF EXISTS "Candidates can view available slots" ON public.panel_interview_time_slots;

-- Recreate: candidates can only view available slots if they have a pending invitation for that job
CREATE POLICY "Candidates can view available slots"
ON public.panel_interview_time_slots
FOR SELECT
TO authenticated
USING (
  status = 'available'
  AND EXISTS (
    SELECT 1
    FROM panel_interview_invitations pii
    JOIN applications a ON a.id = pii.application_id
    JOIN candidates c ON c.id = a.candidate_id
    WHERE pii.job_id = panel_interview_time_slots.job_id
      AND pii.status = 'pending'
      AND c.email = (auth.jwt() ->> 'email'::text)
  )
);