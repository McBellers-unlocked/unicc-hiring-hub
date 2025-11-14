-- Create enum for panel member roles
CREATE TYPE panel_member_role AS ENUM ('Hiring Manager', 'Additional Panel Member', 'Subject Matter Expert', 'HR Rep');

-- Add metadata columns to users table for panel validation
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS gender text,
ADD COLUMN IF NOT EXISTS duty_station text,
ADD COLUMN IF NOT EXISTS nationality text,
ADD COLUMN IF NOT EXISTS division text;

-- Update existing users with known information
UPDATE users SET gender = 'Female', duty_station = 'Geneva', nationality = 'French', division = 'MS' WHERE email = 'laval@unicc.org';
UPDATE users SET gender = 'Male', duty_station = 'Valencia', nationality = 'British', division = 'MS' WHERE email LIKE '%matthew%' OR name ILIKE '%matthew%valente%';
UPDATE users SET gender = 'Female', duty_station = 'Valencia', nationality = 'Hungarian', division = 'MS' WHERE email = 'negyesi@unicc.org';
UPDATE users SET gender = 'Male', duty_station = 'Valencia', nationality = 'Spanish', division = 'MS' WHERE name ILIKE '%diego%' AND email LIKE '%@unicc.org%';
UPDATE users SET gender = 'Female', duty_station = 'Valencia', nationality = 'Spanish', division = 'MS' WHERE name ILIKE '%esther%' AND email LIKE '%@unicc.org%';
UPDATE users SET gender = 'Female', duty_station = 'Valencia', nationality = 'Hungarian', division = 'MS' WHERE name ILIKE '%silvia%' AND email LIKE '%@unicc.org%';

-- Create table for job interview panel members
CREATE TABLE IF NOT EXISTS job_interview_panel_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  panel_role panel_member_role NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(job_id, user_id, panel_role)
);

-- Enable RLS on job_interview_panel_members
ALTER TABLE job_interview_panel_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "HR and Hiring Managers can manage interview panel members"
  ON job_interview_panel_members
  FOR ALL
  USING (
    has_role(auth.uid(), 'Admin'::user_role) OR 
    has_role(auth.uid(), 'HR Assistant'::user_role) OR 
    has_role(auth.uid(), 'Chief of HR'::user_role) OR
    has_role(auth.uid(), 'Hiring Manager'::user_role)
  );

CREATE POLICY "Staff can view interview panel members"
  ON job_interview_panel_members
  FOR SELECT
  USING (
    has_role(auth.uid(), 'Admin'::user_role) OR 
    has_role(auth.uid(), 'HR Assistant'::user_role) OR 
    has_role(auth.uid(), 'Chief of HR'::user_role) OR 
    has_role(auth.uid(), 'Hiring Manager'::user_role) OR
    has_role(auth.uid(), 'Panel Member'::user_role)
  );

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
  gender_count jsonb;
  duty_stations text[];
  nationalities text[];
  divisions text[];
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
    jsonb_object_agg(COALESCE(u.gender, 'Unknown'), COUNT(*)) as gender_breakdown,
    array_agg(DISTINCT u.duty_station) as stations,
    array_agg(DISTINCT u.nationality) as nations,
    array_agg(DISTINCT u.division) as divs
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

-- Add trigger to update updated_at
CREATE TRIGGER update_job_interview_panel_members_updated_at
  BEFORE UPDATE ON job_interview_panel_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
