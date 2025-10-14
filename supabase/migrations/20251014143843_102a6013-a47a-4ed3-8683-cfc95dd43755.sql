-- Add essential criteria for Penetration Testing Officer job
INSERT INTO essential_criteria (job_id, label, weight, must_have, validator, params)
SELECT 
  id as job_id,
  'Education in Cybersecurity, Information Security, Computer Science, or related field' as label,
  2 as weight,
  true as must_have,
  'education_field' as validator,
  jsonb_build_object(
    'required_fields', ARRAY['Cybersecurity', 'Information Security', 'Computer Science', 'Telecommunications', 'Information Technology', 'Engineering'],
    'min_level', 'Bachelor'
  ) as params
FROM jobs 
WHERE title ILIKE '%Penetration Testing%'
  AND NOT EXISTS (
    SELECT 1 FROM essential_criteria ec WHERE ec.job_id = jobs.id AND ec.label ILIKE '%Education%'
  );

INSERT INTO essential_criteria (job_id, label, weight, must_have, validator, params)
SELECT 
  id as job_id,
  'At least 5 years of experience in Cybersecurity roles with focus on offensive security, ethical hacking, or penetration testing' as label,
  3 as weight,
  true as must_have,
  'experience_area' as validator,
  jsonb_build_object(
    'min_years', 5,
    'required_areas', ARRAY['cybersecurity', 'offensive security', 'ethical hacking', 'penetration testing', 'security testing', 'vulnerability assessment', 'security analyst', 'information security']
  ) as params
FROM jobs 
WHERE title ILIKE '%Penetration Testing%'
  AND NOT EXISTS (
    SELECT 1 FROM essential_criteria ec WHERE ec.job_id = jobs.id AND ec.label ILIKE '%experience%'
  );