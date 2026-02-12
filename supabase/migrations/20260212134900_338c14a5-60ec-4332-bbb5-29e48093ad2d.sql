
CREATE TABLE public.affiliate_contract_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id),
  samsaran_pr TEXT,
  samsaran_po TEXT,
  gsm_reg_number TEXT,
  gsm_po TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.affiliate_contract_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select affiliate contract history"
  ON public.affiliate_contract_history FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert affiliate contract history"
  ON public.affiliate_contract_history FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update affiliate contract history"
  ON public.affiliate_contract_history FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete affiliate contract history"
  ON public.affiliate_contract_history FOR DELETE TO authenticated USING (true);
