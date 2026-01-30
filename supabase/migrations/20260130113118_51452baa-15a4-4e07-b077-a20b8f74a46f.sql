-- Add first_incumbency_date column to track when affiliates first started
-- This helps distinguish between contract breaks and new hires

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS first_incumbency_date DATE;

COMMENT ON COLUMN public.users.first_incumbency_date IS 
  'The date the affiliate first started working with UNICC. Used to distinguish contract breaks from new hires.';