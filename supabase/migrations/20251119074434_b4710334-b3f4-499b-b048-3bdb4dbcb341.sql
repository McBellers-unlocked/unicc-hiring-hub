-- Grant Directors the same rights as Hiring Managers plus Director-specific permissions

-- Allow Directors to create job requisitions (like Hiring Managers)
DROP POLICY IF EXISTS "Hiring managers can create requisitions" ON public.job_requisitions;
CREATE POLICY "Hiring managers and directors can create requisitions"
ON public.job_requisitions
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'Hiring Manager'::user_role)
  OR has_role(auth.uid(), 'Director'::user_role)
  OR has_role(auth.uid(), 'Admin'::user_role)
);

-- Allow Directors to manage interview panel members (like Hiring Managers)
DROP POLICY IF EXISTS "HR and Hiring Managers can manage interview panel members" ON public.job_interview_panel_members;
CREATE POLICY "HR, Hiring Managers and Directors can manage interview panel members"
ON public.job_interview_panel_members
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'Admin'::user_role)
  OR has_role(auth.uid(), 'HR Assistant'::user_role)
  OR has_role(auth.uid(), 'Chief of HR'::user_role)
  OR has_role(auth.uid(), 'Hiring Manager'::user_role)
  OR has_role(auth.uid(), 'Director'::user_role)
);

-- Allow Directors to manage interview questions (like Hiring Managers)
DROP POLICY IF EXISTS "HR and Hiring Managers can manage interview questions" ON public.job_interview_questions;
CREATE POLICY "HR, Hiring Managers and Directors can manage interview questions"
ON public.job_interview_questions
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'Admin'::user_role)
  OR has_role(auth.uid(), 'HR Assistant'::user_role)
  OR has_role(auth.uid(), 'Chief of HR'::user_role)
  OR has_role(auth.uid(), 'Hiring Manager'::user_role)
  OR has_role(auth.uid(), 'Director'::user_role)
);

-- Allow Directors to view interview questions (like Hiring Managers)
DROP POLICY IF EXISTS "Staff can view interview questions" ON public.job_interview_questions;
CREATE POLICY "Staff can view interview questions"
ON public.job_interview_questions
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'Admin'::user_role)
  OR has_role(auth.uid(), 'HR Assistant'::user_role)
  OR has_role(auth.uid(), 'Chief of HR'::user_role)
  OR has_role(auth.uid(), 'Hiring Manager'::user_role)
  OR has_role(auth.uid(), 'Panel Member'::user_role)
  OR has_role(auth.uid(), 'Director'::user_role)
);

-- Allow Directors to manage external panel members (like Hiring Managers)
DROP POLICY IF EXISTS "Staff can manage external panel members" ON public.external_panel_members;
CREATE POLICY "Staff can manage external panel members"
ON public.external_panel_members
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'Admin'::user_role)
  OR has_role(auth.uid(), 'HR Assistant'::user_role)
  OR has_role(auth.uid(), 'Chief of HR'::user_role)
  OR has_role(auth.uid(), 'Hiring Manager'::user_role)
  OR has_role(auth.uid(), 'Director'::user_role)
);

-- Allow Directors to manage question competencies (like Hiring Managers)
DROP POLICY IF EXISTS "HR and Hiring Managers can manage question competencies" ON public.job_interview_question_competencies;
CREATE POLICY "HR, Hiring Managers and Directors can manage question competencies"
ON public.job_interview_question_competencies
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'Admin'::user_role)
  OR has_role(auth.uid(), 'HR Assistant'::user_role)
  OR has_role(auth.uid(), 'Chief of HR'::user_role)
  OR has_role(auth.uid(), 'Hiring Manager'::user_role)
  OR has_role(auth.uid(), 'Director'::user_role)
);

-- Allow Directors to view question competencies
DROP POLICY IF EXISTS "Staff can view question competencies" ON public.job_interview_question_competencies;
CREATE POLICY "Staff can view question competencies"
ON public.job_interview_question_competencies
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'Admin'::user_role)
  OR has_role(auth.uid(), 'HR Assistant'::user_role)
  OR has_role(auth.uid(), 'Chief of HR'::user_role)
  OR has_role(auth.uid(), 'Hiring Manager'::user_role)
  OR has_role(auth.uid(), 'Panel Member'::user_role)
  OR has_role(auth.uid(), 'Director'::user_role)
);

-- Allow Directors to manage question requirements (like Hiring Managers)
DROP POLICY IF EXISTS "HR and Hiring Managers can manage question requirements" ON public.job_interview_question_requirements;
CREATE POLICY "HR, Hiring Managers and Directors can manage question requirements"
ON public.job_interview_question_requirements
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'Admin'::user_role)
  OR has_role(auth.uid(), 'HR Assistant'::user_role)
  OR has_role(auth.uid(), 'Chief of HR'::user_role)
  OR has_role(auth.uid(), 'Hiring Manager'::user_role)
  OR has_role(auth.uid(), 'Director'::user_role)
);

-- Allow Directors to view question requirements
DROP POLICY IF EXISTS "Staff can view question requirements" ON public.job_interview_question_requirements;
CREATE POLICY "Staff can view question requirements"
ON public.job_interview_question_requirements
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'Admin'::user_role)
  OR has_role(auth.uid(), 'HR Assistant'::user_role)
  OR has_role(auth.uid(), 'Chief of HR'::user_role)
  OR has_role(auth.uid(), 'Hiring Manager'::user_role)
  OR has_role(auth.uid(), 'Panel Member'::user_role)
  OR has_role(auth.uid(), 'Director'::user_role)
);
