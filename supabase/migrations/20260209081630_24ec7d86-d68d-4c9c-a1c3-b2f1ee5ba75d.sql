-- Add unique constraint for MCQ responses upsert
ALTER TABLE public.assessment_mcq_responses
ADD CONSTRAINT assessment_mcq_responses_slot_question_unique 
UNIQUE (slot_id, question_id);