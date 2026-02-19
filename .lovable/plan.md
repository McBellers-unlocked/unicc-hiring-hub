
## Departures Table: Expandable Row Design (matching Arrivals pattern)

### Goal
Redesign the Departures section to mirror the Arrivals expandable row pattern: a compact summary row visible by default, with a chevron that reveals additional detail fields underneath.

### What's in the database
All requested fields exist in `hr_separations`:
- `last_name`, `first_name`, `grade`, `contract_type`, `section_unit`, `tentative_date`, `duty_station` — for the visible row
- `job_title`, `supervisor` — for the expanded detail panel

### Visible row (default, always shown) — 8 columns + toggle

| Last Name | First Name | Grade | Type of Contract | Division / Unit | Departure Date | Duty Station | *(chevron)* |
|---|---|---|---|---|---|---|---|

### Expanded panel (hidden by default, shown on chevron click)

| Job Title / Function | Supervisor |
|---|---|
| from `job_title` | from `supervisor` |

Two fields in the expanded panel (2-column grid), as there is no equivalent of "Index Number" or "End Date" for departures.

### Summary of changes — one file only: `src/pages/operations/LocalAdminDashboard.tsx`

**1. Update the `HrSeparation` interface** — add three new optional fields:
```ts
job_title: string | null;
contract_type: string | null;
supervisor: string | null;
```

**2. Expand the Supabase `.select()` for separations** — add `job_title, contract_type, supervisor` to the existing select string.

**3. Add expanded-row state for departures** — same pattern as arrivals:
```ts
const [expandedDepartureIds, setExpandedDepartureIds] = useState<Set<string>>(new Set());
const toggleDeparture = (id: string) =>
  setExpandedDepartureIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
```

**4. Replace the Departures table** — new header (8 columns including toggle):

| # | Column |
|---|---|
| 1 | Last Name |
| 2 | First Name |
| 3 | Grade |
| 4 | Type of Contract |
| 5 | Division / Unit |
| 6 | Departure Date |
| 7 | Duty Station |
| 8 | *(chevron toggle — no label)* |

Each departure renders as two `<TableRow>` elements wrapped in a `<React.Fragment>`:
- **Row 1**: 7 data cells + ghost chevron button, clickable to expand
- **Row 2**: conditionally visible `<TableCell colSpan={8}>` with a 2-column detail grid for Job Title and Supervisor

The expanded panel uses the same `bg-muted/30 hover:bg-muted/30` styling as the Arrivals section for visual consistency.

**5. Update `EmptyRow` cols** for departures from `7` to `8`.

### No other changes
- No database schema changes required
- Other sections (Arrivals, Transfers, Contract Breaks) unchanged
- No routing, auth, or RLS changes
