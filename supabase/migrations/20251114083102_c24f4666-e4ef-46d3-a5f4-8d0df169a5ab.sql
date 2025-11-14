-- Add metadata columns to users table for panel validation (IF NOT EXISTS)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'gender') THEN
    ALTER TABLE users ADD COLUMN gender text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'duty_station') THEN
    ALTER TABLE users ADD COLUMN duty_station text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'nationality') THEN
    ALTER TABLE users ADD COLUMN nationality text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'division') THEN
    ALTER TABLE users ADD COLUMN division text;
  END IF;
END $$;

-- Update existing users with known information
UPDATE users SET gender = 'Female', duty_station = 'Geneva', nationality = 'French', division = 'MS' WHERE email = 'laval@unicc.org';
UPDATE users SET gender = 'Male', duty_station = 'Valencia', nationality = 'British', division = 'MS' WHERE email LIKE '%matthew%' OR name ILIKE '%matthew%valente%';
UPDATE users SET gender = 'Female', duty_station = 'Valencia', nationality = 'Hungarian', division = 'MS' WHERE email = 'negyesi@unicc.org';
UPDATE users SET gender = 'Male', duty_station = 'Valencia', nationality = 'Spanish', division = 'MS' WHERE name ILIKE '%diego%' AND email LIKE '%@unicc.org%';
UPDATE users SET gender = 'Female', duty_station = 'Valencia', nationality = 'Spanish', division = 'MS' WHERE name ILIKE '%esther%' AND email LIKE '%@unicc.org%';
UPDATE users SET gender = 'Female', duty_station = 'Valencia', nationality = 'Hungarian', division = 'MS' WHERE name ILIKE '%silvia%' AND email LIKE '%@unicc.org%';

-- Create function to validate panel composition
CREATE OR REPLACE FUNCTION validate_panel_composition(p_job_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
    COUNT(DISTINCT u.division) as division_diversity,
    array_agg(DISTINCT u.duty_station) FILTER (WHERE u.duty_station IS NOT NULL) as stations,
    array_agg(DISTINCT u.nationality) FILTER (WHERE u.nationality IS NOT NULL) as nations,
    array_agg(DISTINCT u.division) FILTER (WHERE u.division IS NOT NULL) as divs
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

  -- Check division diversity
  IF panel_members.division_diversity < 2 THEN
    issues := issues || jsonb_build_object(
      'type', 'error',
      'message', 'Panel must include at least one member from a different division'
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
      'divisions', panel_members.divs
    )
  );
END;
$$;
