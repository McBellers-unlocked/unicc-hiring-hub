
-- Allow authenticated users to insert new skill suggestions (status = 'new')
CREATE POLICY "Authenticated users can suggest new skills"
ON public.skill_definitions
FOR INSERT
TO authenticated
WITH CHECK (status = 'new' AND ai_review_pending = true);

-- Seed Supabase as an OSS skill
INSERT INTO public.skill_definitions (name, category, skill_type, status, is_open_source, is_active, ai_review_pending)
VALUES ('Supabase', 'Technical & Domain', 'proficiency', 'established', true, true, false);

-- Seed Supabase into open_source_products
INSERT INTO public.open_source_products (name, license_type, website_url, is_active)
VALUES ('Supabase', 'Apache 2.0', 'https://supabase.com', true);

-- Create mapping between product and skill
INSERT INTO public.product_skill_mappings (product_id, skill_id)
SELECT p.id, s.id
FROM public.open_source_products p, public.skill_definitions s
WHERE p.name = 'Supabase' AND s.name = 'Supabase';
