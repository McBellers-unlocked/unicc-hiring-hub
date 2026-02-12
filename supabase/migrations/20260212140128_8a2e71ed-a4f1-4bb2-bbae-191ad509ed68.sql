
CREATE TABLE public.affiliate_contract_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id),
  samsaran_pr text,
  affiliate_name text,
  doc_type text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.affiliate_contract_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage affiliate contract documents"
  ON public.affiliate_contract_documents
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
