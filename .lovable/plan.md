

# Sandra Ruiz Access Investigation

## Finding: Her setup is correct

Sandra Ruiz (`ruiz@unicc.org`) currently has:
- **Database role**: `Hiring Manager` — this is correct and should NOT be changed
- **Derived role**: `Local Admin` — automatically granted via hardcoded email list in `useAuth.tsx` (line 58)

Both roles are working as designed:
- The `Hiring Manager` role gives her RLS SELECT access to `hr_separations` and `hr_appointments` (confirmed in RLS policies)
- The `Local Admin` derived role shows the "Local Admin" nav link pointing to `/operations/admin` (confirmed in `Layout.tsx` line 317)
- The route `/operations/admin` has no role guard — any authenticated user can visit it
- The dashboard itself (`LocalAdminDashboard.tsx`) has no role check — it just reads data filtered by duty station

## Likely cause

Her issue is probably **not** a role problem. Possible causes:
1. **Session/token issue** — she may need to sign out and sign back in to refresh her JWT and role resolution
2. **Browser cache** — stale cached state from `localStorage` key `unicconnect_dashboard_tab`
3. **Navigation confusion** — as a Hiring Manager, she lands on `DualRoleDashboard` (My Tasks / My Career tabs). The "Local Admin" link is in the nav bar, not on her dashboard. She may not be finding it

## Recommendation

No code or database changes needed. Ask Sandra to:
1. Sign out completely
2. Clear browser cache / hard refresh
3. Sign back in
4. Look for the "Local Admin" link in the top navigation bar

If the issue persists after that, we can add diagnostic logging or check the browser console for specific errors.

