-- Remove the overly permissive policy that allows anyone to view killer questions
DROP POLICY IF EXISTS "Anyone can view killer questions" ON public.killer_questions;

-- Create a more secure policy that only allows viewing killer questions in specific contexts
-- This policy allows viewing killer questions only when applying to a specific job
CREATE POLICY "Candidates can view killer questions for job applications" 
ON public.killer_questions 
FOR SELECT 
USING (
  -- Allow if user is authenticated staff (covers admin, HR, hiring managers, panel members)
  (has_role(auth.uid(), 'Admin'::user_role) OR 
   has_role(auth.uid(), 'HR Assistant'::user_role) OR 
   has_role(auth.uid(), 'Hiring Manager'::user_role) OR 
   has_role(auth.uid(), 'Panel Member'::user_role))
  OR
  -- Allow unauthenticated users to view killer questions only for active jobs
  -- This ensures candidates can see questions when applying but questions aren't exposed broadly
  (auth.uid() IS NULL AND EXISTS (
    SELECT 1 FROM public.jobs 
    WHERE jobs.id = killer_questions.job_id 
    AND jobs.status = 'active'
  ))
);