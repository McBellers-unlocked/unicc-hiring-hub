-- Update the specific job to include UN language advantage in language requirements
UPDATE jobs 
SET language_requirements = '# Language Requirements

## Required Language Skills

- **English**: Expert knowledge is required

## Additional Language Skills

- Knowledge of another UN language would be an advantage'
WHERE id = '7d39e5da-d20f-45e0-96d8-24a34246da02';