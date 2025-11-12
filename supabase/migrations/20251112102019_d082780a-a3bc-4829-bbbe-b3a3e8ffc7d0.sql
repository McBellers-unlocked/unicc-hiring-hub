-- Update RLS policies to include Chief of HR role

-- Applications table
DROP POLICY IF EXISTS "Allow select on applications for staff" ON public.applications;
CREATE POLICY "Allow select on applications for staff" ON public.applications
FOR SELECT USING (
  has_role(auth.uid(), 'Admin'::user_role) OR 
  has_role(auth.uid(), 'HR Assistant'::user_role) OR 
  has_role(auth.uid(), 'Chief of HR'::user_role) OR
  has_role(auth.uid(), 'Panel Member'::user_role) OR 
  is_job_hiring_manager(auth.uid(), job_id)
);

DROP POLICY IF EXISTS "Staff can view applications" ON public.applications;
CREATE POLICY "Staff can view applications" ON public.applications
FOR SELECT USING (
  has_role(auth.uid(), 'Admin'::user_role) OR 
  has_role(auth.uid(), 'HR Assistant'::user_role) OR 
  has_role(auth.uid(), 'Chief of HR'::user_role) OR
  has_role(auth.uid(), 'Hiring Manager'::user_role) OR 
  has_role(auth.uid(), 'Panel Member'::user_role)
);

DROP POLICY IF EXISTS "Allow update on applications for staff" ON public.applications;
CREATE POLICY "Allow update on applications for staff" ON public.applications
FOR UPDATE USING (
  has_role(auth.uid(), 'Admin'::user_role) OR 
  has_role(auth.uid(), 'HR Assistant'::user_role) OR 
  has_role(auth.uid(), 'Chief of HR'::user_role) OR
  has_role(auth.uid(), 'Hiring Manager'::user_role)
);

-- Candidates table
DROP POLICY IF EXISTS "Staff can view all candidate profiles" ON public.candidates;
CREATE POLICY "Staff can view all candidate profiles" ON public.candidates
FOR SELECT USING (
  has_role(auth.uid(), 'Admin'::user_role) OR 
  has_role(auth.uid(), 'HR Assistant'::user_role) OR 
  has_role(auth.uid(), 'Chief of HR'::user_role) OR
  has_role(auth.uid(), 'Hiring Manager'::user_role) OR 
  has_role(auth.uid(), 'Panel Member'::user_role)
);

-- Jobs table
DROP POLICY IF EXISTS "Admin and HR can manage jobs" ON public.jobs;
CREATE POLICY "Admin and HR can manage jobs" ON public.jobs
FOR ALL USING (
  has_role(auth.uid(), 'Admin'::user_role) OR 
  has_role(auth.uid(), 'HR Assistant'::user_role) OR
  has_role(auth.uid(), 'Chief of HR'::user_role)
);

DROP POLICY IF EXISTS "Staff can view all jobs" ON public.jobs;
CREATE POLICY "Staff can view all jobs" ON public.jobs
FOR SELECT USING (
  (status = 'active'::text) OR 
  has_role(auth.uid(), 'Admin'::user_role) OR 
  has_role(auth.uid(), 'HR Assistant'::user_role) OR 
  has_role(auth.uid(), 'Chief of HR'::user_role) OR
  has_role(auth.uid(), 'Panel Member'::user_role) OR 
  is_job_hiring_manager(auth.uid(), id)
);

-- Job hiring managers
DROP POLICY IF EXISTS "Admin and HR can manage job hiring managers" ON public.job_hiring_managers;
CREATE POLICY "Admin and HR can manage job hiring managers" ON public.job_hiring_managers
FOR ALL USING (
  has_role(auth.uid(), 'Admin'::user_role) OR 
  has_role(auth.uid(), 'HR Assistant'::user_role) OR
  has_role(auth.uid(), 'Chief of HR'::user_role)
);

