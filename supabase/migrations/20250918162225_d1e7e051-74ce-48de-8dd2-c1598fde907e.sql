-- Fix RLS policy for candidates table to allow public users to create candidate records
-- This is needed for job applications to work for non-authenticated users

-- Drop the existing restrictive policy for candidate creation
DROP POLICY IF EXISTS "Anyone can create candidate records" ON public.candidates;

-- Create a new policy that truly allows anyone to create candidate records
CREATE POLICY "Public users can create candidates" 
ON public.candidates 
FOR INSERT 
TO public 
WITH CHECK (true);