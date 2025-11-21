-- Store G-staff salary scales in system_settings for easy annual updates
-- These can be updated through the system_settings table

-- Valencia (Euros)
INSERT INTO system_settings (key, value, description) VALUES
('g_salary_valencia_g3', '{"min": 44247, "max": 50538, "currency": "EUR"}', 'G3 salary range for Valencia duty station in Euros'),
('g_salary_valencia_g4', '{"min": 50309, "max": 57499, "currency": "EUR"}', 'G4 salary range for Valencia duty station in Euros'),
('g_salary_valencia_g5', '{"min": 57077, "max": 65334, "currency": "EUR"}', 'G5 salary range for Valencia duty station in Euros'),
('g_salary_valencia_g6', '{"min": 64823, "max": 74121, "currency": "EUR"}', 'G6 salary range for Valencia duty station in Euros'),
('g_salary_valencia_g7', '{"min": 73567, "max": 84211, "currency": "EUR"}', 'G7 salary range for Valencia duty station in Euros'),

-- Brindisi (Euros)
('g_salary_brindisi_g3', '{"min": 34318, "max": 40353, "currency": "EUR"}', 'G3 salary range for Brindisi duty station in Euros'),
('g_salary_brindisi_g4', '{"min": 37892, "max": 44628, "currency": "EUR"}', 'G4 salary range for Brindisi duty station in Euros'),
('g_salary_brindisi_g5', '{"min": 41945, "max": 49357, "currency": "EUR"}', 'G5 salary range for Brindisi duty station in Euros'),
('g_salary_brindisi_g6', '{"min": 46372, "max": 54520, "currency": "EUR"}', 'G6 salary range for Brindisi duty station in Euros'),
('g_salary_brindisi_g7', '{"min": 51266, "max": 60365, "currency": "EUR"}', 'G7 salary range for Brindisi duty station in Euros'),

-- Rome (Euros)
('g_salary_rome_g3', '{"min": 46422, "max": 55739, "currency": "EUR"}', 'G3 salary range for Rome duty station in Euros'),
('g_salary_rome_g4', '{"min": 50815, "max": 61883, "currency": "EUR"}', 'G4 salary range for Rome duty station in Euros'),
('g_salary_rome_g5', '{"min": 56684, "max": 69587, "currency": "EUR"}', 'G5 salary range for Rome duty station in Euros'),
('g_salary_rome_g6', '{"min": 65823, "max": 80589, "currency": "EUR"}', 'G6 salary range for Rome duty station in Euros'),
('g_salary_rome_g7', '{"min": 76348, "max": 93552, "currency": "EUR"}', 'G7 salary range for Rome duty station in Euros'),

-- New York (USD)
('g_salary_new_york_g3', '{"min": 58042, "max": 69883, "currency": "USD"}', 'G3 salary range for New York duty station in USD'),
('g_salary_new_york_g4', '{"min": 64578, "max": 77696, "currency": "USD"}', 'G4 salary range for New York duty station in USD'),
('g_salary_new_york_g5', '{"min": 71801, "max": 86383, "currency": "USD"}', 'G5 salary range for New York duty station in USD'),
('g_salary_new_york_g6', '{"min": 79832, "max": 96076, "currency": "USD"}', 'G6 salary range for New York duty station in USD'),
('g_salary_new_york_g7', '{"min": 88766, "max": 106766, "currency": "USD"}', 'G7 salary range for New York duty station in USD'),

-- Geneva (CHF)
('g_salary_geneva_g3', '{"min": 88939, "max": 104432, "currency": "CHF"}', 'G3 salary range for Geneva duty station in CHF'),
('g_salary_geneva_g4', '{"min": 97463, "max": 114386, "currency": "CHF"}', 'G4 salary range for Geneva duty station in CHF'),
('g_salary_geneva_g5', '{"min": 107142, "max": 125635, "currency": "CHF"}', 'G5 salary range for Geneva duty station in CHF'),
('g_salary_geneva_g6', '{"min": 117818, "max": 138058, "currency": "CHF"}', 'G6 salary range for Geneva duty station in CHF'),
('g_salary_geneva_g7', '{"min": 129468, "max": 151651, "currency": "CHF"}', 'G7 salary range for Geneva duty station in CHF')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = now();