DROP POLICY IF EXISTS "Staff can view job hiring managers" ON public.job_hiring_managers;
CREATE POLICY "Staff can view job hiring managers" ON public.job_hiring_managers
FOR SELECT USING (
  has_role(auth.uid(), 'Admin'::user_role) OR 
  has_role(auth.uid(), 'HR Assistant'::user_role) OR 
  has_role(auth.uid(), 'Chief of HR'::user_role) OR
  has_role(auth.uid(), 'Hiring Manager'::user_role) OR 
  has_role(auth.uid(), 'Panel Member'::user_role)
);

-- Essential criteria
DROP POLICY IF EXISTS "Admin and HR can manage essential criteria" ON public.essential_criteria;
CREATE POLICY "Admin and HR can manage essential criteria" ON public.essential_criteria
FOR ALL USING (
  has_role(auth.uid(), 'Admin'::user_role) OR 
  has_role(auth.uid(), 'HR Assistant'::user_role) OR
  has_role(auth.uid(), 'Chief of HR'::user_role)
);

DROP POLICY IF EXISTS "Staff can view essential criteria" ON public.essential_criteria;
CREATE POLICY "Staff can view essential criteria" ON public.essential_criteria
FOR SELECT USING (
  has_role(auth.uid(), 'Admin'::user_role) OR 
  has_role(auth.uid(), 'HR Assistant'::user_role) OR 
  has_role(auth.uid(), 'Chief of HR'::user_role) OR
  has_role(auth.uid(), 'Hiring Manager'::user_role) OR 
  has_role(auth.uid(), 'Panel Member'::user_role)
);

-- Killer questions
DROP POLICY IF EXISTS "Admin and HR can manage killer questions" ON public.killer_questions;
CREATE POLICY "Admin and HR can manage killer questions" ON public.killer_questions
FOR ALL USING (
  has_role(auth.uid(), 'Admin'::user_role) OR 
  has_role(auth.uid(), 'HR Assistant'::user_role) OR
  has_role(auth.uid(), 'Chief of HR'::user_role)
);

DROP POLICY IF EXISTS "Staff can view killer questions" ON public.killer_questions;
CREATE POLICY "Staff can view killer questions" ON public.killer_questions
FOR SELECT USING (
  has_role(auth.uid(), 'Admin'::user_role) OR 
  has_role(auth.uid(), 'HR Assistant'::user_role) OR 
  has_role(auth.uid(), 'Chief of HR'::user_role) OR
  has_role(auth.uid(), 'Hiring Manager'::user_role) OR 
  has_role(auth.uid(), 'Panel Member'::user_role)
);

-- Feedback form templates
DROP POLICY IF EXISTS "Admin and HR can manage feedback templates" ON public.feedback_form_templates;
CREATE POLICY "Admin and HR can manage feedback templates" ON public.feedback_form_templates
FOR ALL USING (
  has_role(auth.uid(), 'Admin'::user_role) OR 
  has_role(auth.uid(), 'HR Assistant'::user_role) OR
  has_role(auth.uid(), 'Chief of HR'::user_role)
);

DROP POLICY IF EXISTS "Staff can view feedback templates" ON public.feedback_form_templates;
CREATE POLICY "Staff can view feedback templates" ON public.feedback_form_templates
FOR SELECT USING (
  has_role(auth.uid(), 'Admin'::user_role) OR 
  has_role(auth.uid(), 'HR Assistant'::user_role) OR 
  has_role(auth.uid(), 'Chief of HR'::user_role) OR
  has_role(auth.uid(), 'Hiring Manager'::user_role) OR 
  has_role(auth.uid(), 'Panel Member'::user_role)
);

-- Feedback form responses
DROP POLICY IF EXISTS "Staff can create feedback responses" ON public.feedback_form_responses;
CREATE POLICY "Staff can create feedback responses" ON public.feedback_form_responses
FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'Admin'::user_role) OR 
  has_role(auth.uid(), 'HR Assistant'::user_role) OR 
  has_role(auth.uid(), 'Chief of HR'::user_role) OR
  has_role(auth.uid(), 'Hiring Manager'::user_role) OR 
  has_role(auth.uid(), 'Panel Member'::user_role)
);

