
-- 1. Enable pg_net extension (Supabase-native async HTTP)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 2. Fix trigger function: check pg_net instead of http, use PERFORM instead of SELECT INTO
CREATE OR REPLACE FUNCTION public.trigger_application_scoring()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  service_key TEXT;
  should_score BOOLEAN := false;
BEGIN
  -- Determine if we should score
  IF TG_OP = 'INSERT' THEN
    should_score := (NEW.phf_completed = true);
  ELSIF TG_OP = 'UPDATE' THEN
    should_score := (
      (NEW.phf_completed = true AND (OLD.phf_completed IS NULL OR OLD.phf_completed = false))
      OR (NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('Application', 'Screening'))
    );
  END IF;

  IF NOT should_score THEN
    RETURN NEW;
  END IF;

  -- Check if v4.0 score already exists
  IF EXISTS (
    SELECT 1 FROM public.screening_scores
    WHERE application_id = NEW.id AND version = '4.0'
  ) THEN
    RETURN NEW;
  END IF;

  -- Get service role key from vault
  BEGIN
    SELECT decrypted_secret INTO service_key
    FROM vault.decrypted_secrets
    WHERE name = 'SUPABASE_SERVICE_ROLE_KEY'
    LIMIT 1;
  EXCEPTION
    WHEN OTHERS THEN
      service_key := NULL;
  END;

  -- Call score-application edge function asynchronously
  BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
      PERFORM net.http_post(
        url := 'https://cxpnvbphjpntrvvgjhli.supabase.co/functions/v1/score-application',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || COALESCE(service_key, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4cG52YnBoanBudHJ2dmdqaGxpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg0MzQxOSwiZXhwIjoyMDcyNDE5NDE5fQ.2VGMM9NOZGM4mVOaqWfnxYtRjfpFaONOvOGsKYHMT8Q')
        ),
        body := jsonb_build_object('applicationId', NEW.id::text)
      );
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      INSERT INTO public.audit_logs (actor_id, action, entity, entity_id, after)
      VALUES (
        NULL, 'AUTO_SCORING_HTTP_FAILED', 'applications', NEW.id,
        jsonb_build_object('application_id', NEW.id, 'error', SQLERRM, 'attempted_at', now())
      );
  END;

  -- Log the trigger
  INSERT INTO public.audit_logs (actor_id, action, entity, entity_id, after)
  VALUES (
    NULL, 'AUTO_SCORING_TRIGGERED', 'applications', NEW.id,
    jsonb_build_object(
      'application_id', NEW.id, 'phf_completed', NEW.phf_completed,
      'status', NEW.status, 'tg_op', TG_OP, 'triggered_at', now()
    )
  );

  RETURN NEW;
END;
$function$;

-- Also fix the same bug in handle_new_user() which has the identical issue
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  assigned_role user_role;
BEGIN
  assigned_role := CASE 
    WHEN NEW.email = 'negyesi@unicc.org' THEN 'Admin'::user_role
    ELSE 'Candidate'::user_role
  END;
  
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
  
  INSERT INTO public.signup_attempts (email, ip_address, success)
  VALUES (NEW.email, COALESCE(NEW.raw_user_meta_data ->> 'ip_address', 'unknown'), true);
  
  BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
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
$function$;
