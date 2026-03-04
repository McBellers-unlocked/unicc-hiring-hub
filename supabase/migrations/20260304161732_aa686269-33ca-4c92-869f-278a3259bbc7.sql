-- 1. Create sequence for record numbers
CREATE SEQUENCE IF NOT EXISTS public.affiliate_contract_record_seq START WITH 1;

-- 2. Add record_number column (nullable first for backfill)
ALTER TABLE public.affiliate_contract_history
  ADD COLUMN IF NOT EXISTS record_number TEXT UNIQUE;

-- 3. Backfill existing rows
UPDATE public.affiliate_contract_history
SET record_number = 'ACH-' || LPAD(nextval('public.affiliate_contract_record_seq')::TEXT, 4, '0')
WHERE record_number IS NULL;

-- 4. Make it NOT NULL after backfill
ALTER TABLE public.affiliate_contract_history
  ALTER COLUMN record_number SET NOT NULL;

-- 5. Create trigger function for auto-generating record_number on insert
CREATE OR REPLACE FUNCTION public.set_contract_record_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.record_number IS NULL OR NEW.record_number = '' THEN
    NEW.record_number := 'ACH-' || LPAD(nextval('public.affiliate_contract_record_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

-- 6. Create trigger
DROP TRIGGER IF EXISTS trg_set_contract_record_number ON public.affiliate_contract_history;
CREATE TRIGGER trg_set_contract_record_number
  BEFORE INSERT ON public.affiliate_contract_history
  FOR EACH ROW
  EXECUTE FUNCTION public.set_contract_record_number();

-- 7. Add contract_record_id to affiliate_lifecycle_checklists
ALTER TABLE public.affiliate_lifecycle_checklists
  ADD COLUMN IF NOT EXISTS contract_record_id TEXT;

-- 8. Backfill contract_record_id from existing samsaran_pr + user_id join
UPDATE public.affiliate_lifecycle_checklists alc
SET contract_record_id = ach.record_number
FROM public.affiliate_contract_history ach
WHERE alc.user_id = ach.user_id
  AND alc.samsaran_pr = ach.samsaran_pr
  AND alc.contract_record_id IS NULL;