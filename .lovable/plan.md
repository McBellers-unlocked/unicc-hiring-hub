
## Transfers Section: Redesigned for the Local Admin Dashboard

### The UX Challenge
A transfer record can have multiple simultaneous changes (e.g., a person changes their duty station AND supervisor AND job title at the same time). The question is how to display this cleanly in a table designed for quick scanning by administrative assistants.

### Recommended UX Approach: "Change Pill Summary" in visible row + expanded "Before → After" panel

The pattern that works best here mirrors a changelog or diff view — a compact visible row showing who and when, with small coloured pill badges indicating *which things changed*, then an expanded panel revealing the full "old value → new value" detail for each change.

This avoids separate rows per change (which would make it hard to see one person's total situation at a glance) while clearly communicating everything needed for check-in / check-out actions.

---

### Visible Row (always shown) — 8 columns + toggle

| Last Name | First Name | Duty Station | Start Date | End Date | Change Summary | Duty Station Alert | *(chevron)* |
|---|---|---|---|---|---|---|---|

- **Duty Station** — the *current* station (before any move)
- **Change Summary** — a row of coloured pill badges: one per change type (e.g., `Duty Station`, `Supervisor`, `Job Title`). Duty station gets a distinct amber/orange colour since it requires action at both locations
- **Duty Station Alert** — a visible warning icon/badge if `duty_station` is in `change_types`, noting both the origin and destination station directly in the row (e.g., "Valencia → Brindisi"). This is the IMPORTANT signal mentioned in the requirements

### Expanded Panel (hidden by default, shown on chevron click)

A "Before → After" comparison grid, one row per change type that is active for this record:

```text
┌────────────────────┬──────────────────────┬────────────────────────┐
│ What Changed       │ Current Value        │ New Value              │
├────────────────────┼──────────────────────┼────────────────────────┤
│ Duty Station       │ Valencia             │ → Brindisi             │
│ Supervisor         │ J. Smith             │ → M. Garcia            │
│ Job Title          │ IT Officer           │ → Senior IT Officer    │
│ Grade              │ P3                   │ → P4                   │
│ Contract Type      │ Fixed Term           │ → Temporary            │
│ Division / Unit    │ CSI                  │ → CSO                  │
└────────────────────┴──────────────────────┴────────────────────────┘
```

Only rows for active change types appear — if only duty station changed, only that row shows.

A special **Duty Station Action Notice** box appears at the top of the expanded panel when the duty station is changing, styled in amber:

> ⚠️ Duty station change: Administrative assistants at both **Valencia** and **Brindisi** must coordinate check-out and check-in actions.

---

### What needs to change

#### 1. Database — new columns in `hr_transfers`

Three new columns to store the "new" values for job title, grade, and contract type changes:

```sql
ALTER TABLE hr_transfers ADD COLUMN new_job_title text;
ALTER TABLE hr_transfers ADD COLUMN new_grade text;
ALTER TABLE hr_transfers ADD COLUMN new_contract_type text;
```

The `change_types` array will be expanded to include three new values alongside the existing ones:
- Existing: `unit_division`, `supervisor`, `duty_station`
- New: `job_title`, `grade`, `contract_type`

#### 2. TransferForm (`src/components/operations/TransferForm.tsx`)

Add three new change type checkboxes and their conditional "new value" input fields:
- `job_title` change → text input for `new_job_title`
- `grade` change → grade dropdown for `new_grade`
- `contract_type` change → contract type dropdown for `new_contract_type`

Add these three fields to the Zod schema and form defaults.

#### 3. LocalAdminDashboard (`src/pages/operations/LocalAdminDashboard.tsx`)

**Update the `HrTransfer` interface** to add: `job_title`, `contract_type`, `supervisor`, `new_job_title`, `new_grade`, `new_contract_type`.

**Update the Supabase `.select()`** to fetch these new fields.

**Add expanded-row state** for transfers (same Set pattern as Arrivals and Departures).

**Replace the current Transfers table** with the new design:

Visible row (8 cols):
1. Last Name
2. First Name  
3. Duty Station (current)
4. Start Date
5. End Date
6. Change Summary (pill badges — duty station badge in amber if location is changing)
7. Location Move (visible "Valencia → Brindisi" only if duty_station is in change_types, otherwise `—`)
8. Chevron toggle

Expanded panel (colSpan=8):
- Amber warning box (if duty station is changing) naming both locations
- "Before → After" comparison grid, one row per active change type
- Each row: label | current value | arrow icon | new value

#### 4. Transfers detail page (`src/pages/operations/Transfers.tsx`)

Add the three new change type checkboxes to the existing "What is changing?" section in the expanded panel, and show the new values alongside the existing ones.

---

### Summary of files to change

| File | What changes |
|---|---|
| Database migration | Add `new_job_title`, `new_grade`, `new_contract_type` columns to `hr_transfers` |
| `src/components/operations/TransferForm.tsx` | Add 3 new change type options + conditional "new value" fields |
| `src/pages/operations/LocalAdminDashboard.tsx` | Redesign Transfers table with pill badges + expandable before→after panel |
| `src/pages/operations/Transfers.tsx` | Show new change types in the expanded detail panel |

### No changes needed to
- Arrivals section
- Departures section
- Contract Breaks section
- Auth / routing / RLS

