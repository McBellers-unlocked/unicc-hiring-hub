-- Create signup attempts tracking table for rate limiting
CREATE TABLE IF NOT EXISTS public.signup_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  email TEXT NOT NULL,
  attempted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  success BOOLEAN NOT NULL DEFAULT false
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_signup_attempts_ip_time ON public.signup_attempts(ip_address, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_signup_attempts_email_time ON public.signup_attempts(email, attempted_at DESC);

-- Enable RLS
ALTER TABLE public.signup_attempts ENABLE ROW LEVEL SECURITY;

-- Only admins can view signup attempts
CREATE POLICY "Admins can view signup attempts"
ON public.signup_attempts
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'Admin'::user_role));

-- System can insert signup attempts (no RLS restriction)
CREATE POLICY "System can log signup attempts"
ON public.signup_attempts
FOR INSERT
WITH CHECK (true);

-- Function to check rate limits (5 signups per IP per hour)
CREATE OR REPLACE FUNCTION public.check_signup_rate_limit(p_ip_address TEXT, p_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ip_attempts INTEGER;
  email_attempts INTEGER;
BEGIN
  -- Check attempts from this IP in the last hour
  SELECT COUNT(*) INTO ip_attempts
  FROM public.signup_attempts
  WHERE ip_address = p_ip_address
    AND attempted_at > now() - interval '1 hour';
  
  -- Check attempts for this email in the last hour
  SELECT COUNT(*) INTO email_attempts
  FROM public.signup_attempts
  WHERE email = p_email
    AND attempted_at > now() - interval '1 hour';
  
  -- Return false if limits exceeded
  IF ip_attempts >= 5 OR email_attempts >= 3 THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- Update handle_new_user to send admin notifications and log signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert user record
  INSERT INTO public.users (id, name, email, role)
  VALUES (
    NEW.id, 
    COALESCE(
      CONCAT(NEW.raw_user_meta_data ->> 'first_name', ' ', NEW.raw_user_meta_data ->> 'last_name'),
      NEW.email
    ),
    NEW.email,
    'Candidate'
  );
  
  -- Log successful signup attempt
  INSERT INTO public.signup_attempts (email, ip_address, success)
  VALUES (NEW.email, COALESCE(NEW.raw_user_meta_data ->> 'ip_address', 'unknown'), true);
  
  -- Send admin notification via edge function (fire and forget)
  BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'http') THEN
      PERFORM net.http_post(
        url := 'https://cxpnvbphjpntrvvgjhli.supabase.co/functions/v1/notify-admin-new-signup',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4cG52YnBoanBudHJ2dmdqaGxpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg0MzQxOSwiZXhwIjoyMDcyNDE5NDE5fQ.2VGMM9NOZGM4mVOaqWfnxYtRjfpFaONOvOGsKYHMT8Q'
        ),
        body := jsonb_build_object(
          'email', NEW.email,
          'name', COALESCE(
            CONCAT(NEW.raw_user_meta_data ->> 'first_name', ' ', NEW.raw_user_meta_data ->> 'last_name'),
            NEW.email
          ),
          'user_id', NEW.id,
          'created_at', now()
        )
      );
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      -- Don't fail signup if notification fails
      NULL;
  END;
  
  RETURN NEW;
END;
$$;