
-- Security definer function to check strategy tracker access
CREATE OR REPLACE FUNCTION public.can_access_strategy_tracker(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = p_user_id
    AND (
      role IN ('Admin', 'HR Assistant', 'Chief of HR')
      OR email = 'grecuccio@unicc.org'
    )
  )
$$;

-- Create the strategy_tracker_items table
CREATE TABLE public.strategy_tracker_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_item TEXT NOT NULL DEFAULT '',
  year TEXT[] NOT NULL DEFAULT ARRAY['2026'],
  status TEXT NOT NULL DEFAULT 'Not started',
  owner TEXT[] NOT NULL DEFAULT '{}',
  priority TEXT NOT NULL DEFAULT '',
  updates JSONB NOT NULL DEFAULT '[]'::jsonb,
  prioritisation_updates JSONB NOT NULL DEFAULT '[]'::jsonb,
  pillar TEXT NOT NULL DEFAULT '',
  participants TEXT[] NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.strategy_tracker_items ENABLE ROW LEVEL SECURITY;

-- SELECT policy
CREATE POLICY "Strategy tracker read access"
ON public.strategy_tracker_items
FOR SELECT
TO authenticated
USING (public.can_access_strategy_tracker(auth.uid()));

-- INSERT policy
CREATE POLICY "Strategy tracker insert access"
ON public.strategy_tracker_items
FOR INSERT
TO authenticated
WITH CHECK (public.can_access_strategy_tracker(auth.uid()));

-- UPDATE policy
CREATE POLICY "Strategy tracker update access"
ON public.strategy_tracker_items
FOR UPDATE
TO authenticated
USING (public.can_access_strategy_tracker(auth.uid()))
WITH CHECK (public.can_access_strategy_tracker(auth.uid()));

-- DELETE policy
CREATE POLICY "Strategy tracker delete access"
ON public.strategy_tracker_items
FOR DELETE
TO authenticated
USING (public.can_access_strategy_tracker(auth.uid()));
