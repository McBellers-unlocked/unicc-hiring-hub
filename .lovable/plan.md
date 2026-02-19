
## Contract Breaks Table: Redesigned with Expandable Rows

### What the user wants
The Contract Breaks section should show the same people-movement information as Arrivals/Departures but tailored to contract break events. The fields are:

- Last name, First name, Duty Station
- Type of Contract, Job Title/Function, Division/Unit, Supervisor, Grade
- Last day of contract (= when they leave)
- Contract break period: From `sep.tentative_date` To `apt.tentative_date`
- New contract expiry date: From `apt.tentative_date` To `—` (not stored in DB)

### What's in the database — confirmed by direct query

**From `hr_separations` (departure side of the CB pair):**
- `last_name`, `first_name`, `duty_station`, `grade`, `job_title`, `section_unit`, `supervisor` — all present ✓
- `contract_type` — column exists but is currently null for CB records (data gap, will show `—`)
- `tentative_date` — last day of contract ✓

**From `hr_appointments` (return/arrival side of the CB pair):**
- `tentative_date` — the return date (start of new contract period) ✓
- `effective_date` — available but not used for the new contract end date

**Gap:** "New contract expiry date To" — this end date is not stored anywhere. Will display `—` for the end date (just like Arrivals handles "End Date"), and note this alongside the plan.

### UX Design: Same expandable pattern as Arrivals and Departures

**Visible row (always shown) — 9 columns + toggle:**

| Last Name | First Name | Grade | Type of Contract | Division/Unit | Last Day of Contract | Break From → To | Duty Station | *(chevron)* |

- **Last Day of Contract** = `sep.tentative_date` (the departure date)
- **Break From → To** = compact `sep.tentative_date → apt.tentative_date` showing the break window at a glance. If no linked appointment, shows `—`

**Expanded panel (hidden by default):**

A 3-column detail grid with:

| Job Title / Function | Supervisor | New Contract Start |
|---|---|---|
| `sep.job_title` | `sep.supervisor` | `apt.tentative_date` |

Plus a note row spanning full width:
> New contract expiry date: `—` (not currently stored in the database)

This is the same pattern as Arrivals (where "End Date" and "Index Number" also show `—` for missing data).

### Files to change

**1. `src/pages/operations/LocalAdminDashboard.tsx` only — no other files needed**

- Add `expandedCBIds` state (`Set<string>`) and `toggleCB` function (same pattern as Arrivals, Departures, Transfers)
- Replace the current flat Transfers table (7 cols, no expand) with the new 10-column structure (9 + toggle)
- Each CB pair renders as two `<React.Fragment>` `<TableRow>` elements:
  - **Row 1**: 9 summary cells + chevron button, clickable to expand
  - **Row 2**: conditionally visible `<TableCell colSpan={10}>` with the 3-column detail grid

**Expanded panel detail grid:**

```text
┌────────────────────────┬──────────────────────┬──────────────────────────┐
│ Job Title / Function   │ Supervisor           │ New Contract Start       │
│ sep.job_title ?? '—'   │ sep.supervisor ?? '—'│ apt.tentative_date ?? '—'│
└────────────────────────┴──────────────────────┴──────────────────────────┘
```

Below the 3-column grid, a small muted note:
> New contract expiry date is not yet stored in the database and will display — until that field is added.

**State management addition:**
```ts
const [expandedCBIds, setExpandedCBIds] = useState<Set<string>>(new Set());
const toggleCB = (id: string) =>
  setExpandedCBIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
```

**New header (9 visible data columns + 1 toggle):**

| # | Column | Source |
|---|---|---|
| 1 | Last Name | `sep.last_name` |
| 2 | First Name | `sep.first_name` |
| 3 | Grade | `sep.grade` |
| 4 | Type of Contract | `sep.contract_type` (Badge, or `—`) |
| 5 | Division / Unit | `sep.section_unit` |
| 6 | Last Day of Contract | `sep.tentative_date` |
| 7 | Contract Break | `sep.tentative_date → apt.tentative_date` |
| 8 | Duty Station | `sep.duty_station` |
| 9 | *(chevron toggle)* | — |

The "Contract Break" column uses a compact inline format: `04 May 2026 → 04 Jun 2026` with an `ArrowRight` icon, using the same amber/muted styling used in Transfers for at-a-glance scanning.

**`EmptyRow` cols** updated from `7` to `9`.

### No database schema changes required
All needed fields exist in `hr_separations` and `hr_appointments`. The "New contract expiry date" end value is simply not stored yet — it will show `—` like other placeholder fields across the dashboard, consistent with the existing convention.

### No other files need to change
- Arrivals, Departures, Transfers sections: unchanged
- Auth, routing, RLS: unchanged
- TransferForm, SeparationForm, AppointmentForm: unchanged
