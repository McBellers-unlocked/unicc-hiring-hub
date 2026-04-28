Plan to update Userbase → Rows with missing values

I will update `src/components/userbase/MissingValuesPanel.tsx` only.

Changes to make:
1. Reuse the existing GSM-origin required-field definition:
   - `full_name`
   - `gsm_email_address`

2. Add a display/export helper for missing fields so affiliate personnel do not show GSM-origin fields in the “Missing Fields” column:
   - If `worker_type` is `Affiliate` case-insensitive, remove GSM-origin fields from the displayed missing-field list.
   - If the row is not Affiliate, keep the existing missing-field list unchanged.

3. Apply that helper consistently to:
   - The “Missing Fields” badges in the table.
   - The `missing_fields` value in the CSV export.

4. Keep the existing row filtering logic intact:
   - Affiliate rows missing only GSM-origin fields remain excluded from the table.
   - Affiliate rows missing any non-GSM field remain visible, but their badges/export will only list the non-GSM missing fields.

Technical details:
```ts
const getDisplayMissingFields = (row: MissingValuesRow) => {
  const missing = getMissingFields(row);

  if (!isAffiliateWorker(row)) return missing;

  return missing.filter(
    (field) => !GSM_ORIGIN_REQUIRED_FIELDS.has(field.key),
  );
};
```

No database, import, or RLS changes are needed.