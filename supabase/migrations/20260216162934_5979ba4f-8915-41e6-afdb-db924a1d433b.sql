
-- 1. Add is_open_source flag to skill_definitions
ALTER TABLE public.skill_definitions
ADD COLUMN is_open_source BOOLEAN NOT NULL DEFAULT false;

-- 2. Create open_source_products table
CREATE TABLE public.open_source_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  website_url TEXT,
  license_type TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create product_skill_mappings join table
CREATE TABLE public.product_skill_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.open_source_products(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.skill_definitions(id) ON DELETE CASCADE,
  UNIQUE(product_id, skill_id)
);

-- 4. Enable RLS
ALTER TABLE public.open_source_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_skill_mappings ENABLE ROW LEVEL SECURITY;

-- 5. RLS policies for open_source_products
CREATE POLICY "Authenticated users can view open source products"
ON public.open_source_products FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admin HR can manage open source products"
ON public.open_source_products FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'Admin'::user_role)
  OR has_role(auth.uid(), 'HR Assistant'::user_role)
  OR has_role(auth.uid(), 'Chief of HR'::user_role)
);

-- 6. RLS policies for product_skill_mappings
CREATE POLICY "Authenticated users can view product skill mappings"
ON public.product_skill_mappings FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admin HR can manage product skill mappings"
ON public.product_skill_mappings FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'Admin'::user_role)
  OR has_role(auth.uid(), 'HR Assistant'::user_role)
  OR has_role(auth.uid(), 'Chief of HR'::user_role)
);

-- 7. Indexes
CREATE INDEX idx_product_skill_mappings_product ON public.product_skill_mappings(product_id);
CREATE INDEX idx_product_skill_mappings_skill ON public.product_skill_mappings(skill_id);
CREATE INDEX idx_skill_definitions_open_source ON public.skill_definitions(is_open_source) WHERE is_open_source = true;

-- 8. Timestamp trigger for open_source_products
CREATE TRIGGER update_open_source_products_updated_at
BEFORE UPDATE ON public.open_source_products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
