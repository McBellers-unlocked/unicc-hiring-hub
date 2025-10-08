-- Update existing user to Admin if exists
UPDATE public.users 
SET role = 'Admin'::user_role 
WHERE email = 'negyesi@unicc.org';

-- Update the handle_new_user function to assign Admin role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public' 
AS $$
DECLARE
  assigned_role user_role;
BEGIN
  -- Check if this email should be an Admin
  assigned_role := CASE 
    WHEN NEW.email = 'negyesi@unicc.org' THEN 'Admin'::user_role
    ELSE 'Candidate'::user_role
  END;
  
  -- Insert user record with appropriate role
  INSERT INTO public.users (id, name, email, role)
  VALUES (
    NEW.id, 
    CASE 
      WHEN NEW.email = 'negyesi@unicc.org' THEN 'Anna Negyesi-Mouysset'
      ELSE COALESCE(
        CONCAT(NEW.raw_user_meta_data ->> 'first_name', ' ', NEW.raw_user_meta_data ->> 'last_name'),
        NEW.email
      )
    END,
    NEW.email,
    assigned_role
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
      NULL;
  END;
  
  RETURN NEW;
END;
$$;