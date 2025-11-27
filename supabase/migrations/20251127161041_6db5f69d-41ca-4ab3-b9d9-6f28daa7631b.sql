-- Update PD reminder template to use verified email address
UPDATE system_settings 
SET value = jsonb_set(
  value::jsonb,
  '{from_email}',
  '"recruitment@unicconnect.org"'
)
WHERE key = 'email_template_pd_reminder'
  AND value::jsonb->>'from_email' = 'hr@unicconnect.org';

-- Update any other email templates that might use hr@unicconnect.org
UPDATE system_settings 
SET value = jsonb_set(
  value::jsonb,
  '{from_email}',
  '"recruitment@unicconnect.org"'
)
WHERE key LIKE 'email_template_%'
  AND value::jsonb->>'from_email' = 'hr@unicconnect.org';