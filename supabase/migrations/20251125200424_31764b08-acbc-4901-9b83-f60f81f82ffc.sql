-- Allow candidates to view their own booked interview slots
CREATE POLICY "Candidates can view booked slots"
ON public.panel_interview_time_slots
FOR SELECT
USING (
  status = 'booked'::text
  AND EXISTS (
    SELECT 1
    FROM public.applications a
    JOIN public.candidates c ON c.id = a.candidate_id
    WHERE a.id = panel_interview_time_slots.booked_by_application_id
      AND c.email = auth.jwt()->>'email'
  )
);