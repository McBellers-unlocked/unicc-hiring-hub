-- Fix the existing workplan with correct supervisor IDs
UPDATE workplans
SET 
  supervisor1_id = 'da6f4a98-9a57-4138-beb8-7cdb5117db6e',  -- Anna NEGYESI-MOUYSSET
  supervisor2_id = 'e274ffe9-be04-4b46-9cf4-d4cec50daeb6'   -- Frederic LAVAL (Anna's manager)
WHERE id = 'c8886b34-6bfd-449c-9caa-3433f42db593';