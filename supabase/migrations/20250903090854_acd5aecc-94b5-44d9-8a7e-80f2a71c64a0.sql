-- Add PHF PDF URL column to applications table
ALTER TABLE public.applications 
ADD COLUMN IF NOT EXISTS phf_pdf_url TEXT,
ADD COLUMN IF NOT EXISTS candidate_phf_url TEXT;