DROP POLICY IF EXISTS "Staff can view feedback responses" ON public.feedback_form_responses;
CREATE POLICY "Staff can view feedback responses" ON public.feedback_form_responses
FOR SELECT USING (
  has_role(auth.uid(), 'Admin'::user_role) OR 
  has_role(auth.uid(), 'HR Assistant'::user_role) OR 
  has_role(auth.uid(), 'Chief of HR'::user_role) OR
  has_role(auth.uid(), 'Hiring Manager'::user_role) OR 
  has_role(auth.uid(), 'Panel Member'::user_role)
);

-- Evaluations
DROP POLICY IF EXISTS "Admin and HR can view all evaluations" ON public.evaluations;
CREATE POLICY "Admin and HR can view all evaluations" ON public.evaluations
FOR SELECT USING (
  has_role(auth.uid(), 'Admin'::user_role) OR 
  has_role(auth.uid(), 'HR Assistant'::user_role) OR
  has_role(auth.uid(), 'Chief of HR'::user_role)
);

DROP POLICY IF EXISTS "Staff can create evaluations" ON public.evaluations;
CREATE POLICY "Staff can create evaluations" ON public.evaluations
FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'Admin'::user_role) OR 
  has_role(auth.uid(), 'HR Assistant'::user_role) OR 
  has_role(auth.uid(), 'Chief of HR'::user_role) OR
  has_role(auth.uid(), 'Hiring Manager'::user_role) OR 
  has_role(auth.uid(), 'Panel Member'::user_role)
);

-- Panel interviews
DROP POLICY IF EXISTS "Staff can manage panel interviews" ON public.panel_interviews;
CREATE POLICY "Staff can manage panel interviews" ON public.panel_interviews
FOR ALL USING (
  has_role(auth.uid(), 'Admin'::user_role) OR 
  has_role(auth.uid(), 'HR Assistant'::user_role) OR 
  has_role(auth.uid(), 'Chief of HR'::user_role) OR
  has_role(auth.uid(), 'Hiring Manager'::user_role)
);

-- Panel interview participants
DROP POLICY IF EXISTS "Staff can manage interview participants" ON public.panel_interview_participants;
CREATE POLICY "Staff can manage interview participants" ON public.panel_interview_participants
FOR ALL USING (
  has_role(auth.uid(), 'Admin'::user_role) OR 
  has_role(auth.uid(), 'HR Assistant'::user_role) OR 
  has_role(auth.uid(), 'Chief of HR'::user_role) OR
  has_role(auth.uid(), 'Hiring Manager'::user_role)
);

-- Video assignments
DROP POLICY IF EXISTS "Staff can manage video assignments" ON public.video_assignments;
CREATE POLICY "Staff can manage video assignments" ON public.video_assignments
FOR ALL USING (
  has_role(auth.uid(), 'Admin'::user_role) OR 
  has_role(auth.uid(), 'HR Assistant'::user_role) OR 
  has_role(auth.uid(), 'Chief of HR'::user_role) OR
  has_role(auth.uid(), 'Hiring Manager'::user_role)
);

-- Video answers
DROP POLICY IF EXISTS "Staff can view video answers" ON public.video_answers;
CREATE POLICY "Staff can view video answers" ON public.video_answers
FOR SELECT USING (
  has_role(auth.uid(), 'Admin'::user_role) OR 
  has_role(auth.uid(), 'HR Assistant'::user_role) OR 
  has_role(auth.uid(), 'Chief of HR'::user_role) OR
  has_role(auth.uid(), 'Hiring Manager'::user_role) OR 
  has_role(auth.uid(), 'Panel Member'::user_role)
);

-- Screening scores
DROP POLICY IF EXISTS "Staff can view screening scores" ON public.screening_scores;
CREATE POLICY "Staff can view screening scores" ON public.screening_scores
FOR SELECT USING (
  has_role(auth.uid(), 'Admin'::user_role) OR 
  has_role(auth.uid(), 'HR Assistant'::user_role) OR 
  has_role(auth.uid(), 'Chief of HR'::user_role) OR
  has_role(auth.uid(), 'Hiring Manager'::user_role) OR 
  has_role(auth.uid(), 'Panel Member'::user_role)
);

