
-- Create document_templates table
CREATE TABLE public.document_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  description TEXT,
  file_path TEXT NOT NULL,
  file_type TEXT,
  fields JSONB DEFAULT '[]'::jsonb,
  uploaded_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read templates
CREATE POLICY "Authenticated users can view templates"
ON public.document_templates
FOR SELECT
TO authenticated
USING (true);

-- Only admins can insert templates
CREATE POLICY "Admins can insert templates"
ON public.document_templates
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'Admin'::user_role));

-- Only admins can delete templates
CREATE POLICY "Admins can delete templates"
ON public.document_templates
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'Admin'::user_role));

-- Only admins can update templates (for field detection updates)
CREATE POLICY "Admins can update templates"
ON public.document_templates
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'Admin'::user_role));

-- Create storage bucket for document templates
INSERT INTO storage.buckets (id, name, public)
VALUES ('document-templates', 'document-templates', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: authenticated users can read
CREATE POLICY "Authenticated users can read document templates"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'document-templates');

-- Admins can upload to document-templates bucket
CREATE POLICY "Admins can upload document templates"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'document-templates');

-- Admins can delete from document-templates bucket
CREATE POLICY "Admins can delete document templates"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'document-templates');
