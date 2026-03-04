-- Drop the vulnerable policies that allow anonymous access via (auth.uid() IS NULL)
DROP POLICY IF EXISTS "Candidates can view their own profile" ON public.candidates;
DROP POLICY IF EXISTS "Candidates can update their own profile" ON public.candidates;

-- Recreate SELECT policy: only authenticated candidates can view their own profile
CREATE POLICY "Candidates can view their own profile"
ON public.candidates
FOR SELECT
TO authenticated
USING ((auth.jwt() ->> 'email'::text) = email);

-- Recreate UPDATE policy: only authenticated candidates can update their own profile
CREATE POLICY "Candidates can update their own profile"
ON public.candidates
FOR UPDATE
TO authenticated
USING ((auth.jwt() ->> 'email'::text) = email)
WITH CHECK ((auth.jwt() ->> 'email'::text) = email);