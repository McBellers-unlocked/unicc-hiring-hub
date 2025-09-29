-- Security Fix: Secure Candidates Table RLS Policies
-- This migration addresses critical security vulnerabilities in the candidates table

-- First, drop all existing duplicate and insecure policies
DROP POLICY IF EXISTS "Allow insert on candidates" ON public.candidates;
DROP POLICY IF EXISTS "Anyone can create candidates" ON public.candidates;
DROP POLICY IF EXISTS "Allow select on candidates for staff" ON public.candidates;
DROP POLICY IF EXISTS "Staff can view candidates" ON public.candidates;

-- Create secure, non-duplicate policies

-- 1. SECURE INSERT: Only authenticated users can create their own candidate profile
CREATE POLICY "Authenticated users can create their own candidate profile"
ON public.candidates
FOR INSERT
TO authenticated
WITH CHECK (
  -- Ensure the email matches the authenticated user's email
  email = (auth.jwt() ->> 'email')
  -- Additional security: prevent creating multiple profiles
  AND NOT EXISTS (
    SELECT 1 FROM public.candidates 
    WHERE email = (auth.jwt() ->> 'email')
  )
);

-- 2. SECURE SELECT: Staff can view candidates (consolidated policy)
CREATE POLICY "Staff can view all candidate profiles"
ON public.candidates
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'Admin'::user_role) OR 
  has_role(auth.uid(), 'HR Assistant'::user_role) OR 
  has_role(auth.uid(), 'Hiring Manager'::user_role) OR 
  has_role(auth.uid(), 'Panel Member'::user_role)
);

-- Keep existing secure policies (these are already properly configured):
-- "Candidates can update their own profile" - already exists and is secure
-- "Candidates can view their own profile" - already exists and is secure

-- Add comment documenting the security measures
COMMENT ON TABLE public.candidates IS 'Contains highly sensitive personal data. Access is strictly controlled through RLS policies requiring authentication and proper authorization. All staff access is role-based.';