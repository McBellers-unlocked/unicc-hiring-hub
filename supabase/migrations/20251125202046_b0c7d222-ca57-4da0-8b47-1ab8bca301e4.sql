-- Add RLS policy to allow candidates to view time slots linked to their invitations
CREATE POLICY "Candidates can view their booked slots via invitation"
ON panel_interview_time_slots
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM panel_interview_invitations pii
    JOIN applications a ON a.id = pii.application_id
    JOIN candidates c ON c.id = a.candidate_id
    WHERE pii.booked_slot_id = panel_interview_time_slots.id
    AND c.email = (auth.jwt() ->> 'email'::text)
  )
);