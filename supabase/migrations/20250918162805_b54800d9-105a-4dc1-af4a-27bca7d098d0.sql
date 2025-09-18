-- First, disable RLS to clear any conflicts
ALTER TABLE public.candidates DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies
DO $$ 
BEGIN
    -- Drop all policies for candidates table
    EXECUTE (
        SELECT string_agg('DROP POLICY IF EXISTS "' || policyname || '" ON public.candidates;', ' ')
        FROM pg_policies 
        WHERE tablename = 'candidates' AND schemaname = 'public'
    );
    
    -- Drop all policies for applications table  
    EXECUTE (
        SELECT string_agg('DROP POLICY IF EXISTS "' || policyname || '" ON public.applications;', ' ')
        FROM pg_policies 
        WHERE tablename = 'applications' AND schemaname = 'public'
    );
END $$;

-- Re-enable RLS
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- Create simple, working policies
CREATE POLICY "Anyone can create candidates" 
ON public.candidates 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can create applications" 
ON public.applications 
FOR INSERT 
WITH CHECK (true);

-- Allow staff to view candidates and applications
CREATE POLICY "Staff can view candidates" 
ON public.candidates 
FOR SELECT 
USING (has_role(auth.uid(), 'Admin'::user_role) OR has_role(auth.uid(), 'HR Assistant'::user_role) OR has_role(auth.uid(), 'Hiring Manager'::user_role) OR has_role(auth.uid(), 'Panel Member'::user_role));

CREATE POLICY "Staff can view applications" 
ON public.applications 
FOR SELECT 
USING (has_role(auth.uid(), 'Admin'::user_role) OR has_role(auth.uid(), 'HR Assistant'::user_role) OR has_role(auth.uid(), 'Hiring Manager'::user_role) OR has_role(auth.uid(), 'Panel Member'::user_role));