

# Add Local Admins for All Duty Stations

## Current State

Only 2 Local Admins are configured (both Valencia):
- Sandra Ruiz (`ruiz@unicc.org`)
- Carolina Requeni (`requeni@unicc.org`)

## Confirmed Emails from Database

| Station | Name | Email | Current DB Role |
|---------|------|-------|-----------------|
| **Valencia** | Carolina Requeni | `requeni@unicc.org` | Hiring Manager |
| **Valencia** | Sandra Ruiz | `ruiz@unicc.org` | Hiring Manager |
| **Geneva** | Aline Dutruel | `dutruel@unicc.org` | Hiring Manager |
| **Geneva** | Ellen Normand-Quinet | `normand@unicc.org` | Hiring Manager |
| **Geneva** | Veronika Cavaglieri | `cavaglieri@unicc.org` | Hiring Manager |
| **Brindisi** | Cristina Argentieri | `argentieric@unicc.org` | Hiring Manager |
| **Brindisi** | Silvia Valenti | `valenti@unicc.org` | Hiring Manager |
| **Rome** | Giulia Petrocelli | `petrocelli@unicc.org` | Hiring Manager |
| **New York** | Sara Mesfin Woldeabezegi | `woldeabezegi@unicc.org` | Hiring Manager |
| **New York** | Seoyeon Lee | `lees@unicc.org` | **Candidate** (needs update) |

**Note:** Seoyeon Lee's database role is currently `Candidate` — she'll need to be changed to `Hiring Manager` to get proper RLS access to HR tables.

## Changes

### 1. `src/hooks/useAuth.tsx` (line 58)
Expand the `localAdminEmails` array from 2 to 10 emails:
```
'ruiz@unicc.org', 'requeni@unicc.org',
'dutruel@unicc.org', 'normand@unicc.org', 'cavaglieri@unicc.org',
'argentieric@unicc.org', 'valenti@unicc.org',
'petrocelli@unicc.org',
'woldeabezegi@unicc.org', 'lees@unicc.org'
```

### 2. Update Seoyeon Lee's role
Change her role from `Candidate` to `Hiring Manager` in the `users` table so she has the same RLS permissions as the other Local Admins.

### 3. `supabase/functions/notify-local-admin/index.ts` (lines 10-16)
Update the `STATION_ADMIN_EMAILS` mapping so notifications go to the correct people (currently uses generic admin inboxes). This is optional — depends on whether you want notifications going to these individual emails or keeping the shared admin inboxes.

