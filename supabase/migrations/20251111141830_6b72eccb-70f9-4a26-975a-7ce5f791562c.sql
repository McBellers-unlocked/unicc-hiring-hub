-- Update candidates with diverse present and permanent locations for Digital Public Solutions Officer job
WITH candidate_list AS (
  SELECT c.id, ROW_NUMBER() OVER (ORDER BY c.id) as rn
  FROM candidates c 
  JOIN applications a ON a.candidate_id = c.id 
  WHERE a.job_id = '9deaea12-c2c5-4c17-8899-a07cf938b0ba'
  LIMIT 100
),
location_updates AS (
  SELECT 
    id,
    CASE (rn - 1) % 20
      WHEN 0 THEN 'Geneva'
      WHEN 1 THEN 'New York'
      WHEN 2 THEN 'London'
      WHEN 3 THEN 'Brussels'
      WHEN 4 THEN 'Vienna'
      WHEN 5 THEN 'Copenhagen'
      WHEN 6 THEN 'Rome'
      WHEN 7 THEN 'Tokyo'
      WHEN 8 THEN 'Singapore'
      WHEN 9 THEN 'Nairobi'
      WHEN 10 THEN 'Dubai'
      WHEN 11 THEN 'Sydney'
      WHEN 12 THEN 'Toronto'
      WHEN 13 THEN 'Madrid'
      WHEN 14 THEN 'Bangkok'
      WHEN 15 THEN 'Cairo'
      WHEN 16 THEN 'Buenos Aires'
      WHEN 17 THEN 'Mumbai'
      WHEN 18 THEN 'São Paulo'
      WHEN 19 THEN 'Johannesburg'
    END as present_city,
    CASE (rn - 1) % 20
      WHEN 0 THEN 'Switzerland'
      WHEN 1 THEN 'United States'
      WHEN 2 THEN 'United Kingdom'
      WHEN 3 THEN 'Belgium'
      WHEN 4 THEN 'Austria'
      WHEN 5 THEN 'Denmark'
      WHEN 6 THEN 'Italy'
      WHEN 7 THEN 'Japan'
      WHEN 8 THEN 'Singapore'
      WHEN 9 THEN 'Kenya'
      WHEN 10 THEN 'United Arab Emirates'
      WHEN 11 THEN 'Australia'
      WHEN 12 THEN 'Canada'
      WHEN 13 THEN 'Spain'
      WHEN 14 THEN 'Thailand'
      WHEN 15 THEN 'Egypt'
      WHEN 16 THEN 'Argentina'
      WHEN 17 THEN 'India'
      WHEN 18 THEN 'Brazil'
      WHEN 19 THEN 'South Africa'
    END as present_country,
    CASE (rn - 1) % 20
      WHEN 0 THEN 'Paris'
      WHEN 1 THEN 'Boston'
      WHEN 2 THEN 'Manchester'
      WHEN 3 THEN 'Amsterdam'
      WHEN 4 THEN 'Berlin'
      WHEN 5 THEN 'Stockholm'
      WHEN 6 THEN 'Milan'
      WHEN 7 THEN 'Osaka'
      WHEN 8 THEN 'Kuala Lumpur'
      WHEN 9 THEN 'Kampala'
      WHEN 10 THEN 'Abu Dhabi'
      WHEN 11 THEN 'Melbourne'
      WHEN 12 THEN 'Vancouver'
      WHEN 13 THEN 'Barcelona'
      WHEN 14 THEN 'Chiang Mai'
      WHEN 15 THEN 'Alexandria'
      WHEN 16 THEN 'Córdoba'
      WHEN 17 THEN 'Delhi'
      WHEN 18 THEN 'Rio de Janeiro'
      WHEN 19 THEN 'Cape Town'
    END as permanent_city,
    CASE (rn - 1) % 20
      WHEN 0 THEN 'France'
      WHEN 1 THEN 'United States'
      WHEN 2 THEN 'United Kingdom'
      WHEN 3 THEN 'Netherlands'
      WHEN 4 THEN 'Germany'
      WHEN 5 THEN 'Sweden'
      WHEN 6 THEN 'Italy'
      WHEN 7 THEN 'Japan'
      WHEN 8 THEN 'Malaysia'
      WHEN 9 THEN 'Uganda'
      WHEN 10 THEN 'United Arab Emirates'
      WHEN 11 THEN 'Australia'
      WHEN 12 THEN 'Canada'
      WHEN 13 THEN 'Spain'
      WHEN 14 THEN 'Thailand'
      WHEN 15 THEN 'Egypt'
      WHEN 16 THEN 'Argentina'
      WHEN 17 THEN 'India'
      WHEN 18 THEN 'Brazil'
      WHEN 19 THEN 'South Africa'
    END as permanent_country
  FROM candidate_list
)
UPDATE candidates c
SET 
  present_city = lu.present_city,
  present_country = lu.present_country,
  permanent_city = lu.permanent_city,
  permanent_country = lu.permanent_country
FROM location_updates lu
WHERE c.id = lu.id;
