-- Add language_requirements and competencies columns to jobs table
ALTER TABLE public.jobs 
ADD COLUMN language_requirements text,
ADD COLUMN competencies text;