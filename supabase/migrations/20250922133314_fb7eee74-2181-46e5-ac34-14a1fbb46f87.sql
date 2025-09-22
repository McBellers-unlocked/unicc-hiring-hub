-- Add missing personal detail fields to candidates table
ALTER TABLE public.candidates 
ADD COLUMN first_name TEXT,
ADD COLUMN middle_names TEXT,
ADD COLUMN present_address TEXT,
ADD COLUMN present_address_same_as_permanent BOOLEAN DEFAULT false;