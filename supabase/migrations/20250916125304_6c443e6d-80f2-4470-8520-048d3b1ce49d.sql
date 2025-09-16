-- Fix function security by setting search_path for functions that need it
CREATE OR REPLACE FUNCTION public.send_job_alerts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  alert_record RECORD;
  job_locations TEXT[];
  job_cities TEXT[];
  alert_locations JSONB;
  alert_categories JSONB;
  alert_types JSONB;
  matches_filters BOOLEAN;
  city TEXT;
BEGIN
  -- Parse job locations to extract cities
  IF NEW.location IS NOT NULL THEN
    SELECT array_agg(trim(split_part(loc, ',', 1)))
    INTO job_cities
    FROM unnest(string_to_array(NEW.location, ',')) AS loc
    WHERE trim(loc) != '';
  END IF;

  -- Find all active email alerts
  FOR alert_record IN 
    SELECT * FROM public.job_email_alerts 
    WHERE is_active = true
  LOOP
    matches_filters := true;
    
    -- Check search term match
    IF alert_record.search_term IS NOT NULL AND alert_record.search_term != '' THEN
      IF NOT (NEW.title ILIKE '%' || alert_record.search_term || '%' OR 
              NEW.notice_no ILIKE '%' || alert_record.search_term || '%') THEN
        matches_filters := false;
      END IF;
    END IF;
    
    -- Check location match
    IF matches_filters AND jsonb_array_length(alert_record.locations) > 0 THEN
      matches_filters := false;
      IF job_cities IS NOT NULL THEN
        FOR city IN SELECT jsonb_array_elements_text(alert_record.locations) LOOP
          IF city = ANY(job_cities) THEN
            matches_filters := true;
            EXIT;
          END IF;
        END LOOP;
      END IF;
    END IF;
    
    -- Check category match
    IF matches_filters AND jsonb_array_length(alert_record.categories) > 0 THEN
      IF NOT (alert_record.categories ? NEW.category) THEN
        matches_filters := false;
      END IF;
    END IF;
    
    -- Check type match  
    IF matches_filters AND jsonb_array_length(alert_record.types) > 0 THEN
      matches_filters := false;
      -- Check if job type matches any alert type patterns
      IF NEW.type IS NOT NULL THEN
        IF (NEW.type ILIKE '%fixed%' OR NEW.type ILIKE '%term%') AND 
           alert_record.types ? 'Staff - Fixed term' THEN
          matches_filters := true;
        ELSIF (NEW.type ILIKE '%temporary%' OR NEW.type ILIKE '%temp%') AND 
              alert_record.types ? 'Staff - Temporary' THEN
          matches_filters := true;
        ELSIF NEW.type ILIKE '%consultant%' AND 
              alert_record.types ? 'Consultant' THEN
          matches_filters := true;
        ELSIF NEW.type ILIKE '%intern%' AND 
              alert_record.types ? 'Intern' THEN
          matches_filters := true;
        END IF;
      END IF;
    END IF;
    
    -- If all filters match, trigger email notification
    IF matches_filters THEN
      -- Call edge function to send email
      PERFORM http_post(
        url := 'https://cxpnvbphjpntrvvgjhli.supabase.co/functions/v1/send-job-alert',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
        ),
        body := jsonb_build_object(
          'email', alert_record.email,
          'job', row_to_json(NEW),
          'alert_id', alert_record.id
        )
      );
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$function$;