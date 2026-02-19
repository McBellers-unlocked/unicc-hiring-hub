
## Scope the Local Admin Dashboard by User's Duty Station

### Goal
When a Local Admin user opens `/operations/admin`, the duty station filter is automatically set to their assigned station, and the filter dropdown is hidden so they cannot switch to another station. Admins and HR staff (who have broader access) continue to see the full "All Duty Stations" dropdown as before.

### User → Duty Station Mapping
This is a hardcoded lookup keyed on email address (same pattern as the existing `localAdminEmails` and `chiefDivisionEmails` constants in `useAuth.tsx`):

| Email | Duty Station |
|---|---|
| requeni@unicc.org | Valencia |
| ruiz@unicc.org | Valencia |
| dutruel@unicc.org | Geneva |
| normand-quinet@unicc.org | Geneva |
| cavaglieri@unicc.org | Geneva |
| argentieri@unicc.org | Brindisi |
| valenti@unicc.org | Brindisi |
| petrocelli@unicc.org | Rome |
| mesfin@unicc.org | New York |
| lee@unicc.org | New York |

> Note: Email addresses for all staff except Sandra Ruiz (whose email `ruiz@unicc.org` is already in the codebase) are inferred from the UNICC naming convention `lastname@unicc.org`. If any are wrong, they are trivially correctable in one constant.

### What changes

**Single file: `src/pages/operations/LocalAdminDashboard.tsx`**

1. **Import `useAuth`** at the top of the file.

2. **Add a `LOCAL_ADMIN_STATION_MAP` constant** (a `Record<string, string>`) mapping each email to their duty station. The duty station strings will match exactly what is stored in the database (e.g. `"Valencia"`, `"Geneva"`, `"Brindisi"`, `"Rome"`, `"New York"`).

3. **Derive `lockedStation`** from the logged-in user's email:
   ```ts
   const { user } = useAuth();
   const lockedStation = user?.email
     ? LOCAL_ADMIN_STATION_MAP[user.email.toLowerCase()] ?? null
     : null;
   ```

4. **Set the initial `dutyStation` state** using the locked station (or `'all'` for unrestricted users):
   ```ts
   const [dutyStation, setDutyStation] = useState<string>(lockedStation ?? 'all');
   ```

5. **Lock the filter dropdown**: If `lockedStation` is set, replace the `<Select>` with a read-only `<Badge>` or plain text chip showing the user's station, removing the ability to change it. This also keeps the UI clean — there is no filter card visible to the local admin because they have no filters to apply (the search-by-name input remains).

   Concretely: Render the duty station select only when `!lockedStation`. When locked, show a small labelled badge:
   ```tsx
   {lockedStation ? (
     <div className="flex items-center gap-2 px-3 py-2 rounded-md border bg-muted text-sm">
       <Building2 className="h-4 w-4 text-muted-foreground" />
       <span className="text-muted-foreground">Station:</span>
       <span className="font-medium">{lockedStation}</span>
     </div>
   ) : (
     <Select value={dutyStation} onValueChange={setDutyStation}>…</Select>
   )}
   ```

### Technical notes
- `useState(lockedStation ?? 'all')` is a safe initial-value approach because the user's session is always resolved before the dashboard renders (guarded by the router). No async concern here.
- No database changes, no new edge functions, no RLS changes required.
- The existing `matchesFilters` logic already correctly filters by `dutyStation`, so no data-layer changes are needed.
- Admins (e.g. `negyesi@unicc.org`) are not in the map and therefore get `lockedStation = null`, preserving their full access.
