-- Add division field to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS division TEXT;

-- Add comment to explain the field
COMMENT ON COLUMN public.users.division IS 'User division for approval routing: MS, OP, CS, DD, DS, DO';

-- Update the specific chiefs with their divisions
UPDATE public.users SET division = 'MS' WHERE email = 'negyesi@unicc.org';
UPDATE public.users SET division = 'CS' WHERE email = 'soni@unicc.org';
UPDATE public.users SET division = 'DD' WHERE email = 'liuzzi@unicc.org';
UPDATE public.users SET division = 'DS' WHERE email = 'sethi@unicc.org';
UPDATE public.users SET division = 'DO' WHERE email = 'chauhan@unicc.org';

-- Function to get chief for a division (handles both MS and OP mapping to same chief)
CREATE OR REPLACE FUNCTION public.get_chief_for_division(p_division TEXT)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chief_id UUID;
BEGIN
  -- Map OP to MS since they share the same chief
  IF p_division = 'OP' THEN
    p_division := 'MS';
  END IF;
  
  -- Find the chief for this division
  SELECT id INTO chief_id
  FROM public.users
  WHERE division = p_division
  AND email IN ('negyesi@unicc.org', 'soni@unicc.org', 'liuzzi@unicc.org', 'sethi@unicc.org', 'chauhan@unicc.org')
  LIMIT 1;
  
  RETURN chief_id;
END;
$$;