
## Bug Fix: Local Admin Station Filter Shows All Stations Instead of Valencia

### Root Cause

There are two related bugs in `LocalAdminDashboard.tsx`:

**Bug 1 — useState timing race (primary cause)**

```
Line 117: const lockedStation = user?.email
             ? LOCAL_ADMIN_STATION_MAP[user.email.toLowerCase()] ?? null
             : null;
Line 120: const [dutyStation, setDutyStation] = useState<string>(lockedStation ?? 'all');
```

`useState` only reads its initial value **on the very first render**. Because `useAuth` is async (it calls Supabase to get the session then defers role/profile fetching via `setTimeout`), `user` is `null` on the first render. So `lockedStation` evaluates to `null`, `dutyStation` initialises to `'all'`, and **React never re-runs `useState`** when the user data arrives. Ruiz ends up permanently seeing all stations.

**Bug 2 — `useAuth` only adds `Local Admin` for `ruiz@unicc.org`, not `requeni@unicc.org`**

In `useAuth.tsx` line 58:
```typescript
const localAdminEmails = ['ruiz@unicc.org'];
```
Carolina (`requeni@unicc.org`) is missing from this list. While this doesn't affect the dashboard filter directly (it uses `LOCAL_ADMIN_STATION_MAP` not `userRoles`), it's inconsistent and should be fixed.

### The Fix

**Fix 1 — Replace `useState` with a `useMemo`-derived value (no state needed)**

Since `lockedStation` is derived from `user.email` (which is auth state managed by `useAuth`), the active duty station filter should be derived — not stored in local state. For Local Admin users, the station is always `lockedStation`; for full-access users, it uses the dropdown selection.

The correct approach:
- Keep `useState` only for the dropdown selection (`selectedStation`, default `'all'`)
- Compute the **effective** filter as: `lockedStation ?? selectedStation`
- All `matchesFilters` calls and `useMemo` dependencies use the effective filter

This means when Ruiz's user object loads, the filter immediately uses her locked station without any state initialisation issue.

**Fix 2 — Add `requeni@unicc.org` to `localAdminEmails` in `useAuth.tsx`**

### Files to Change

| File | Change |
|---|---|
| `src/pages/operations/LocalAdminDashboard.tsx` | Replace `const [dutyStation, setDutyStation] = useState(lockedStation ?? 'all')` with a separate `selectedStation` state (default `'all'`) and a derived `activeStation = lockedStation ?? selectedStation`. Update all downstream references from `dutyStation` → `activeStation`. Update the dropdown `onValueChange` to call `setSelectedStation`. |
| `src/hooks/useAuth.tsx` | Add `'requeni@unicc.org'` to the `localAdminEmails` array so Carolina also gets the `Local Admin` virtual role. |

### Technical Detail — Exact Changes

**LocalAdminDashboard.tsx:**
```typescript
// Before (buggy):
const [dutyStation, setDutyStation] = useState<string>(lockedStation ?? 'all');
// ... uses dutyStation everywhere

// After (fixed):
const [selectedStation, setSelectedStation] = useState<string>('all');
const activeStation = lockedStation ?? selectedStation;
// ... replace all uses of dutyStation → activeStation
// ... dropdown: onValueChange={setSelectedStation}
// ... filter check: if (activeStation !== 'all' && ds !== activeStation) return false;
```

The key insight: `activeStation` is recomputed on every render from `lockedStation` (which reactively updates as `user` loads), so there's no timing gap. No `useEffect` needed.

**useAuth.tsx:**
```typescript
// Before:
const localAdminEmails = ['ruiz@unicc.org'];

// After:
const localAdminEmails = ['ruiz@unicc.org', 'requeni@unicc.org'];
```

### What Ruiz/Carolina Will See After the Fix

- On page load: the station filter locked chip shows "Valencia" (as soon as user object resolves, which is immediate for returning sessions)
- All four sections (Arrivals, Departures, Transfers, Contract Breaks) only show Valencia records
- No "All Duty Stations" dropdown visible — replaced by the locked station chip
- The counts in the stat cards also reflect only Valencia records

### No Database Changes Required
This is a pure client-side rendering/state management fix.
