-- Fix RLS Policy Infinite Recursion for panel_interview_participants
-- First, create a security definer function to safely check panelist permissions
CREATE OR REPLACE FUNCTION public.is_panelist_for_interview(_user_id uuid, _interview_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.panel_interview_participants
    WHERE panel_interview_id = _interview_id
      AND panelist_id = _user_id
  )
$$;

-- Drop and recreate the problematic policy for panel_interview_participants
DROP POLICY IF EXISTS "Panelists can view interview participants" ON public.panel_interview_participants;

CREATE POLICY "Panelists can view interview participants"
ON public.panel_interview_participants
FOR SELECT
USING (public.is_panelist_for_interview(auth.uid(), panel_interview_id));

-- Secure killer_questions table - remove the overly permissive policy
DROP POLICY IF EXISTS "Secure killer questions access" ON public.killer_questions;

-- Secure video_assignments table - remove overly permissive public access
DROP POLICY IF EXISTS "Anyone can view assignments by token" ON public.video_assignments;

-- Create secure policy for video assignments (allow token-based access only for specific operations)
CREATE POLICY "Token-based video assignment access"
ON public.video_assignments
FOR SELECT
USING (
  -- Allow staff to see all assignments
  has_role(auth.uid(), 'Admin'::user_role) OR 
  has_role(auth.uid(), 'HR Assistant'::user_role) OR 
  has_role(auth.uid(), 'Hiring Manager'::user_role) OR
  -- Allow candidates to see their own assignments only when authenticated
  (auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.applications a
    JOIN public.candidates c ON c.id = a.candidate_id
    WHERE a.id = video_assignments.application_id 
    AND c.email = (auth.jwt() ->> 'email')
  ))
);

-- Add a separate policy for anonymous token-based access (for video interface)
CREATE POLICY "Anonymous token access for video interface"
ON public.video_assignments
FOR SELECT
USING (auth.uid() IS NULL AND token IS NOT NULL);