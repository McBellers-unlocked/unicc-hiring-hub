-- Create trigger to automatically score applications when they're submitted
CREATE OR REPLACE FUNCTION public.trigger_application_scoring()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger scoring when PHF is completed or status changes to submitted
  IF (NEW.phf_completed = true AND (OLD.phf_completed IS NULL OR OLD.phf_completed = false)) OR 
     (NEW.status != OLD.status AND NEW.status IN ('Application', 'Screening')) THEN
    
    -- Check if scoring already exists
    IF NOT EXISTS (
      SELECT 1 FROM public.screening_scores 
      WHERE application_id = NEW.id AND version = '2.0'
    ) THEN
      -- Call the scoring edge function asynchronously
      PERFORM
        net.http_post(
          url := 'https://cxpnvbphjpntrvvgjhli.supabase.co/functions/v1/score-application',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
          ),
          body := jsonb_build_object('applicationId', NEW.id::text)
        );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Create the trigger
DROP TRIGGER IF EXISTS auto_score_application ON public.applications;
CREATE TRIGGER auto_score_application
  AFTER UPDATE ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_application_scoring();