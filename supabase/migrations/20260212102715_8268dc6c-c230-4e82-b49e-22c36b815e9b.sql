
-- Create document_repository table
CREATE TABLE public.document_repository (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Other',
  file_path TEXT NOT NULL,
  file_size BIGINT,
  file_type TEXT,
  uploaded_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.document_repository ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read
CREATE POLICY "Authenticated users can view documents"
ON public.document_repository FOR SELECT
TO authenticated
USING (true);

-- Admins can insert
CREATE POLICY "Admins can insert documents"
ON public.document_repository FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'Admin'::public.user_role));

-- Admins can delete
CREATE POLICY "Admins can delete documents"
ON public.document_repository FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'Admin'::public.user_role));

-- Create storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('document-repository', 'document-repository', true);

-- Storage policies
CREATE POLICY "Anyone can read document-repository"
ON storage.objects FOR SELECT
USING (bucket_id = 'document-repository');

CREATE POLICY "Admins can upload to document-repository"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'document-repository' AND public.has_role(auth.uid(), 'Admin'::public.user_role));

CREATE POLICY "Admins can delete from document-repository"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'document-repository' AND public.has_role(auth.uid(), 'Admin'::public.user_role));
