
## Root Cause: RLS Policy Blocks Hiring Manager from Reading hr_appointments

### What's happening

Sandra (`ruiz@unicc.org`) and Carolina (`requeni@unicc.org`) are stored in the `users` table with the role **`Hiring Manager`**. Their `Local Admin` role is a virtual, client-side-only role injected by `useAuth.tsx` based on their email — the database has no knowledge of it.

The `hr_appointments` table has **one** RLS SELECT policy:

```
"HR users can manage appointments"
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid()
      AND role = ANY (ARRAY['Admin', 'HR Assistant', 'Chief of HR']))
  )
```

`Hiring Manager` is not in that list, so Sandra and Carolina get **zero rows** from every Supabase query against `hr_appointments`. This is why Arrivals shows "No records found" — the table returns an empty array silently (RLS never throws an error, it just returns nothing).

### Why transfers and departures work (partially)

- `hr_transfers` → policy allows **any authenticated user** → works fine
- `hr_separations` SELECT policy includes `Hiring Manager` → separations are visible (departures + CB separation side)
- `hr_appointments` SELECT → **blocks Hiring Manager** → arrivals and the return leg of contract breaks are invisible

### The Fix — Two database changes

#### 1. Add a Local Admin SELECT policy to `hr_appointments`

A new RLS policy that allows the specific local admin emails to read `hr_appointments` records scoped to their duty station. This uses a security-safe approach: look up the authenticated user's duty station from the `users` table and compare to the appointment's `duty_station`.

However, since `Local Admin` is not a real DB role and these users are `Hiring Manager` in the DB, the cleanest, most secure approach is to add their emails to a **dedicated `local_admin_emails` helper** or simply extend the appointments SELECT policy to include `Hiring Manager`.

**The simplest correct fix:** Add `'Hiring Manager'` to the existing `hr_appointments` SELECT policy (matching exactly what `hr_separations` already does). This gives Hiring Managers read-only access to appointments — they already have it for separations, so this is consistent.

```sql
-- Drop the overly restrictive existing policy
DROP POLICY "HR users can manage appointments" ON public.hr_appointments;

-- Re-create split policies: one for all CRUD (Admin/HR only), one for SELECT (broader)
CREATE POLICY "HR staff can manage appointments"
  ON public.hr_appointments
  FOR ALL  -- INSERT, UPDATE, DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND role = ANY (ARRAY['Admin'::user_role, 'HR Assistant'::user_role, 'Chief of HR'::user_role])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND role = ANY (ARRAY['Admin'::user_role, 'HR Assistant'::user_role, 'Chief of HR'::user_role])
    )
  );

CREATE POLICY "HR and Hiring Managers can view appointments"
  ON public.hr_appointments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND role = ANY (ARRAY[
          'Admin'::user_role,
          'HR Assistant'::user_role,
          'Chief of HR'::user_role,
          'Hiring Manager'::user_role,
          'Director'::user_role
        ])
    )
  );
```

This mirrors exactly the pattern already used by `hr_separations`, making the two tables consistent.

#### 2. No code changes needed

The `LocalAdminDashboard.tsx` filtering logic is correct — the `lockedStation` correctly maps `ruiz@unicc.org` → `'Valencia'` and the `matchesFilters` function correctly filters by duty station. Once the RLS policy is fixed, the data will flow through and Valencia arrivals will appear.

### What Sandra and Carolina will see after the fix

- **Arrivals**: All `hr_appointments` records where `duty_station = 'Valencia'` and `status != 'Completed'` — currently 2 records (GARCIA AMAYA and HERRERO CANTERO)
- **Contract Breaks expanded panel**: The linked appointment return date (`apt.tentative_date`) will now resolve correctly instead of showing `—`
- **Departures and Transfers**: Already working, no change

### Summary

| Table | Current SELECT access | After fix |
|---|---|---|
| `hr_appointments` | Admin, HR Assistant, Chief of HR only | + Hiring Manager, Director |
| `hr_separations` | Admin, HR Assistant, Chief of HR, Hiring Manager, Director | No change |
| `hr_transfers` | Any authenticated user | No change |

**Only one file changes:** a database migration adding the new SELECT policy and splitting the existing `ALL` policy into separate SELECT and mutation policies.