-- Stage events
DROP POLICY IF EXISTS "Staff can create stage events" ON public.stage_events;
CREATE POLICY "Staff can create stage events" ON public.stage_events
FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'Admin'::user_role) OR 
  has_role(auth.uid(), 'HR Assistant'::user_role) OR 
  has_role(auth.uid(), 'Chief of HR'::user_role) OR
  has_role(auth.uid(), 'Hiring Manager'::user_role) OR 
  has_role(auth.uid(), 'Panel Member'::user_role)
);

DROP POLICY IF EXISTS "Staff can view stage events" ON public.stage_events;
CREATE POLICY "Staff can view stage events" ON public.stage_events
FOR SELECT USING (
  has_role(auth.uid(), 'Admin'::user_role) OR 
  has_role(auth.uid(), 'HR Assistant'::user_role) OR 
  has_role(auth.uid(), 'Chief of HR'::user_role) OR
  has_role(auth.uid(), 'Hiring Manager'::user_role) OR 
  has_role(auth.uid(), 'Panel Member'::user_role)
);

-- Email threads
DROP POLICY IF EXISTS "Admin and HR can manage email threads" ON public.email_threads;
CREATE POLICY "Admin and HR can manage email threads" ON public.email_threads
FOR ALL USING (
  has_role(auth.uid(), 'Admin'::user_role) OR 
  has_role(auth.uid(), 'HR Assistant'::user_role) OR
  has_role(auth.uid(), 'Chief of HR'::user_role)
);

DROP POLICY IF EXISTS "Staff can view email threads" ON public.email_threads;
CREATE POLICY "Staff can view email threads" ON public.email_threads
FOR SELECT USING (
  has_role(auth.uid(), 'Admin'::user_role) OR 
  has_role(auth.uid(), 'HR Assistant'::user_role) OR 
  has_role(auth.uid(), 'Chief of HR'::user_role) OR
  has_role(auth.uid(), 'Hiring Manager'::user_role) OR 
  has_role(auth.uid(), 'Panel Member'::user_role)
);

-- Candidate flags
DROP POLICY IF EXISTS "Admin and HR can create candidate flags" ON public.candidate_flags;
CREATE POLICY "Admin and HR can create candidate flags" ON public.candidate_flags
FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'Admin'::user_role) OR 
  has_role(auth.uid(), 'HR Assistant'::user_role) OR
  has_role(auth.uid(), 'Chief of HR'::user_role)
);

DROP POLICY IF EXISTS "Admin and HR can delete candidate flags" ON public.candidate_flags;
CREATE POLICY "Admin and HR can delete candidate flags" ON public.candidate_flags
FOR DELETE USING (
  has_role(auth.uid(), 'Admin'::user_role) OR 
  has_role(auth.uid(), 'HR Assistant'::user_role) OR
  has_role(auth.uid(), 'Chief of HR'::user_role)
);

DROP POLICY IF EXISTS "Admin and HR can view all candidate flags" ON public.candidate_flags;
CREATE POLICY "Admin and HR can view all candidate flags" ON public.candidate_flags
FOR SELECT USING (
  has_role(auth.uid(), 'Admin'::user_role) OR 
  has_role(auth.uid(), 'HR Assistant'::user_role) OR
  has_role(auth.uid(), 'Chief of HR'::user_role)
);

-- Candidate notes
DROP POLICY IF EXISTS "Admin and HR can create candidate notes" ON public.candidate_notes;
CREATE POLICY "Admin and HR can create candidate notes" ON public.candidate_notes
FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'Admin'::user_role) OR 
  has_role(auth.uid(), 'HR Assistant'::user_role) OR
  has_role(auth.uid(), 'Chief of HR'::user_role)
);

DROP POLICY IF EXISTS "Admin and HR can delete their own notes" ON public.candidate_notes;
CREATE POLICY "Admin and HR can delete their own notes" ON public.candidate_notes
FOR DELETE USING (
  (created_by = auth.uid()) AND (
    has_role(auth.uid(), 'Admin'::user_role) OR 
    has_role(auth.uid(), 'HR Assistant'::user_role) OR
    has_role(auth.uid(), 'Chief of HR'::user_role)
  )
);

