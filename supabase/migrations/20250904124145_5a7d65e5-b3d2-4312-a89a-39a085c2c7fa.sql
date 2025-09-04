-- Create email alerts subscription table
CREATE TABLE public.job_email_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  search_term TEXT,
  locations JSONB DEFAULT '[]'::jsonb,
  categories JSONB DEFAULT '[]'::jsonb,
  types JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.job_email_alerts ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since candidates aren't authenticated)
CREATE POLICY "Anyone can create email alerts" 
ON public.job_email_alerts 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can view their own alerts by email" 
ON public.job_email_alerts 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can update their own alerts" 
ON public.job_email_alerts 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete their own alerts" 
ON public.job_email_alerts 
FOR DELETE 
USING (true);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_job_email_alerts_updated_at
BEFORE UPDATE ON public.job_email_alerts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for efficient email lookups
CREATE INDEX idx_job_email_alerts_email ON public.job_email_alerts(email);
CREATE INDEX idx_job_email_alerts_active ON public.job_email_alerts(is_active);

-- Create function to send job alert emails when new jobs are posted
CREATE OR REPLACE FUNCTION public.send_job_alerts()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to send alerts when new jobs are created
CREATE TRIGGER trigger_send_job_alerts
AFTER INSERT ON public.jobs
FOR EACH ROW
WHEN (NEW.status = 'active')
EXECUTE FUNCTION public.send_job_alerts();