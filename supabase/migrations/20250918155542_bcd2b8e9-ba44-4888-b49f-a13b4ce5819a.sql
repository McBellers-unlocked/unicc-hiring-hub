-- Update RLS policy for candidates table to allow anyone to create candidate records
-- This is needed for job applications to work for public users

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Admin and HR can manage candidates" ON public.candidates;

-- Create new policies that allow public candidate creation but restrict management to staff
CREATE POLICY "Anyone can create candidate records" 
ON public.candidates 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admin and HR can manage candidates" 
ON public.candidates 
FOR ALL 
USING (has_role(auth.uid(), 'Admin'::user_role) OR has_role(auth.uid(), 'HR Assistant'::user_role));