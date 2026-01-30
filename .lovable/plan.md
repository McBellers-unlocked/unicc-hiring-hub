
## Plan: Add Contract Break Status for Affiliates

### Goal
Show different statuses for affiliate personnel based on their contract history:
- **Contract break**: Has worked before but next contract is in the future → "Non-active: Contract break" (yellow)
- **No history/data**: No first date recorded → "Non-active" (red)
- **Starting soon**: New personnel with future start date → "Starts [date]" (outline)
- **Active**: Currently under contract → "Active" or expiring status

---

### Database Change

Add a new column `first_incumbency_date` to the `users` table:

```sql
ALTER TABLE public.users 
ADD COLUMN first_incumbency_date DATE;

COMMENT ON COLUMN public.users.first_incumbency_date IS 
  'The date the affiliate first started working with UNICC. Used to distinguish contract breaks from new hires.';
```

---

### Frontend Changes

**File: `src/pages/AffiliatePersonnel.tsx`**

1. **Update the interface** to include the new field:
```typescript
interface AffiliateUser {
  // ... existing fields
  first_incumbency_date: string | null;
}
```

2. **Update the query** to fetch the new field:
```typescript
.select('..., first_incumbency_date')
```

3. **Update `getContractStatus` function** to handle all scenarios:

```typescript
const getContractStatus = (
  startDate: string | null,
  endDate: string | null,
  firstIncumbencyDate: string | null
): { 
  status: string; 
  variant: 'default' | 'secondary' | 'destructive' | 'outline'; 
  daysRemaining: number | null;
  isNotYetActive: boolean;
  isContractBreak: boolean;
  isNoData: boolean;
} => {
  const today = new Date();
  
  // Case 1: Contract hasn't started yet
  if (startDate) {
    const daysUntilStart = differenceInDays(parseISO(startDate), today);
    if (daysUntilStart > 0) {
      // They have worked before → Contract break
      if (firstIncumbencyDate) {
        return { 
          status: 'Non-active: Contract break', 
          variant: 'secondary',  // yellow
          daysRemaining: null,
          isNotYetActive: true,
          isContractBreak: true,
          isNoData: false
        };
      }
      // New hire starting soon
      return { 
        status: `Starts ${format(parseISO(startDate), 'dd MMM yyyy')}`, 
        variant: 'outline', 
        daysRemaining: null,
        isNotYetActive: true,
        isContractBreak: false,
        isNoData: false
      };
    }
  }
  
  // Case 2: No start date AND no first incumbency date → No data
  if (!startDate && !firstIncumbencyDate) {
    return { 
      status: 'Non-active', 
      variant: 'destructive',  // red
      daysRemaining: null,
      isNotYetActive: false,
      isContractBreak: false,
      isNoData: true
    };
  }
  
  // Case 3: Contract has started, check end date for expiry
  // ... existing end date logic
};
```

4. **Update filters** to include "Contract Break" and "No Data" options:
```typescript
<SelectItem value="contract-break">Contract Break</SelectItem>
<SelectItem value="no-data">No Data</SelectItem>
```

5. **Update stats** to show counts for each status type

6. **Update table display** with appropriate icons and colors

---

### Import Function Updates

**File: `supabase/functions/import-affiliate-personnel/index.ts`**
**File: `supabase/functions/import-staff-list/index.ts`**

Add support for importing `first_incumbency_date` from CSV:
- Look for columns like "first incumbency", "original start", "first start date"
- Map to the new database field

---

### Expected Behavior

| Scenario | first_incumbency_date | contract_start_date | Status Display |
|----------|----------------------|---------------------|----------------|
| Contract break | 01 Mar 2025 | 01 Mar 2026 | "Non-active: Contract break" (yellow) |
| New hire soon | NULL | 01 Mar 2026 | "Starts 01 Mar 2026" (outline) |
| No data at all | NULL | NULL | "Non-active" (red) |
| Active contract | 01 Jan 2024 | 01 Jan 2025 | "Active" or "Xd remaining" |

---

### Files to Modify

| File | Change |
|------|--------|
| Database migration | Add `first_incumbency_date` column |
| `src/pages/AffiliatePersonnel.tsx` | Update status logic, filters, stats, display |
| `supabase/functions/import-affiliate-personnel/index.ts` | Support importing the new field |
| `supabase/functions/import-staff-list/index.ts` | Support importing the new field |
