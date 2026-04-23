

## Restore edit/create capability on Units and Divisions

**Root cause**: After the Supabase migration, the page reads the user role from `user.role`, but `useAuth` exposes roles via the separate `userRoles: string[]` array. As a result `canEdit` is always `false`, so the **Add row**, **Import**, **Reset**, **Decommission** buttons are hidden and inline edit inputs are disabled for everyone.

### Fix — `src/pages/UnitsAndDivisions.tsx`

1. Pull `userRoles` (instead of `user`) from `useAuth`.
2. Compute `canEdit` against that array — including the existing aliases used elsewhere in the project so the same people who could edit before the migration can edit again:
   ```ts
   const { userRoles } = useAuth();
   const canEdit = userRoles.some(r =>
     ['Admin', 'HR Assistant', 'Chief of HR', 'Local Admin', 'Chief of Division'].includes(r)
   );
   ```
   (`Local Admin` and `Chief of Division` are added because the auth hook auto-grants those roles to the existing UNICC HR people who were editing this page pre-migration.)
3. Keep `created_by` lookup via `supabase.auth.getUser()` (already correct).

### Out of scope
- RLS changes. The DB policy stays as `Admin / HR Assistant / Chief of HR`. If a `Local Admin` who is not also one of those roles attempts to save, the UI will allow the click but Supabase will reject it and the existing toast will surface the error. We can broaden RLS in a follow-up if you confirm Local Admins should write to `org_units`.

### Files touched
- `src/pages/UnitsAndDivisions.tsx` (replace the broken `userRole` derivation with `userRoles`-based gate).

