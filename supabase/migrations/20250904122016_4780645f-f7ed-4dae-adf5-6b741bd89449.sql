-- Update gender for specific candidates to test gender diversity calculations
UPDATE public.candidates 
SET gender = 'Female' 
WHERE name IN ('Tanya Valente', 'Sarah Johnson', 'Test Test');