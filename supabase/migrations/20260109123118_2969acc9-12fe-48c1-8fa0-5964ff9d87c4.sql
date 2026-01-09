-- Fix existing test applicants for Associate Product Delivery and Development Officer job
-- Remove UN languages with all 'none' levels from the languages JSON

-- Update candidates.languages to only include UN languages with actual levels
UPDATE candidates c
SET languages = jsonb_build_object(
  'un_languages', (
    SELECT COALESCE(jsonb_object_agg(key, value), '{}')
    FROM jsonb_each(c.languages->'un_languages') 
    WHERE value->>'read' != 'none' OR value->>'speak' != 'none' OR value->>'write' != 'none'
  ),
  'other_languages', COALESCE(c.languages->'other_languages', '[]')
)
FROM applications a
WHERE a.candidate_id = c.id
  AND a.job_id = '2776db41-6970-4445-bd02-9a53534dd117'
  AND c.languages->'un_languages' IS NOT NULL
  AND jsonb_typeof(c.languages->'un_languages') = 'object';

-- Also update the phf_data.languages in applications table
UPDATE applications a
SET phf_data = jsonb_set(
  phf_data,
  '{languages}',
  jsonb_build_object(
    'un_languages', (
      SELECT COALESCE(jsonb_object_agg(key, value), '{}')
      FROM jsonb_each(a.phf_data->'languages'->'un_languages') 
      WHERE value->>'read' != 'none' OR value->>'speak' != 'none' OR value->>'write' != 'none'
    ),
    'other_languages', COALESCE(a.phf_data->'languages'->'other_languages', '[]')
  )
)
WHERE a.job_id = '2776db41-6970-4445-bd02-9a53534dd117'
  AND a.phf_data->'languages'->'un_languages' IS NOT NULL
  AND jsonb_typeof(a.phf_data->'languages'->'un_languages') = 'object';