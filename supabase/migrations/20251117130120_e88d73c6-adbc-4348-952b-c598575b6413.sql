
-- Add missing UN language requirements for jobs converted from requisitions
-- that had un_language_advantage = true but are missing the UN language entry

INSERT INTO job_language_requirements (job_id, language, level, is_essential, order_index)
SELECT 
  jr.converted_to_job_id,
  'Any UN Language (French, Spanish, Arabic, Chinese, Russian)',
  'Working',
  false,
  (
    SELECT COALESCE(MAX(order_index), 0) + 1 
    FROM job_language_requirements 
    WHERE job_id = jr.converted_to_job_id
  )
FROM job_requisitions jr
WHERE jr.converted_to_job_id IS NOT NULL
  AND jr.language_requirements->>'un_language_advantage' = 'true'
  AND NOT EXISTS (
    SELECT 1 
    FROM job_language_requirements jlr
    WHERE jlr.job_id = jr.converted_to_job_id
      AND jlr.language LIKE '%UN Language%'
  )
ON CONFLICT DO NOTHING;
