

## Plan: Fix Overdue Date Calculation

### The Bug

The current "overdue" calculation is based on when HR should have been **notified** (tentative_date minus notice_days_required), not the actual tentative start date.

**Example with current logic:**
- Tentative Date: Feb 3, 2026
- Notice Days Required: 30
- Notify By Date: Jan 4, 2026 (Feb 3 - 30 days)
- Today: Feb 5, 2026
- Days to Notify: -32 (Jan 4 was 32 days ago)
- Result: "32d overdue" ❌

**What it should show:**
- If the start date (Feb 3) is in the past and status is "In progress" → "2d overdue"
- If the start date is in the future → "X days remaining" until start

---

### Solution Options

**Option A: Show days until/since start date (Recommended)**
- Calculate days relative to the actual `tentative_date`
- If passed and still "In progress" → show "Xd overdue"
- If upcoming → show "Xd remaining"

**Option B: Dual indicator**
- Show notification deadline separately
- Show start date deadline separately

---

### Implementation (Option A)

**Update `calculateDaysToNotify` to `calculateDaysUntilStart`:**

```typescript
export const calculateDaysUntilStart = (
  tentativeDate: string | null | undefined
): number | null => {
  if (!tentativeDate) return null;
  
  const startDate = parseISO(tentativeDate);
  const today = new Date();
  
  // Normalize both dates to start of day for accurate day comparison
  today.setHours(0, 0, 0, 0);
  startDate.setHours(0, 0, 0, 0);
  
  return differenceInDays(startDate, today);
};
```

**Update `getStatusInfo`:**

```typescript
export const getStatusInfo = (
  status: string,
  daysUntilStart: number | null
): { label: string; variant: ...; pulse?: boolean } => {
  if (status === 'Completed') {
    return { label: 'Completed', variant: 'default' };
  }
  if (status === 'Cancelled') {
    return { label: 'Cancelled', variant: 'secondary' };
  }
  if (status === 'Not started') {
    return { label: 'Not started', variant: 'outline' };
  }
  
  // In progress - check days until start
  if (daysUntilStart !== null && daysUntilStart < 0) {
    // Start date has passed but still "In progress"
    return { 
      label: `${Math.abs(daysUntilStart)}d overdue`, 
      variant: 'destructive',
      pulse: true 
    };
  }
  if (daysUntilStart !== null && daysUntilStart <= 7) {
    return { label: `${daysUntilStart}d remaining`, variant: 'secondary' };
  }
  
  return { label: 'In progress', variant: 'outline' };
};
```

---

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/operations/AppointmentStatusBadge.tsx` | Fix date calculation logic |

---

### Result After Fix

- Tentative Date: Feb 3, 2026
- Today: Feb 5, 2026
- Days Until Start: -2 (Feb 3 was 2 days ago)
- Result: "2d overdue" ✅

---

### Note on `noticeDaysRequired`

The `noticeDaysRequired` field can still be useful for a separate "notification reminder" feature, but it shouldn't drive the overdue status. The overdue badge should reflect whether the actual start date has passed.

