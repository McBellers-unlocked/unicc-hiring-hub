

## Make Contract Fields Read-Only in Bulk Edit

### Problem
The Bulk Edit page at `/admin/affiliate-personnel/edit` (`src/pages/AffiliateDemographicsEdit.tsx`) allows inline editing of "Start Date" and "End Date" columns (lines 324-328). These fields map to `contract_start_date` and `contract_end_date` on the `users` table, but contract dates should only be editable through the Contract History page (`/admin/affiliate-history/{id}`).

### Solution
In `src/pages/AffiliateDemographicsEdit.tsx`, replace the two editable date cells for `contract_start_date` and `contract_end_date` with static, non-clickable display cells -- the same way the `email` field is already treated (displayed but not editable).

### Technical Details

**File: `src/pages/AffiliateDemographicsEdit.tsx`**

- Lines 323-328: Replace the two `renderEditableCell` calls for `contract_start_date` and `contract_end_date` with plain read-only `<span>` elements that format the date (or show "-" if null).
- The `renderEditableCell` function itself needs no changes; only the two call sites are affected.
- The columns will remain visible so users can still see the dates, but clicking them will not trigger editing.

