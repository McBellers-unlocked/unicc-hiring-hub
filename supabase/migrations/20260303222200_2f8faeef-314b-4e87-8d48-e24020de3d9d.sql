-- Fix trigger function: handle INSERT + UPDATE, check v4.0 instead of v2.0
CREATE OR REPLACE FUNCTION public.trigger_application_scoring()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  service_key TEXT;
  http_response RECORD;
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
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'http') THEN
      SELECT * INTO http_response FROM
        net.http_post(
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

-- Re-create trigger to fire on INSERT OR UPDATE
DROP TRIGGER IF EXISTS auto_score_application ON public.applications;
CREATE TRIGGER auto_score_application
  AFTER INSERT OR UPDATE ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_application_scoring();