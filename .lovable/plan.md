

## Persist Units & Divisions to Supabase + "Add row" button

The Units and Divisions page currently lives entirely in memory — `activeRows` is built from the `DIVISIONS` / `DIVISION_UNITS` constants and Save/Decommission/Import only mutate React state. We'll back it with a Supabase table and add an "Add row" button next to "Download table".

### 1. New Supabase table — `org_units`

Migration creates:

```
org_units (
  id            uuid PK default gen_random_uuid(),
  full_name     text not null,
  unit          text not null,                 -- short code, e.g. "DDPM"
  parent_section text default '',
  division      text not null,                 -- code: CS/DD/DS/DO/MS/OP
  manager       text default '',
  status        text not null default 'active' check (status in ('active','decommissioned')),
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  created_by    uuid references auth.users(id),
  unique (lower(unit))                          -- unit code is the primary key
)
```

- Trigger to auto-update `updated_at`.
- RLS enabled.
  - **SELECT**: any authenticated user (the table is referenced everywhere for filters/dropdowns).
  - **INSERT / UPDATE / DELETE**: restricted to roles `Admin`, `HR Assistant`, `Chief of HR` (matching the existing admin gating pattern in this project — checked via the `users` table by `auth.uid()`).
- One-time data seed: insert one row per entry in `DIVISIONS` × `DIVISION_UNITS` so the live Supabase table starts with the same content currently shown in the UI. `status='active'` for all.

### 2. Page rewrite — `src/pages/UnitsAndDivisions.tsx`

**Data loading**
- Replace `useMemo(buildInitialRows)` with a `useQuery(['org_units'])` call to `supabase.from('org_units').select('*')`.
- Split into `activeRows` / `decommissionedRows` by `status`.
- Loading + error states shown in the table area.

**Add row button** (new, next to Download table):
```
[ + Add row ] [ Download table ] [ Import ] [ Reset ] [ Decommission ] [ Save ]
```
- Opens a small `Dialog` (`AddOrgUnitDialog`, defined inline in the page) with fields:
  - **Unit full name** *  (text)
  - **Unit (code)** *    (text — required, must be unique vs existing `unit` codes case-insensitive; live validation)
  - **Parent Section** (existing `ParentSectionPicker`)
  - **Division** *       (existing `DIVISIONS` Select)
  - **Manager**          (existing `ManagerPicker`)
- On submit: `supabase.from('org_units').insert({...status:'active'})`; on success, toast + invalidate the `org_units` query so the table refreshes.
- Visible only when the user has edit rights (Admin / HR Assistant / Chief of HR — same gate as RLS).

**Persist existing actions to Supabase**
- `updateRow` (inline edits to Unit / Parent / Division / Manager) → `supabase.from('org_units').update(...).eq('id', id)` debounced on blur (use `onBlur` instead of `onChange` for the persistence call; local state still updates immediately for responsiveness).
- `confirmDecommission` → `update({status:'decommissioned'}).in('id', ids)`.
- `handleRestore` → `update({status:'active'}).eq('id', id)`.
- `handleSave` button: now redundant for inline edits (they auto-save on blur). Keep it as a manual "Refresh from server" or remove it. **Decision: remove the Save button** since every mutation persists immediately — keeping it would mislead users into thinking unsaved changes exist.
- `handleReset`: re-runs the seed (admin-only confirmation dialog: "Reset to defaults will delete all current rows and reinsert from defaults"). Implemented as `delete()` + bulk `insert()` of the seed list. Confirmation `AlertDialog` required.
- Import flow: same merge logic as today, but the final `setActiveRows(merged)` is replaced by a bulk `upsert` to `org_units` keyed on `unit` (case-insensitive — we lowercase before upsert), then refetch.

### 3. Out of scope

- Replacing the in-code constants `DIVISIONS` / `DIVISION_UNITS` everywhere else in the codebase. Those continue to be the source of truth for divisions and for any module that imports the constants. The `org_units` table is the editable, persisted view of unit data shown on this admin page; downstream pages keep reading the constants until a separate task migrates them.
- Editing division codes/labels themselves (only units are editable in this UI today).
- Audit log entries for each change.
- Cascade updates to other tables when a unit is renamed or decommissioned.

### Files touched

- New migration: create `org_units` table, RLS policies, `updated_at` trigger, seed insert.
- `src/pages/UnitsAndDivisions.tsx` — fetch/mutate via Supabase, add `+ Add row` button + `AddOrgUnitDialog`, blur-to-persist edits, remove now-redundant Save button, wire decommission/restore/import to Supabase.

