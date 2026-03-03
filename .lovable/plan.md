

# Fix: Null job fetch in `run_match` action

## Root Cause

In the `run_match` action (line 405-409), when no cached `job_match_profiles` entry exists, the code fetches the job from the `jobs` table using `.single()`. If this returns an error or null (e.g., RLS policy blocking the service-role read, or a query issue), the code proceeds to access `job.title` on line 412, causing `Cannot read properties of null (reading 'title')`.

The `build_job_profile` action (line 361-366) has `if (jobErr) throw jobErr;` but the same fetch inside `run_match` (line 405-409) does NOT check the error — it silently gets `null`.

## Fix

1. **Add error handling** for the job fetch inside `run_match` (around line 405-409):
   - Destructure the error: `const { data: job, error: jobErr } = await supabase...`
   - If `jobErr` or `!job`, throw a descriptive error like `"Job not found: {job_id}"`

2. **Redeploy** the edge function after the fix.

This is a one-line-class fix in `supabase/functions/talent-pool-match/index.ts`.

