-- Debug the RLS policy issue by checking what's happening
-- Let's also check if the issue is with the applications table

-- First, let's make sure we have the right policies for both tables
DROP POLICY IF EXISTS "Public users can create candidates" ON public.candidates;
DROP POLICY IF EXISTS "Public users can create applications" ON public.applications;

-- Create policies that explicitly allow anonymous users to insert
CREATE POLICY "Anonymous users can create candidates" 
ON public.candidates 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Anonymous users can create applications" 
ON public.applications 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);