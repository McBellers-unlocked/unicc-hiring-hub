DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'users' 
      AND policyname = 'Division chiefs can view users'
  ) THEN
    CREATE POLICY "Division chiefs can view users"
    ON public.users
    FOR SELECT
    USING (
      auth.jwt() ->> 'email' = ANY (ARRAY[
        'soni@unicc.org',   -- Tima SONI - CS
        'liuzzi@unicc.org', -- Marco LIUZZI - DD
        'sethi@unicc.org',  -- Anish SETHI - DS
        'negyesi@unicc.org',-- Anna (Admin/Chief)
        'grecuccio@unicc.org' -- Milena (covers MS/OP)
      ])
    );
  END IF;
END;
$$;