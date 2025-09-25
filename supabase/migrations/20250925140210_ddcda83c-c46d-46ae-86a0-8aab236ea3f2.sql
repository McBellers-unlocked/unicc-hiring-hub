-- Update the trigger function to handle missing net schema
CREATE OR REPLACE FUNCTION public.trigger_application_scoring()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  service_key TEXT;
  http_response RECORD;
BEGIN
  -- Only trigger scoring when PHF is completed or status changes to submitted
  IF (NEW.phf_completed = true AND (OLD.phf_completed IS NULL OR OLD.phf_completed = false)) OR 
     (NEW.status != OLD.status AND NEW.status IN ('Application', 'Screening')) THEN
    
    -- Check if scoring already exists
    IF NOT EXISTS (
      SELECT 1 FROM public.screening_scores 
      WHERE application_id = NEW.id AND version = '2.0'
    ) THEN
      
      -- Get service role key from vault if available, otherwise use a default approach
      BEGIN
        SELECT decrypted_secret INTO service_key 
        FROM vault.decrypted_secrets 
        WHERE name = 'SUPABASE_SERVICE_ROLE_KEY'
        LIMIT 1;
      EXCEPTION
        WHEN OTHERS THEN
          service_key := NULL;
      END;
      
      -- Try to call the scoring edge function, but handle net schema not existing
      BEGIN
        -- Call the scoring edge function asynchronously only if net extension is available
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
          -- Log that HTTP call failed but don't fail the entire operation
          INSERT INTO public.audit_logs (actor_id, action, entity, entity_id, after)
          VALUES (
            NULL,
            'AUTO_SCORING_HTTP_FAILED',
            'applications',
            NEW.id,
            jsonb_build_object(
              'application_id', NEW.id,
              'error', SQLERRM,
              'attempted_at', now()
            )
          );
      END;
        
      -- Log the trigger attempt
      INSERT INTO public.audit_logs (actor_id, action, entity, entity_id, after)
      VALUES (
        NULL,
        'AUTO_SCORING_TRIGGERED',
        'applications',
        NEW.id,
        jsonb_build_object(
          'application_id', NEW.id,
          'phf_completed', NEW.phf_completed,
          'status', NEW.status,
          'triggered_at', now()
        )
      );
      
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;