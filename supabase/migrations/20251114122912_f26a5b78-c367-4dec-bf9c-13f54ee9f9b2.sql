-- Fix the incorrect RLS policy for panel_interviews
-- The bug is that it references panel_interview_participants.id instead of panel_interviews.id

DROP POLICY IF EXISTS "Panelists can view their interviews" ON panel_interviews;

CREATE POLICY "Panelists can view their interviews"
  ON panel_interviews
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM panel_interview_participants
      WHERE panel_interview_participants.panel_interview_id = panel_interviews.id
        AND panel_interview_participants.panelist_id = auth.uid()
    )
  );
