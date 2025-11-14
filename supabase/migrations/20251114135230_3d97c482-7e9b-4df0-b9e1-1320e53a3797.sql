-- Delete duplicate feedback responses, keeping only the most recent one
DELETE FROM feedback_form_responses
WHERE id IN (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY application_id, evaluator_id, panel_interview_id 
             ORDER BY updated_at DESC
           ) as rn
    FROM feedback_form_responses
  ) t
  WHERE rn > 1
);

-- Add unique constraint to prevent duplicates in the future
ALTER TABLE feedback_form_responses
ADD CONSTRAINT feedback_form_responses_unique_evaluator_interview 
UNIQUE (application_id, evaluator_id, panel_interview_id);