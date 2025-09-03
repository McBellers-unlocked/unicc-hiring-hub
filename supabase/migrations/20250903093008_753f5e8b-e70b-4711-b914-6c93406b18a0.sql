-- Insert the Administrative Assistant job
INSERT INTO public.jobs (
  title,
  category,
  notice_no,
  type,
  positions,
  grade,
  salary_estimate,
  location,
  org_unit,
  issue_date,
  closing_date,
  timezone,
  description_md,
  requirements_md,
  eligibility_note,
  privacy_notice_url,
  attachments_required,
  branding,
  status
) VALUES (
  'Administrative Assistant',
  'Vacancy',
  'ICC/25/NY/1',
  'Temporary - 6 months',
  1,
  'G4',
  'USD 49,696 (net, single rate)',
  'New York, USA',
  'Cybersecurity Division (CS)',
  '2025-08-25',
  '2025-09-15T23:59:59+02:00',
  'Europe/Zurich',
  '(paste Position Description text)',
  '(paste Experience/Skills/Education/Languages/Competencies)',
  'Local recruitment per UN Staff Rule 4.4; applications accepted until midnight (Geneva Time) on closing date.',
  'https://www.unicc.org/unicc-privacy-notice-for-applicants/',
  '["Motivation Letter"]'::jsonb,
  '{"theme": "UNICC"}'::jsonb,
  'active'
);

-- Get the job ID for the essential criteria and killer questions
DO $$
DECLARE
  job_uuid UUID;
BEGIN
  -- Get the job ID we just created
  SELECT id INTO job_uuid FROM public.jobs WHERE notice_no = 'ICC/25/NY/1';
  
  -- Insert Essential Criteria
  INSERT INTO public.essential_criteria (job_id, label, weight, must_have) VALUES
    (job_uuid, '≥3 years admin support incl. senior mgmt & international', 25, true),
    (job_uuid, 'Drafting & editing official correspondence', 15, true),
    (job_uuid, 'MS Word/Excel/PowerPoint/Visio', 10, true),
    (job_uuid, 'Organizational skills under pressure', 10, false),
    (job_uuid, 'Indicator tracking & database reports', 10, false),
    (job_uuid, 'English expert', 15, true),
    (job_uuid, 'Local eligibility (NY)', 10, true),
    (job_uuid, 'Basic finance understanding (desirable)', 5, false);
  
  -- Insert Killer Questions
  INSERT INTO public.killer_questions (job_id, label, input_type, rule) VALUES
    (job_uuid, 'Are you eligible for local recruitment in New York?', 'boolean', 'yes_required'),
    (job_uuid, 'Do you have ≥3 years of administrative experience including support to senior management?', 'boolean', 'yes_required'),
    (job_uuid, 'Is your English at expert level?', 'boolean', 'yes_required');
END $$;