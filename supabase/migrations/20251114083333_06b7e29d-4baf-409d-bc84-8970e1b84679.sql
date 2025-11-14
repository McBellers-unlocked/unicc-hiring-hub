-- Update gender values from Female/Male to Woman/Man
UPDATE users SET gender = 'Woman' WHERE gender = 'Female';
UPDATE users SET gender = 'Man' WHERE gender = 'Male';

-- Set gender for users that don't have it yet
UPDATE users SET gender = 'Man' WHERE email = 'valente@unicc.org';
UPDATE users SET gender = 'Woman' WHERE email = 'petkov@unicc.org';
UPDATE users SET gender = 'Woman' WHERE email = 'garciaz@unicc.org';

-- Also update missing metadata for completeness
UPDATE users SET duty_station = 'Valencia', nationality = 'Hungarian' WHERE email = 'petkov@unicc.org';
UPDATE users SET duty_station = 'Valencia', nationality = 'Spanish' WHERE email = 'garciaz@unicc.org';
