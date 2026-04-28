UPDATE public.users_clean AS uc
SET division = ou.division,
    imported_at = now()
FROM public.org_units AS ou
WHERE nullif(trim(coalesce(uc.division, '')), '') IS NULL
  AND nullif(trim(coalesce(uc.unit, '')), '') IS NOT NULL
  AND lower(trim(uc.unit)) = lower(trim(ou.unit));