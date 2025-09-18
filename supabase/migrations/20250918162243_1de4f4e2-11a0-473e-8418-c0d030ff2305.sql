-- Also need to allow public users to create applications
-- Check if there's already a policy for applications creation by public users

-- Create policy to allow public users to create applications
CREATE POLICY "Public users can create applications" 
ON public.applications 
FOR INSERT 
TO public 
WITH CHECK (true);