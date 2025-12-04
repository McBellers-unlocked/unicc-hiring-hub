CREATE OR REPLACE FUNCTION public.validate_panel_composition(p_job_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  panel_members RECORD;
  issues jsonb := '[]'::jsonb;
  warnings jsonb := '[]'::jsonb;
BEGIN
  -- Get panel member details
  SELECT 
    COUNT(*) as total_members,
    COUNT(DISTINCT u.gender) as gender_diversity,
    COUNT(DISTINCT u.duty_station) as station_diversity,
    COUNT(DISTINCT u.nationality) as nationality_diversity,
    COUNT(DISTINCT u.unit) as unit_diversity,
    array_agg(DISTINCT u.duty_station) FILTER (WHERE u.duty_station IS NOT NULL) as stations,
    array_agg(DISTINCT u.nationality) FILTER (WHERE u.nationality IS NOT NULL) as nations,
    array_agg(DISTINCT u.unit) FILTER (WHERE u.unit IS NOT NULL) as units
  INTO panel_members
  FROM job_interview_panel_members pm
  JOIN users u ON u.id = pm.user_id
  WHERE pm.job_id = p_job_id;

  -- Check minimum panel size
  IF panel_members.total_members < 3 THEN
    issues := issues || jsonb_build_object(
      'type', 'error',
      'message', format('Panel must have at least 3 members (currently %s)', panel_members.total_members)
    );
  END IF;

  -- Check gender balance
  IF panel_members.gender_diversity < 2 THEN
    issues := issues || jsonb_build_object(
      'type', 'error',
      'message', 'Panel must be gender-balanced (at least one male and one female member)'
    );
  END IF;

  -- Check duty station diversity
  IF panel_members.station_diversity < 2 THEN
    warnings := warnings || jsonb_build_object(
      'type', 'warning',
      'message', 'Recommended: Panel members from different duty stations'
    );
  END IF;

  -- Check nationality diversity
  IF panel_members.nationality_diversity < 2 THEN
    warnings := warnings || jsonb_build_object(
      'type', 'warning',
      'message', 'Recommended: Panel members with different nationalities'
    );
  END IF;

  -- Check unit diversity - info recommendation
  IF panel_members.unit_diversity < 2 THEN
    warnings := warnings || jsonb_build_object(
      'type', 'info',
      'message', 'Selection policy recommends including panel members from another Unit or not reporting to the same manager as the Hiring Manager'
    );
  END IF;

  -- Check required roles
  IF NOT EXISTS (
    SELECT 1 FROM job_interview_panel_members 
    WHERE job_id = p_job_id AND panel_role = 'Hiring Manager'
  ) THEN
    issues := issues || jsonb_build_object(
      'type', 'error',
      'message', 'Panel must have a Hiring Manager'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM job_interview_panel_members 
    WHERE job_id = p_job_id AND panel_role = 'HR Rep'
  ) THEN
    warnings := warnings || jsonb_build_object(
      'type', 'warning',
      'message', 'Recommended: Include an HR Representative'
    );
  END IF;

  RETURN jsonb_build_object(
    'valid', jsonb_array_length(issues) = 0,
    'issues', issues,
    'warnings', warnings,
    'summary', jsonb_build_object(
      'total_members', panel_members.total_members,
      'gender_diversity', panel_members.gender_diversity,
      'duty_stations', panel_members.stations,
      'nationalities', panel_members.nations,
      'units', panel_members.units
    )
  );
END;
$function$;