DROP POLICY IF EXISTS "Admin and HR can update their own notes" ON public.candidate_notes;
CREATE POLICY "Admin and HR can update their own notes" ON public.candidate_notes
FOR UPDATE USING (
  (created_by = auth.uid()) AND (
    has_role(auth.uid(), 'Admin'::user_role) OR 
    has_role(auth.uid(), 'HR Assistant'::user_role) OR
    has_role(auth.uid(), 'Chief of HR'::user_role)
  )
);

DROP POLICY IF EXISTS "Admin and HR can view all candidate notes" ON public.candidate_notes;
CREATE POLICY "Admin and HR can view all candidate notes" ON public.candidate_notes
FOR SELECT USING (
  has_role(auth.uid(), 'Admin'::user_role) OR 
  has_role(auth.uid(), 'HR Assistant'::user_role) OR
  has_role(auth.uid(), 'Chief of HR'::user_role)
);

-- Talent pool searches
DROP POLICY IF EXISTS "Admin and HR can create saved searches" ON public.talent_pool_searches;
CREATE POLICY "Admin and HR can create saved searches" ON public.talent_pool_searches
FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'Admin'::user_role) OR 
  has_role(auth.uid(), 'HR Assistant'::user_role) OR
  has_role(auth.uid(), 'Chief of HR'::user_role)
);

-- System settings
DROP POLICY IF EXISTS "Staff can view system settings" ON public.system_settings;
CREATE POLICY "Staff can view system settings" ON public.system_settings
FOR SELECT USING (
  has_role(auth.uid(), 'Admin'::user_role) OR 
  has_role(auth.uid(), 'HR Assistant'::user_role) OR 
  has_role(auth.uid(), 'Chief of HR'::user_role) OR
  has_role(auth.uid(), 'Hiring Manager'::user_role) OR 
  has_role(auth.uid(), 'Panel Member'::user_role)
);

-- Job email alerts
DROP POLICY IF EXISTS "Staff can delete alerts" ON public.job_email_alerts;
CREATE POLICY "Staff can delete alerts" ON public.job_email_alerts
FOR DELETE USING (
  has_role(auth.uid(), 'Admin'::user_role) OR 
  has_role(auth.uid(), 'HR Assistant'::user_role) OR
  has_role(auth.uid(), 'Chief of HR'::user_role)
);

DROP POLICY IF EXISTS "Staff can update alerts" ON public.job_email_alerts;
CREATE POLICY "Staff can update alerts" ON public.job_email_alerts
FOR UPDATE USING (
  has_role(auth.uid(), 'Admin'::user_role) OR 
  has_role(auth.uid(), 'HR Assistant'::user_role) OR
  has_role(auth.uid(), 'Chief of HR'::user_role)
);

DROP POLICY IF EXISTS "Staff can view all alerts" ON public.job_email_alerts;
CREATE POLICY "Staff can view all alerts" ON public.job_email_alerts
FOR SELECT USING (
  has_role(auth.uid(), 'Admin'::user_role) OR 
  has_role(auth.uid(), 'HR Assistant'::user_role) OR
  has_role(auth.uid(), 'Chief of HR'::user_role)
);

-- Job requisitions - Already includes Chief of HR in the existing policy
DROP POLICY IF EXISTS "Staff can view requisitions" ON public.job_requisitions;
CREATE POLICY "Staff can view requisitions" ON public.job_requisitions
FOR SELECT USING (
  has_role(auth.uid(), 'Admin'::user_role) OR 
  has_role(auth.uid(), 'HR Assistant'::user_role) OR 
  has_role(auth.uid(), 'Hiring Manager'::user_role) OR 
  has_role(auth.uid(), 'Chief of HR'::user_role)
);

-- Users table - Grant Chief of HR same access as Admin/HR
DROP POLICY IF EXISTS "Admin and HR can view all users" ON public.users;
CREATE POLICY "Admin and HR can view all users" ON public.users
FOR SELECT USING (
  has_role(auth.uid(), 'Admin'::user_role) OR 
  has_role(auth.uid(), 'HR Assistant'::user_role) OR
  has_role(auth.uid(), 'Chief of HR'::user_role)
);