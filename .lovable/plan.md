Plan to update Userbase → Rows with missing values

I will update `src/components/userbase/MissingValuesPanel.tsx` only.

Changes to make:
1. Define the GSM-origin required fields used by the missing-values logic:
   - `full_name`
   - `gsm_email_address`

2. Keep the existing required-field detection intact, then add a final frontend filter so that a row is excluded when:
   - `worker_type` is `Affiliate`, case-insensitive, and
   - every missing required field is one of the GSM-origin fields above.

3. Keep affiliate rows visible when they are missing any non-GSM required field, including:
   - `samsaran_email_address`
   - `division`
   - `unit`
   - `job_title`
   - `worker_type`
   - `office_location`
   - `line_manager`
   - `category`

4. Ensure the displayed row count and export output both use the filtered `rows` array, so affiliate rows missing only GSM-origin values are not shown or exported.

Technical details:
```ts
const GSM_ORIGIN_REQUIRED_FIELDS = new Set(['full_name', 'gsm_email_address']);

const getMissingFields = (row: any) =>
  REQUIRED_FIELDS.filter((field) => isBlank(row[field.key]));

const isAffiliateWorker = (row: any) =>
  String(row.worker_type ?? '').trim().toLowerCase() === 'affiliate';

const isMissingOnlyGsmOriginFields = (row: any) => {
  const missing = getMissingFields(row);
  return (
    missing.length > 0 &&
    missing.every((field) => GSM_ORIGIN_REQUIRED_FIELDS.has(field.key))
  );
};
```

No database, import, or RLS changes are needed.