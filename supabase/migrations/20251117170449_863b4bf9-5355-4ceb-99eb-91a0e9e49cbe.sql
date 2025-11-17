-- Add Director to the user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'Director';

-- Add section column to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS section TEXT;