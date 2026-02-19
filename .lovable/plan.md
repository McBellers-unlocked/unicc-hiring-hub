
## Arrivals Table: Expandable Row Design

### What's available in the database
Confirmed by querying `hr_appointments` directly:
- `last_name`, `first_name`, `grade`, `contract_type`, `section_unit`, `tentative_date`, `duty_station` — all present (visible row)
- `job_title`, `supervisor` — present (expanded detail panel)
- `end_date`, `index_number` — **not in the table**; will show `—` as placeholders

### Summary of changes
One file only: `src/pages/operations/LocalAdminDashboard.tsx`

---

### 1. Add new fields to the `HrAppointment` interface

Add three new optional fields:
```ts
job_title: string | null;
contract_type: string | null;
supervisor: string | null;
```

### 2. Expand the Supabase `.select()` for appointments

Add `job_title, contract_type, supervisor` to the existing select string.

### 3. Add import for icons and Button

Import `ChevronDown`, `ChevronRight` from `lucide-react` and `Button` from `@/components/ui/button`.

### 4. Add expanded-row state

Inside `LocalAdminDashboard`, add:
```ts
const [expandedArrivalIds, setExpandedArrivalIds] = useState<Set<string>>(new Set());
const toggleArrival = (id: string) =>
  setExpandedArrivalIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
```

### 5. Replace the Arrivals table

**New header columns (9 total):**

| # | Column |
|---|---|
| 1 | Last Name |
| 2 | First Name |
| 3 | Grade |
| 4 | Type of Contract |
| 5 | Division / Unit |
| 6 | Start Date |
| 7 | End Date |
| 8 | Duty Station |
| 9 | *(chevron toggle — no label)* |

**Each arrival renders two `<TableRow>` elements:**

- **Row 1** — the 8 summary columns plus a ghost chevron button in column 9
- **Row 2** — conditionally visible; a single `<TableCell colSpan={9}>` containing a small 3-column detail grid:

| Job Title / Function | Supervisor | Index Number |
|---|---|---|
| from `job_title` | from `supervisor` | `—` (not in DB) |

The expanded panel has a subtle `bg-muted/30` background so it reads as part of the same record.

The `EmptyRow` for Arrivals also updates its `cols` from `7` to `9`.

### Visual behaviour
- On page load: all rows collapsed (only the 8-column summary visible)
- Click chevron → detail panel slides open below that row
- Click chevron again → panel hides
- State is local to the component; no URL or persistence changes

### No other files need to change
- Database: no schema changes
- Other sections (Departures, Transfers, Contract Breaks): unchanged
- Routing, auth, RLS: unchanged
