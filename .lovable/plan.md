
## Plan: Fix Contract Status Logic for Affiliates

### Problem Identified
Looking at the database, most affiliates have **NULL values for all date fields** (`contract_start_date`, `contract_end_date`, and `first_incumbency_date`). This causes them to fall into the "Non-active" (red) status, which is incorrect.

The current logic:
```typescript
// Case 2: No start date AND no first incumbency date → No data
if (!startDate && !firstIncumbencyDate) {
  return { status: 'Non-active', variant: 'destructive' };
}
```

This is too aggressive - it marks everyone without these dates as "Non-active" when really they might be active but just missing data.

---

### Root Cause
The CSV import didn't populate the contract date fields for most affiliates. This is a **data quality issue** that needs to be addressed, but the UI shouldn't show misleading status.

---

### Proposed Fix

Update the status logic to be clearer about what "Non-active" means:

**Current statuses:**
| Scenario | Status |
|----------|--------|
| Future start + has first_incumbency_date | "Non-active: Contract break" (yellow) |
| Future start + no first_incumbency_date | "Starts [date]" (outline) |
| No dates at all | "Non-active" (red) ← Misleading! |
| Active contract | "Active" / "Xd remaining" |

**Proposed statuses:**
| Scenario | Status |
|----------|--------|
| Future start + has first_incumbency_date | "Non-active: Contract break" (yellow) |
| Future start + no first_incumbency_date | "Starts [date]" (outline) |
| **No start date + no first_incumbency_date** | **"No Data"** (outline/gray) |
| **No start date + HAS first_incumbency_date** | **Check end date or show "Active" (assumed)** |
| Active contract | "Active" / "Xd remaining" |

---

### Technical Changes

**File: `src/pages/AffiliatePersonnel.tsx`**

1. **Rename "Non-active" to "No Data"** for the case where we simply don't have date information:
   - Change status text from "Non-active" to "No Data" 
   - Keep the variant as `destructive` (red) to indicate action needed (data should be populated)

2. **Add logic for affiliates WITH first_incumbency_date but NO contract_start_date**:
   - If they have a `first_incumbency_date` (meaning they've worked before) but no current `contract_start_date`, check the `contract_end_date` to determine if they're expired or active

3. **Update filter label** from "No Data" to better reflect the meaning

---

### Files to Modify

| File | Change |
|------|--------|
| `src/pages/AffiliatePersonnel.tsx` | Refine status text and logic |

---

### Notes
The real fix is to **re-import the CSV with proper date columns** or manually update the database with the correct contract dates. The UI change just makes it clearer that the status is unknown due to missing data, not that the person is actually non-active.
