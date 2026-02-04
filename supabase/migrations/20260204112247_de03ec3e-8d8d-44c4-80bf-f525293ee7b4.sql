-- Enum for assessment types
CREATE TYPE assessment_type AS ENUM ('inbox_simulation', 'research_exercise');

-- Add new columns to written_assessments
ALTER TABLE written_assessments 
ADD COLUMN IF NOT EXISTS assessment_type assessment_type DEFAULT 'inbox_simulation',
ADD COLUMN IF NOT EXISTS time_limit_hours INTEGER,
ADD COLUMN IF NOT EXISTS reference_document_url TEXT,
ADD COLUMN IF NOT EXISTS reference_document_name TEXT;

-- Assessment Series table - groups assessments together with overall timing
CREATE TABLE assessment_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  series_opens_at TIMESTAMPTZ,
  series_closes_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  status assessment_status DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Parts linking table - links assessments to series with ordering
CREATE TABLE assessment_series_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID REFERENCES assessment_series(id) ON DELETE CASCADE,
  assessment_id UUID REFERENCES written_assessments(id) ON DELETE CASCADE,
  part_number INTEGER NOT NULL,
  part_title TEXT,
  unlock_after_previous BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(series_id, part_number)
);

-- Candidate access to series portal
CREATE TABLE assessment_series_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID REFERENCES assessment_series(id) ON DELETE CASCADE,
  candidate_name TEXT NOT NULL,
  candidate_email TEXT NOT NULL,
  access_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Research exercise file submissions
CREATE TABLE research_exercise_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id UUID REFERENCES assessment_slots(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size_bytes INTEGER,
  submitted_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE assessment_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_series_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_series_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_exercise_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for assessment_series
CREATE POLICY "Admins and HR can view all series"
ON assessment_series FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('Admin', 'HR Assistant')
  )
);

CREATE POLICY "Admins and HR can create series"
ON assessment_series FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('Admin', 'HR Assistant')
  )
);

CREATE POLICY "Admins and HR can update series"
ON assessment_series FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('Admin', 'HR Assistant')
  )
);

CREATE POLICY "Admins and HR can delete series"
ON assessment_series FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('Admin', 'HR Assistant')
  )
);

-- RLS Policies for assessment_series_parts
CREATE POLICY "Admins and HR can manage series parts"
ON assessment_series_parts FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('Admin', 'HR Assistant')
  )
);

-- RLS Policies for assessment_series_candidates
CREATE POLICY "Admins and HR can manage series candidates"
ON assessment_series_candidates FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('Admin', 'HR Assistant')
  )
);

CREATE POLICY "Candidates can view their own series access"
ON assessment_series_candidates FOR SELECT
USING (true);

-- RLS Policies for research_exercise_submissions
CREATE POLICY "Admins and HR can view all submissions"
ON research_exercise_submissions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('Admin', 'HR Assistant')
  )
);

CREATE POLICY "Anyone can insert submissions via token validation"
ON research_exercise_submissions FOR INSERT
WITH CHECK (true);

-- Create storage bucket for assessment documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('assessment-documents', 'assessment-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for assessment-documents bucket
CREATE POLICY "Admins can upload reference documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'assessment-documents' 
  AND (storage.foldername(name))[1] = 'reference-documents'
  AND EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('Admin', 'HR Assistant')
  )
);

CREATE POLICY "Admins can view all assessment documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'assessment-documents'
  AND EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('Admin', 'HR Assistant')
  )
);

CREATE POLICY "Anyone can upload candidate submissions"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'assessment-documents' 
  AND (storage.foldername(name))[1] = 'submissions'
);

CREATE POLICY "Anyone can download reference documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'assessment-documents'
  AND (storage.foldername(name))[1] = 'reference-documents'
);

-- Trigger for updated_at on assessment_series
CREATE TRIGGER update_assessment_series_updated_at
BEFORE UPDATE ON assessment_series
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Function to validate series token and get series info
CREATE OR REPLACE FUNCTION validate_series_token(p_token TEXT)
RETURNS TABLE (
  series_id UUID,
  candidate_id UUID,
  candidate_name TEXT,
  candidate_email TEXT,
  series_title TEXT,
  series_description TEXT,
  series_opens_at TIMESTAMPTZ,
  series_closes_at TIMESTAMPTZ,
  series_status assessment_status
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id as series_id,
    sc.id as candidate_id,
    sc.candidate_name,
    sc.candidate_email,
    s.title as series_title,
    s.description as series_description,
    s.series_opens_at,
    s.series_closes_at,
    s.status as series_status
  FROM assessment_series_candidates sc
  JOIN assessment_series s ON s.id = sc.series_id
  WHERE sc.access_token = p_token
    AND s.status = 'active'
    AND (s.series_opens_at IS NULL OR s.series_opens_at <= now())
    AND (s.series_closes_at IS NULL OR s.series_closes_at > now());
END;
$$;

-- Function to get series parts with completion status
CREATE OR REPLACE FUNCTION get_series_parts_with_status(p_series_id UUID, p_candidate_email TEXT)
RETURNS TABLE (
  part_id UUID,
  part_number INTEGER,
  part_title TEXT,
  assessment_id UUID,
  assessment_title TEXT,
  assessment_type assessment_type,
  time_limit_minutes INTEGER,
  time_limit_hours INTEGER,
  unlock_after_previous BOOLEAN,
  slot_id UUID,
  slot_status assessment_slot_status,
  started_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  is_unlocked BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prev_completed BOOLEAN := true;
BEGIN
  RETURN QUERY
  WITH part_data AS (
    SELECT 
      sp.id as part_id,
      sp.part_number,
      sp.part_title,
      sp.assessment_id,
      wa.title as assessment_title,
      wa.assessment_type,
      wa.time_limit_minutes,
      wa.time_limit_hours,
      sp.unlock_after_previous,
      slot.id as slot_id,
      slot.status as slot_status,
      slot.started_at,
      slot.submitted_at,
      LAG(slot.status) OVER (ORDER BY sp.part_number) as prev_slot_status
    FROM assessment_series_parts sp
    JOIN written_assessments wa ON wa.id = sp.assessment_id
    LEFT JOIN assessment_slots slot ON slot.assessment_id = sp.assessment_id 
      AND slot.candidate_email = p_candidate_email
    WHERE sp.series_id = p_series_id
    ORDER BY sp.part_number
  )
  SELECT 
    pd.part_id,
    pd.part_number,
    pd.part_title,
    pd.assessment_id,
    pd.assessment_title,
    pd.assessment_type,
    pd.time_limit_minutes,
    pd.time_limit_hours,
    pd.unlock_after_previous,
    pd.slot_id,
    pd.slot_status,
    pd.started_at,
    pd.submitted_at,
    CASE 
      WHEN pd.part_number = 1 THEN true
      WHEN NOT pd.unlock_after_previous THEN true
      WHEN pd.prev_slot_status = 'completed' THEN true
      ELSE false
    END as is_unlocked
  FROM part_data pd
  ORDER BY pd.part_number;
END;
$$;