

# Fix: `nice_to_have_md` column does not exist on `jobs` table

## Root Cause

The edge function queries `jobs.nice_to_have_md` but this column does not exist. The `jobs` table has `competencies` instead.

## Fix

In `supabase/functions/talent-pool-match/index.ts`, replace `nice_to_have_md` with `competencies` in 4 places:

1. **Line 363**: Change select to `"title, description_md, requirements_md, competencies, location, type"`
2. **Line 372**: Change `job.nice_to_have_md` to `job.competencies`
3. **Line 407**: Change select to `"title, description_md, requirements_md, competencies"`
4. **Line 419**: Change `job.nice_to_have_md` to `job.competencies`

Then redeploy the edge function.

