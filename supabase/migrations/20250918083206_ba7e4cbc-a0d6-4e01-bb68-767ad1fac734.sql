-- Update the existing job with properly formatted competencies from the requisition
UPDATE jobs 
SET competencies = (
  SELECT CASE 
    WHEN array_length(jr.core_competencies, 1) > 0 OR array_length(jr.management_competencies, 1) > 0 THEN
      CONCAT(
        CASE 
          WHEN array_length(jr.core_competencies, 1) > 0 THEN 
            '# Core Competencies' || E'\n\n' || 
            array_to_string(
              ARRAY(SELECT '- ' || comp FROM unnest(jr.core_competencies) AS comp), 
              E'\n'
            )
          ELSE ''
        END,
        CASE 
          WHEN array_length(jr.core_competencies, 1) > 0 AND array_length(jr.management_competencies, 1) > 0 THEN E'\n\n'
          ELSE ''
        END,
        CASE 
          WHEN array_length(jr.management_competencies, 1) > 0 THEN 
            '# Management Competencies' || E'\n\n' || 
            array_to_string(
              ARRAY(SELECT '- ' || comp FROM unnest(jr.management_competencies) AS comp), 
              E'\n'
            )
          ELSE ''
        END
      )
    ELSE 'No specific competencies defined'
  END
  FROM job_requisitions jr
  WHERE jr.converted_to_job_id = jobs.id
  AND jr.id = '5441764c-46cb-4049-9f3d-af392f52c218'
)
WHERE id IN (
  SELECT converted_to_job_id 
  FROM job_requisitions 
  WHERE id = '5441764c-46cb-4049-9f3d-af392f52c218'
);