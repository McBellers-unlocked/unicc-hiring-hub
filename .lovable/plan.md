

## Add "Days Worked" to Affiliate Import and Download Template

Three changes across two files:

**1. Edge Function (`supabase/functions/import-affiliate-personnel/index.ts`)**
- Add `days_worked: string` to `AffiliateRow` interface (line 32)
- Add column detection: `const daysWorkedIndex = findColumn(['days worked', 'daysworked']);` (after line 131)
- Add to parsed row object: `days_worked: daysWorkedIndex !== -1 ? values[daysWorkedIndex]?.trim() : '',` (after line 212)
- Add to contract data block (after line 348):
  ```typescript
  if (affiliate.days_worked) {
    const parsed = parseFloat(affiliate.days_worked);
    if (!isNaN(parsed)) contractData.days_worked = parsed;
  }
  ```
- Add `days_worked` to `hasContractData` check (line 333)

**2. Download Template (`src/pages/AffiliatePersonnel.tsx`)**
- Append `,Days Worked` to the CSV headers string on line 635

