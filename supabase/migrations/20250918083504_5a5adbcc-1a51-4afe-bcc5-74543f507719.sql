-- Update the existing job with properly formatted competencies from the requisition
UPDATE jobs 
SET competencies = (
  SELECT CASE 
    WHEN jsonb_array_length(jr.core_competencies) > 0 OR jsonb_array_length(jr.management_competencies) > 0 THEN
      CONCAT(
        CASE 
          WHEN jsonb_array_length(jr.core_competencies) > 0 THEN 
            '# Core Competencies' || E'\n\n' || 
            (SELECT string_agg('- ' || (comp::text), E'\n') 
             FROM jsonb_array_elements_text(jr.core_competencies) AS comp)
          ELSE ''
        END,
        CASE 
          WHEN jsonb_array_length(jr.core_competencies) > 0 AND jsonb_array_length(jr.management_competencies) > 0 THEN E'\n\n'
          ELSE ''
        END,
        CASE 
          WHEN jsonb_array_length(jr.management_competencies) > 0 THEN 
            '# Management Competencies' || E'\n\n' || 
            (SELECT string_agg('- ' || (comp::text), E'\n') 
             FROM jsonb_array_elements_text(jr.management_competencies) AS comp)
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