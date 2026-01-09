-- Fix existing test applicants for Associate Product Delivery and Development Officer job
-- Update present_city and present_country from location field
UPDATE candidates c
SET 
  present_city = split_part(c.location, ', ', 1),
  present_country = split_part(c.location, ', ', 2)
FROM applications a
WHERE a.candidate_id = c.id
  AND a.job_id = '2776db41-6970-4445-bd02-9a53534dd117'
  AND c.present_city IS NULL
  AND c.location IS NOT NULL;

-- Update languages to match PHF format from application phf_data
UPDATE candidates c
SET languages = a.phf_data->'languages'
FROM applications a
WHERE a.candidate_id = c.id
  AND a.job_id = '2776db41-6970-4445-bd02-9a53534dd117'
  AND a.phf_data->'languages' IS NOT NULL;