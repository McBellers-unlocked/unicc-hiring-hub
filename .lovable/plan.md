
## Plan: Show "Not Active" Status for Future Contract Start Dates

### Problem
Affiliates with a future `contract_start_date` (e.g., 3 March 2026 when today is 30 Jan 2026) are currently shown as "Active" because the status logic only checks the end date.

### Solution
Update the `getContractStatus` function to also check the start date:
- If `contract_start_date` is in the future → show "Not Active" with the start date
- Add a new filter option for "Not Yet Started" affiliates

---

### Changes

**File: `src/pages/AffiliatePersonnel.tsx`**

1. **Update `getContractStatus` function** to accept and check start date:

```typescript
const getContractStatus = (
  startDate: string | null, 
  endDate: string | null
): { 
  status: string; 
  variant: 'default' | 'secondary' | 'destructive' | 'outline'; 
  daysRemaining: number | null;
  isNotYetActive: boolean;
} => {
  // Check if contract hasn't started yet
  if (startDate) {
    const daysUntilStart = differenceInDays(parseISO(startDate), new Date());
    if (daysUntilStart > 0) {
      return { 
        status: `Starts ${format(parseISO(startDate), 'dd MMM yyyy')}`, 
        variant: 'outline', 
        daysRemaining: null,
        isNotYetActive: true
      };
    }
  }
  
  // Existing end date logic...
  if (!endDate) return { status: 'No end date', variant: 'outline', daysRemaining: null, isNotYetActive: false };
  
  const days = differenceInDays(parseISO(endDate), new Date());
  
  if (days < 0) return { status: 'Expired', variant: 'destructive', daysRemaining: days, isNotYetActive: false };
  if (days <= 30) return { status: `${days}d remaining`, variant: 'destructive', daysRemaining: days, isNotYetActive: false };
  if (days <= 90) return { status: `${days}d remaining`, variant: 'secondary', daysRemaining: days, isNotYetActive: false };
  return { status: 'Active', variant: 'default', daysRemaining: days, isNotYetActive: false };
};
```

2. **Update all calls** to `getContractStatus` to pass both dates:

```typescript
const contractStatus = getContractStatus(
  affiliate.contract_start_date, 
  affiliate.contract_end_date
);
```

3. **Add a new filter option** for "Not Yet Active":

```typescript
<SelectItem value="not-started">Not Yet Started</SelectItem>
```

4. **Update filter logic**:

```typescript
(statusFilter === 'not-started' && contractStatus.isNotYetActive)
```

5. **Add a stat card** for "Starting Soon" (optional):

```typescript
notYetStarted: affiliates?.filter(a => {
  const status = getContractStatus(a.contract_start_date, a.contract_end_date);
  return status.isNotYetActive;
}).length || 0,
```

6. **Update table display** to show a distinct icon for not-yet-active status:

```typescript
{contractStatus.isNotYetActive && <Clock className="h-3 w-3 mr-1" />}
```

---

### Expected Result

| Scenario | Status Display |
|----------|----------------|
| Start: 3 Mar 2026, Today: 30 Jan 2026 | "Starts 03 Mar 2026" (outline badge) |
| Start: 1 Jan 2026, End: 30 Jun 2026 | "Active" or "Xd remaining" |
| Start: 1 Jan 2025, End: 1 Jan 2026 | "Expired" |

---

### Files to Modify

| File | Change |
|------|--------|
| `src/pages/AffiliatePersonnel.tsx` | Update status logic, filters, and display |
