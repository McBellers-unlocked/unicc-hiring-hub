-- Allow public access to read killer questions (needed for job applications)
-- This allows anyone to read killer questions but only staff can modify them

CREATE POLICY "Anyone can view killer questions" 
ON public.killer_questions 
FOR SELECT 
USING (true);