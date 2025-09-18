-- The issue might be with the has_role function being called during policy evaluation
-- Let's completely simplify the RLS policies to allow all users to create candidates and applications

-- Drop all existing policies for candidates and applications
DROP POLICY IF EXISTS "Anonymous users can create candidates" ON public.candidates;
DROP POLICY IF EXISTS "Admin and HR can manage candidates" ON public.candidates;
DROP POLICY IF EXISTS "Staff can view all candidates" ON public.candidates;
DROP POLICY IF EXISTS "Anonymous users can create applications" ON public.applications;
DROP POLICY IF EXISTS "Staff can manage applications" ON public.applications;
DROP POLICY IF EXISTS "Staff can view all applications" ON public.applications;

-- Create simple policies that definitely work for everyone to create records
CREATE POLICY "Allow all inserts on candidates" 
ON public.candidates 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow all inserts on applications" 
ON public.applications 
FOR INSERT 
WITH CHECK (true);

-- Re-create the necessary view policies for staff
CREATE POLICY "Staff can view all candidates" 
ON public.candidates 
FOR SELECT 
USING (has_role(auth.uid(), 'Admin'::user_role) OR has_role(auth.uid(), 'HR Assistant'::user_role) OR has_role(auth.uid(), 'Hiring Manager'::user_role) OR has_role(auth.uid(), 'Panel Member'::user_role));

CREATE POLICY "Staff can view all applications" 
ON public.applications 
FOR SELECT 
USING (has_role(auth.uid(), 'Admin'::user_role) OR has_role(auth.uid(), 'HR Assistant'::user_role) OR has_role(auth.uid(), 'Hiring Manager'::user_role) OR has_role(auth.uid(), 'Panel Member'::user_role));

-- Re-create the management policies for staff
CREATE POLICY "Staff can manage candidates" 
ON public.candidates 
FOR ALL 
USING (has_role(auth.uid(), 'Admin'::user_role) OR has_role(auth.uid(), 'HR Assistant'::user_role));

CREATE POLICY "Staff can manage applications" 
ON public.applications 
FOR ALL 
USING (has_role(auth.uid(), 'Admin'::user_role) OR has_role(auth.uid(), 'HR Assistant'::user_role) OR has_role(auth.uid(), 'Hiring Manager'::user_role));