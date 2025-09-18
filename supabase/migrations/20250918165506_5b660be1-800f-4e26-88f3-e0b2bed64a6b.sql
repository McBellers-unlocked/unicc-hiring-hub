-- Allow candidates to view their own applications
CREATE POLICY "Candidates can view their own applications" 
ON public.applications 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.candidates c 
    WHERE c.id = applications.candidate_id 
    AND c.email = (auth.jwt() ->> 'email')
  )
);

-- Allow candidates to update their own applications  
CREATE POLICY "Candidates can update their own applications" 
ON public.applications 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.candidates c 
    WHERE c.id = applications.candidate_id 
    AND c.email = (auth.jwt() ->> 'email')
  )
);

-- Allow candidates to view their own candidate record
CREATE POLICY "Candidates can view their own profile" 
ON public.candidates 
FOR SELECT 
USING (email = (auth.jwt() ->> 'email'));

-- Allow candidates to update their own candidate record
CREATE POLICY "Candidates can update their own profile" 
ON public.candidates 
FOR UPDATE 
USING (email = (auth.jwt() ->> 'email'));