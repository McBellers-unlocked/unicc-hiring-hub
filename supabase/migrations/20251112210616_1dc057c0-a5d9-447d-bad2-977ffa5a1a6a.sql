-- Fix search_path security issue properly
DROP TRIGGER IF EXISTS trigger_update_interview_questions_updated_at ON public.job_interview_questions;
DROP FUNCTION IF EXISTS update_interview_questions_updated_at();

CREATE OR REPLACE FUNCTION update_interview_questions_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_interview_questions_updated_at
BEFORE UPDATE ON public.job_interview_questions
FOR EACH ROW
EXECUTE FUNCTION update_interview_questions_updated_at();