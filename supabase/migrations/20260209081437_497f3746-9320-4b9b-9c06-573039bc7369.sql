-- Drop and recreate validate_assessment_token function to return assessment_type
DROP FUNCTION IF EXISTS public.validate_assessment_token(text);

CREATE FUNCTION public.validate_assessment_token(p_token TEXT)
RETURNS TABLE (
  slot_id UUID,
  assessment_id UUID,
  candidate_name TEXT,
  candidate_email TEXT,
  status assessment_slot_status,
  scheduled_start TIMESTAMP WITH TIME ZONE,
  scheduled_end TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  time_limit_minutes INTEGER,
  curveball_trigger_type curveball_trigger_type,
  curveball_trigger_value INTEGER,
  instructions TEXT,
  title TEXT,
  assessment_type assessment_type
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id AS slot_id,
    s.assessment_id,
    s.candidate_name,
    s.candidate_email,
    s.status,
    s.scheduled_start,
    s.scheduled_end,
    s.started_at,
    a.time_limit_minutes,
    a.curveball_trigger_type,
    a.curveball_trigger_value,
    a.instructions,
    a.title,
    a.assessment_type
  FROM assessment_slots s
  JOIN written_assessments a ON a.id = s.assessment_id
  WHERE s.access_token = p_token
    AND s.status IN ('scheduled', 'in_progress');
END;
$$;