
# HR Operations Dashboard

## Overview
Create a new HR Operations Dashboard that serves as the central hub for HR staff, showing upcoming actions across all operational areas. The dashboard aggregates data from appointments, separations, and (future) transfers/extensions into an actionable summary.

---

## Data Sources

| Category | Table | Key Fields | Priority Logic |
|----------|-------|------------|----------------|
| Appointments | `hr_appointments` | `tentative_date`, `operation_type`, `is_international`, `status` | Days until start |
| Separations | `hr_separations` | `tentative_date`, `separation_type`, `is_international`, `status` | International exits need 90+ days notice for protocol |
| Transfers | `hr_appointments` (type = Transfer) | `duty_station`, `contract_type` | Location/contract changes |
| Extensions | Future: `hr_contract_extensions` | For now, placeholder | Contract renewals |

---

## Dashboard Sections

### 1. Summary Stats Row
Four key metric cards at the top:

```
+-------------------+-------------------+-------------------+-------------------+
|   Appointments    |   Separations     |   Transfers       |   Extensions      |
|   Due This Week   |   Due This Week   |   Due This Week   |   Due This Week   |
|       12          |       5           |       3           |       2           |
+-------------------+-------------------+-------------------+-------------------+
```

### 2. Urgent Actions (Red Alert Section)
Items needing immediate attention:
- **Overdue appointments** (start date passed, status not Completed)
- **Overdue separations** (separation date passed, status not Completed)
- **International exits without protocol clearance** (P-grade staff leaving need 90+ days for visa/protocol)

### 3. Upcoming This Week
Timeline view of what is happening in the next 7 days:

| Category | Name | Date | Location | Type | Action |
|----------|------|------|----------|------|--------|
| Appointment | SMITH John | 10 Feb | Valencia | Newcomer | View |
| Separation | JONES Maria | 12 Feb | Remote | Resignation | View |
| Appointment | DOE Jane | 14 Feb | Brindisi | Transfer | View |

### 4. International Staff Exits (Special Attention)
International (P-grade) staff separations need extra lead time for protocol services. This section highlights:
- Exits in next 30 days (warning)
- Exits in next 90 days (info)

### 5. Quick Access Cards
Navigation shortcuts to full operational pages:

```
+------------------+------------------+------------------+------------------+
| Appointments     | Separations      | Extensions       | Transfers        |
| Manage new hires | Manage exits     | Contract renewals| Location changes |
| [12 pending]     | [5 pending]      | [Coming soon]    | [Coming soon]    |
+------------------+------------------+------------------+------------------+
```

---

## Filtering Logic

### Transfers (from Appointments table)
Filter by `operation_type`:
- "Transfer" - duty station change
- "Transfer (CB)" - transfer from contract break
- Any appointment where `old_po` and `new_po` differ (position change)
- Any appointment where duty station changes

### Contract Breaks vs Exits
From separations, distinguish:
- **Exit**: `separation_type = 'Exit'` or `event_type = 'Exit'`
- **Contract Break**: `separation_type = 'ContractBreak'`

### International Staff Priority
- `is_international = true` AND `grade LIKE 'P%'` = high priority for protocol services
- Need 90-day lead time for visa cancellation, travel arrangements

---

## Implementation

### Files to Create

| File | Purpose |
|------|---------|
| `src/pages/operations/HROperationsDashboard.tsx` | Main dashboard page |
| `src/components/operations/UpcomingEventsTable.tsx` | Combined timeline table |
| `src/components/operations/InternationalExitsAlert.tsx` | P-staff exit warnings |

### Files to Modify

| File | Changes |
|------|---------|
| `src/App.tsx` | Add route `/operations` or `/operations/dashboard` |

---

## UI Design Details

### Color Coding by Category
| Category | Color | Icon |
|----------|-------|------|
| Appointment | Blue | UserPlus |
| Separation (Exit) | Red | UserMinus |
| Separation (CB) | Orange | Pause |
| Transfer | Purple | ArrowLeftRight |
| Extension | Green | FileCheck |

### Alert Priorities
| Priority | Condition | Style |
|----------|-----------|-------|
| Critical | Overdue (date passed, not completed) | Red badge, pulsing |
| High | International exit in 30 days | Orange badge |
| Medium | Due this week | Yellow badge |
| Normal | Due in 30 days | Default |

---

## Data Queries

```typescript
// Upcoming appointments (next 30 days)
const appointments = await supabase
  .from('hr_appointments')
  .select('*')
  .in('status', ['Not started', 'In progress'])
  .gte('tentative_date', today)
  .lte('tentative_date', thirtyDaysFromNow);

// Upcoming separations (next 30 days)
const separations = await supabase
  .from('hr_separations')
  .select('*')
  .in('status', ['Not started', 'In progress'])
  .gte('tentative_date', today)
  .lte('tentative_date', thirtyDaysFromNow);

// Overdue items (past date, not completed)
const overdueAppointments = await supabase
  .from('hr_appointments')
  .select('*')
  .in('status', ['Not started', 'In progress'])
  .lt('tentative_date', today);
```

---

## Contract Extensions (Future)

Since `hr_contract_extensions` does not exist yet, the dashboard will show a placeholder card with "Coming Soon" and link to the ContractExtensions page. When ready, a similar table structure can be added:
- `staff_id`, `current_end_date`, `new_end_date`, `status`, `approval_date`

---

## Navigation Integration

Add to header navigation under "HR Operations" dropdown:
- **Dashboard** (new) - `/operations`
- Appointments - `/operations/appointments`
- Separations - `/operations/separations`
- etc.

---

## Technical Approach

1. Create `HROperationsDashboard.tsx` with:
   - Combined data fetch from `hr_appointments` and `hr_separations`
   - Stats computation (overdue, this week, international)
   - Category filtering and display

2. Reuse existing components:
   - `StatsCard` from dashboard
   - `ActionItem` for urgent items
   - Status badges from Appointments/Separations

3. Add route to App.tsx

4. Update navigation (if needed) to include dashboard link
