-- Add job_title and entry_on_duty_date columns to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS job_title text,
ADD COLUMN IF NOT EXISTS entry_on_duty_date date;