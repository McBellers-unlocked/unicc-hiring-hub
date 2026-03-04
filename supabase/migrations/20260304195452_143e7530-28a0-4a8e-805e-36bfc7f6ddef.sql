
-- Drop overly broad SELECT policy on video_answers
DROP POLICY IF EXISTS "Staff can view video answers" ON public.video_answers;

-- Drop overly permissive INSERT policy
DROP POLICY IF EXISTS "Anyone can create video answers" ON public.video_answers;

-- Recreate SELECT: Admin/HR can view all; Hiring Managers and Panel Members can only view
-- video answers for applications belonging to jobs they are panel members on
CREATE POLICY "Staff can view video answers"
ON public.video_answers
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
      AND users.role IN ('Admin'::user_role, 'HR Assistant'::user_role, 'Chief of HR'::user_role)
  )
  OR EXISTS (
    SELECT 1
    FROM applications a
    JOIN job_interview_panel_members pm ON pm.job_id = a.job_id
    WHERE a.id = video_answers.application_id
      AND pm.user_id = auth.uid()
  )
);

-- Candidates can view their own video answers
CREATE POLICY "Candidates can view own video answers"
ON public.video_answers
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM applications a
    JOIN candidates c ON c.id = a.candidate_id
    WHERE a.id = video_answers.application_id
      AND c.email = (auth.jwt() ->> 'email'::text)
  )
);

-- Restrict INSERT to authenticated users only (service role handles edge function inserts)
CREATE POLICY "Authenticated users can create video answers"
ON public.video_answers
FOR INSERT
TO authenticated
WITH CHECK (true);
