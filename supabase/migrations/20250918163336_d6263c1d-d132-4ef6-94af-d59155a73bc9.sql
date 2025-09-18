-- Re-enable RLS with proper policies that work
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- Create working policies for candidates
CREATE POLICY "Allow insert on candidates" 
ON public.candidates 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow select on candidates for staff" 
ON public.candidates 
FOR SELECT 
USING (has_role(auth.uid(), 'Admin'::user_role) OR has_role(auth.uid(), 'HR Assistant'::user_role) OR has_role(auth.uid(), 'Hiring Manager'::user_role) OR has_role(auth.uid(), 'Panel Member'::user_role));

-- Create working policies for applications  
CREATE POLICY "Allow insert on applications" 
ON public.applications 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow select on applications for staff" 
ON public.applications 
FOR SELECT 
USING (has_role(auth.uid(), 'Admin'::user_role) OR has_role(auth.uid(), 'HR Assistant'::user_role) OR has_role(auth.uid(), 'Hiring Manager'::user_role) OR has_role(auth.uid(), 'Panel Member'::user_role));

-- Allow staff to update applications
CREATE POLICY "Allow update on applications for staff" 
ON public.applications 
FOR UPDATE 
USING (has_role(auth.uid(), 'Admin'::user_role) OR has_role(auth.uid(), 'HR Assistant'::user_role) OR has_role(auth.uid(), 'Hiring Manager'::user_role));