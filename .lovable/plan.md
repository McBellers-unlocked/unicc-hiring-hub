

# Give Sandra RUIZ Access to Local Admin Dashboard

## Problem
Sandra RUIZ SERRANO (ruiz@unicc.org, role: Hiring Manager) needs access to `/operations/admin` (Local Admin Dashboard). Currently, this page has no access control, but the HR Operations nav menu is only visible to Admin/HR/Chief of HR roles. Sandra should only see the Local Admin Dashboard, not the full HR Operations menu.

## Approach
Follow the existing pattern used for "Chief of Division" -- grant access via an email-based check rather than creating a new database role. This avoids:
- Changing the `user_role` database enum
- Dealing with the single-role limitation on the `users` table
- Sandra losing her Hiring Manager role

## Changes (2 files)

### 1. `src/hooks/useAuth.tsx`
Add Sandra's email to a "Local Admin" check inside `getUserRolesForProfile`, so her `userRoles` array becomes `['Hiring Manager', 'Local Admin']`:

```
const localAdminEmails = ['ruiz@unicc.org'];
if (email && localAdminEmails.includes(email.toLowerCase()) && !roles.includes('Local Admin')) {
  roles.push('Local Admin');
}
```

### 2. `src/components/Layout.tsx`
- Add a check: `const isLocalAdmin = userRoles.includes('Local Admin');`
- Add a standalone nav link (not inside the HR Operations dropdown) visible when `isLocalAdmin` and not already having `hasAdminAccess`:

```
{isLocalAdmin && !hasAdminAccess && (
  <Link to="/operations/admin" ...>
    <Building2 /> Local Admin
  </Link>
)}
```

This ensures:
- Sandra sees a "Local Admin" link in the top nav
- Admin/HR users still access it via the HR Operations dropdown (if the link is there)
- No database migration required
