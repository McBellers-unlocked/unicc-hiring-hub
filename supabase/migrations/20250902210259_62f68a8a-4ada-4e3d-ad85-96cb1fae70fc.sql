-- Add PHF data column to applications table
ALTER TABLE public.applications 
ADD COLUMN phf_data JSONB DEFAULT '{}'::jsonb;

-- Add PHF completion tracking
ALTER TABLE public.applications 
ADD COLUMN phf_completed BOOLEAN DEFAULT false;

-- Add photo URL for PHF
ALTER TABLE public.applications 
ADD COLUMN photo_url TEXT;

-- Create index for PHF data queries
CREATE INDEX idx_applications_phf_completed ON public.applications(phf_completed);