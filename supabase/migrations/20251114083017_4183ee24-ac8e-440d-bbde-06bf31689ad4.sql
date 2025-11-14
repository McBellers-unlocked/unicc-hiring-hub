-- Update user metadata for Matt Valente, Szilvia, and Zulema
UPDATE public.users
SET 
  nationality = 'United Kingdom',
  duty_station = 'Valencia',
  division = 'MS'
WHERE email LIKE '%valente%@unicc.org';

UPDATE public.users
SET 
  nationality = 'Hungary',
  duty_station = 'Valencia',
  division = 'MS'
WHERE email LIKE '%szilvia%@unicc.org' OR email LIKE '%silvia%@unicc.org';

UPDATE public.users
SET 
  nationality = 'Spain',
  duty_station = 'Valencia',
  division = 'MS'
WHERE email LIKE '%zulema%@unicc.org';