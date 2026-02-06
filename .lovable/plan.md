
# Add Multi-Timeframe Stats Rows to HR Operations Dashboard

## Overview
Add two additional rows of stats cards below the existing "This Week" row:
1. **Row 1**: This Week (existing)
2. **Row 2**: This Month
3. **Row 3**: Next 90 Days

Each row will show the same categories of data (Appointments, Separations, Transfers, STDAs Ending, Extensions) but for different time horizons.

---

## Visual Layout

```text
+--------------------+--------------------+--------------------+--------------------+--------------------+
| Appointments       | Separations        | Transfers          | STDAs Ending Soon  | Extensions Due     |
| This Week: 2       | This Week: 1       | This Week: 0       | Within 8 weeks: 0  | Coming soon: 0     |
+--------------------+--------------------+--------------------+--------------------+--------------------+

+--------------------+--------------------+--------------------+--------------------+--------------------+
| Appointments       | Separations        | Transfers          | STDAs Ending       | Extensions Due     |
| This Month: 5      | This Month: 3      | This Month: 2      | This Month: 1      | This Month: 0      |
+--------------------+--------------------+--------------------+--------------------+--------------------+

+--------------------+--------------------+--------------------+--------------------+--------------------+
| Appointments       | Separations        | Transfers          | STDAs Ending       | Extensions Due     |
| Next 90 Days: 12   | Next 90 Days: 8    | Next 90 Days: 4    | Next 90 Days: 6    | Coming soon: 0     |
+--------------------+--------------------+--------------------+--------------------+--------------------+
```

---

## Technical Changes

### 1. Expand DashboardStats Interface

Add new fields for monthly and 90-day timeframes:

```typescript
interface DashboardStats {
  // Existing (This Week)
  appointmentsThisWeek: number;
  separationsThisWeek: number;
  transfersThisWeek: number;
  extensionsThisWeek: number;
  stdasEndingSoon: number;
  
  // New: This Month
  appointmentsThisMonth: number;
  separationsThisMonth: number;
  transfersThisMonth: number;
  stdasEndingThisMonth: number;
  extensionsThisMonth: number;
  
  // New: Next 90 Days
  appointmentsNext90Days: number;
  separationsNext90Days: number;
  transfersNext90Days: number;
  stdasEndingNext90Days: number;
  extensionsNext90Days: number;
  
  // Other existing fields...
}
```

### 2. Calculate Additional Date Ranges

```typescript
const fetchDashboardData = async () => {
  const today = startOfDay(new Date());
  const todayStr = format(today, 'yyyy-MM-dd');
  const weekFromNow = format(addDays(today, 7), 'yyyy-MM-dd');
  
  // New date calculations
  const endOfMonth = format(endOfMonth(today), 'yyyy-MM-dd');
  const ninetyDaysFromNow = format(addDays(today, 90), 'yyyy-MM-dd');
  // ...
```

### 3. Filter Data for Each Timeframe

For each category (appointments, separations, transfers, STDAs), calculate counts for:
- This Week: today to +7 days (existing)
- This Month: today to end of current month
- Next 90 Days: today to +90 days

### 4. Render Three Stats Rows

Add section headers and two additional grid rows:

```tsx
{/* This Week Stats */}
<div className="space-y-2">
  <h3 className="text-sm font-medium text-muted-foreground">This Week</h3>
  <div className="grid grid-cols-5 gap-4">
    {/* 5 stats cards */}
  </div>
</div>

{/* This Month Stats */}
<div className="space-y-2">
  <h3 className="text-sm font-medium text-muted-foreground">This Month</h3>
  <div className="grid grid-cols-5 gap-4">
    {/* 5 stats cards with monthly data */}
  </div>
</div>

{/* Next 90 Days Stats */}
<div className="space-y-2">
  <h3 className="text-sm font-medium text-muted-foreground">Next 90 Days</h3>
  <div className="grid grid-cols-5 gap-4">
    {/* 5 stats cards with 90-day data */}
  </div>
</div>
```

---

## File to Modify

| File | Changes |
|------|---------|
| `src/pages/operations/HROperationsDashboard.tsx` | Add date calculations, expand stats interface, add filtering logic, render three rows of stats |

---

## Implementation Details

### Date Calculations

```typescript
import { endOfMonth } from "date-fns"; // Add to imports

// In fetchDashboardData:
const monthEndStr = format(endOfMonth(today), 'yyyy-MM-dd');
```

### Filtering Logic Examples

```typescript
// This Month - Appointments (non-transfer)
const appointmentsThisMonth = appointmentsList.filter(a => 
  a.tentative_date && 
  a.tentative_date >= todayStr && 
  a.tentative_date <= monthEndStr &&
  !TRANSFER_TYPES.includes(a.operation_type)
).length;

// Next 90 Days - Appointments
const appointmentsNext90Days = appointmentsList.filter(a => 
  a.tentative_date && 
  a.tentative_date >= todayStr && 
  a.tentative_date <= ninetyDaysFromNow &&
  !TRANSFER_TYPES.includes(a.operation_type)
).length;

// This Month - STDAs ending
const stdasEndingThisMonth = stdasList.filter(s => 
  s.end_date && 
  s.end_date >= todayStr && 
  s.end_date <= monthEndStr
).length;
```

### Stats Card Subtitle Adjustments

For each timeframe, update subtitles to reflect the period:
- This Week: "New hires & returns" (existing)
- This Month: "This calendar month"
- Next 90 Days: "Coming up"

---

## State Structure

```typescript
const [stats, setStats] = useState<DashboardStats>({
  // This Week
  appointmentsThisWeek: 0,
  separationsThisWeek: 0,
  transfersThisWeek: 0,
  extensionsThisWeek: 0,
  stdasEndingSoon: 0,
  
  // This Month
  appointmentsThisMonth: 0,
  separationsThisMonth: 0,
  transfersThisMonth: 0,
  stdasEndingThisMonth: 0,
  extensionsThisMonth: 0,
  
  // Next 90 Days
  appointmentsNext90Days: 0,
  separationsNext90Days: 0,
  transfersNext90Days: 0,
  stdasEndingNext90Days: 0,
  extensionsNext90Days: 0,
  
  // Other existing fields...
  overdueAppointments: [],
  overdueSeparations: [],
  upcomingEvents: [],
  internationalExits: [],
  stdasEndingList: [],
});
```

---

## Expected Result

After implementation, the dashboard will display:

1. **This Week row** - Same as current, showing next 7 days
2. **This Month row** - Shows counts from today through end of current calendar month
3. **Next 90 Days row** - Shows counts from today through +90 days

Each row will have section headers making it clear which timeframe is being displayed. All stats cards remain clickable, navigating to the relevant operations page.
