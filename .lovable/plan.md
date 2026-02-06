

# Fix First Contract Date Display Issue

## Problem

The "First Contract" column shows no data because `first_incumbency_date` is NULL for all affiliates in the database. This is a **data gap**, not a code bug.

**Root cause:** 
- The CSV import function supports a "First Incumbency" column (line 116)
- But it's not listed in the expected columns on the Import page
- So the source CSVs being imported don't include this field

---

## Solution

### 1. Update Import Page Documentation

Add "First Incumbency Date" to the expected CSV columns list so HR knows to include it:

**File:** `src/pages/ImportAffiliatePersonnel.tsx`

```
Expected columns list additions:
• First Incumbency Date (original contract start)
```

### 2. Auto-Set First Incumbency on Initial Import

Update the import function to automatically set `first_incumbency_date` equal to `contract_start_date` **when it's a new record AND first_incumbency_date is not provided**.

This ensures:
- New affiliates get their first contract date recorded automatically
- Re-imports preserve the original first incumbency date
- CSV can override if a "First Incumbency Date" column is provided

**File:** `supabase/functions/import-affiliate-personnel/index.ts`

```typescript
// When creating a NEW affiliate record (not updating)
// If no first_incumbency_date is provided, use contract_start_date
if (!affiliate.first_incumbency_date && affiliate.contract_start_date) {
  updateData.first_incumbency_date = affiliate.contract_start_date;
}
```

### 3. Add Bulk Update for Existing Data (Optional UI Action)

Add an action button on the Affiliate Personnel page to backfill missing `first_incumbency_date` values using each affiliate's `contract_start_date`.

**This is a one-time data fix for existing records.**

---

## Implementation Details

### File Changes

| File | Changes |
|------|---------|
| `src/pages/ImportAffiliatePersonnel.tsx` | Add "First Incumbency Date" to expected columns |
| `supabase/functions/import-affiliate-personnel/index.ts` | Auto-set first_incumbency_date for new records |
| `src/pages/AffiliatePersonnel.tsx` | Add "Backfill First Contract Dates" button |

### Backfill Button Logic

```typescript
const handleBackfillFirstIncumbency = async () => {
  // Update all affiliates where first_incumbency_date is NULL
  // Set it to their contract_start_date
  const { error } = await supabase
    .from('users')
    .update({ first_incumbency_date: supabase.raw('contract_start_date') })
    .eq('personnel_type', 'Affiliate')
    .is('first_incumbency_date', null)
    .not('contract_start_date', 'is', null);
  
  // Refetch data
  queryClient.invalidateQueries({ queryKey: ['affiliate-personnel'] });
};
```

---

## Expected Outcome

After implementation:
1. Existing affiliates can have their first contract date backfilled with one click
2. Future imports will auto-capture first incumbency date
3. The "First Contract" column will display properly

---

## Summary

| Change | Purpose |
|--------|---------|
| Document column in import page | HR knows to include it in CSVs |
| Auto-set on new imports | Future affiliates get date automatically |
| Backfill button | Fix existing data with one click |

