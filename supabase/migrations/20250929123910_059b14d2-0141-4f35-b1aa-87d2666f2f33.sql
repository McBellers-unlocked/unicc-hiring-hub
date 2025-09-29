-- Create storage policies for application-files bucket to allow staff access
CREATE POLICY "Staff can download application files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'application-files' AND
  (
    -- Allow service role (for edge functions)
    auth.role() = 'service_role' OR
    -- Allow authenticated staff users
    (auth.role() = 'authenticated' AND EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('Admin', 'HR Assistant', 'Hiring Manager', 'Panel Member')
    ))
  )
);

-- Create policy for uploading files (for completeness) 
CREATE POLICY "Staff can upload application files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'application-files' AND
  auth.role() = 'authenticated' AND EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('Admin', 'HR Assistant', 'Hiring Manager')
  )
);