-- Drop the old unique constraint that prevents multiple bullets from same requirement
ALTER TABLE job_interview_question_requirements 
DROP CONSTRAINT IF EXISTS job_interview_question_requireme_question_id_requirement_id_key;

-- Create new unique index that includes bullet_index
-- COALESCE converts NULL to -1 so NULLs are treated as equal for uniqueness
CREATE UNIQUE INDEX job_interview_question_requirements_unique_idx 
ON job_interview_question_requirements (question_id, requirement_id, COALESCE(bullet_index, -1));