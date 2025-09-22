-- Add last_name field to candidates table
ALTER TABLE public.candidates 
ADD COLUMN last_name TEXT;