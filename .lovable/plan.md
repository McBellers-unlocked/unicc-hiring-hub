

## IDOR Vulnerability: Hiring Managers Can View All Job Applications

### Problem

The `applications` table has **two conflicting SELECT RLS policies**:

1. **`"Allow select on applications for staff"`** — correctly scoped, uses `is_job_hiring_manager(auth.uid(), job_id)` to restrict hiring managers to only their assigned jobs.
2. **`"Staff can view applications"`** — **overly broad**, grants any user with the `Hiring Manager` role blanket access to ALL applications across ALL jobs.

Because RLS policies are OR'd together, the broad policy overrides the scoped one. A hiring manager (e.g., `ruiz@unicc.org`) can navigate to `/applications/manage?job=<any-job-id>` and see all applications for jobs they are not assigned to.

The same issue exists for the **UPDATE** policy — any `Hiring Manager` can update any application.

### Fix Plan

**Single database migration** to:

1. **Drop** the overly broad `"Staff can view applications"` policy.
2. **Drop** the redundant `"Allow select on applications for staff"` policy (we'll replace both with one correct policy).
3. **Create** a single, correctly scoped SELECT policy:
   - Admin, HR Assistant, Chief of HR → full access
   - Hiring Manager → only via `is_job_hiring_manager(auth.uid(), job_id)`
   - Panel Member → only for jobs where they are a panel member (via `job_interview_panel_members`)
4. **Fix the UPDATE policy** — replace the blanket `Hiring Manager` check with `is_job_hiring_manager(auth.uid(), job_id)`.

### Technical Details

```sql
-- Drop both conflicting SELECT policies
DROP POLICY IF EXISTS "Staff can view applications" ON public.applications;
DROP POLICY IF EXISTS "Allow select on applications for staff" ON public.applications;

-- Create single correctly-scoped SELECT policy
CREATE POLICY "Staff can view applications"
ON public.applications FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'Admin'::user_role)
  OR has_role(auth.uid(), 'HR Assistant'::user_role)
  OR has_role(auth.uid(), 'Chief of HR'::user_role)
  OR is_job_hiring_manager(auth.uid(), job_id)
  OR EXISTS (
    SELECT 1 FROM public.job_interview_panel_members pm
    WHERE pm.user_id = auth.uid() AND pm.job_id = applications.job_id
  )
);

-- Fix UPDATE policy: scope Hiring Manager to assigned jobs
DROP POLICY IF EXISTS "Allow update on applications for staff" ON public.applications;
CREATE POLICY "Allow update on applications for staff"
ON public.applications FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'Admin'::user_role)
  OR has_role(auth.uid(), 'HR Assistant'::user_role)
  OR has_role(auth.uid(), 'Chief of HR'::user_role)
  OR is_job_hiring_manager(auth.uid(), job_id)
);
```

No frontend code changes are needed — the RLS fix will enforce the correct access at the database level, regardless of what URL a user navigates to.

