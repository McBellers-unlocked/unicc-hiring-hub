ALTER TABLE public.affiliate_contract_history
  ADD COLUMN unit_price NUMERIC NULL,
  ADD COLUMN unit TEXT NULL,
  ADD COLUMN currency TEXT NULL;