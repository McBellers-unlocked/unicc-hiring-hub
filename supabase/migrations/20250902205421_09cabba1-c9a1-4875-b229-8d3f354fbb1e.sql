-- Create storage bucket for application files
INSERT INTO storage.buckets (id, name, public) VALUES ('application-files', 'application-files', false);

-- Create policies for application files storage
CREATE POLICY "Authenticated users can upload application files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'application-files' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Staff can view application files" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'application-files' 
  AND (
    has_role(auth.uid(), 'Admin'::user_role) 
    OR has_role(auth.uid(), 'HR Assistant'::user_role) 
    OR has_role(auth.uid(), 'Hiring Manager'::user_role)
    OR has_role(auth.uid(), 'Panel Member'::user_role)
  )
);