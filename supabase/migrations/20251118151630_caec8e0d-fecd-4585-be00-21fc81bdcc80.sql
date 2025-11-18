-- Add current_grade column to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS current_grade text;