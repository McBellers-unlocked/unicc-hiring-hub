

## Update Affiliate Form: Contract Fields to Contract History + Add Samsaran PR

### Problem
1. The "Add Affiliate" form saves `contract_start_date` and `contract_end_date` directly to the `users` table, but the project's data model uses `affiliate_contract_history` as the primary source for these values.
2. The Contract tab is missing a Samsaran PR field, which is the key identifier for contract records.

### Changes

#### File: `src/components/affiliate/AffiliateForm.tsx`

1. **Add `samsaran_pr` to the Zod schema and form defaults** -- add `samsaran_pr: z.string().optional()` to the schema, and include it in all `reset()` calls and default values.

2. **Add Samsaran PR input field** in the Contract tab -- place it as the first field (full width or half width) before the date pickers, with label "Samsaran PR" and placeholder "e.g. PR-2026-001".

3. **Update `AffiliateFormData` type** -- since it's inferred from the schema, adding to the schema automatically updates the exported type.

#### File: `src/pages/AffiliatePersonnel.tsx`

4. **Update `handleFormSubmit`** to write contract fields to `affiliate_contract_history` instead of the `users` table:
   - Remove `contract_start_date` and `contract_end_date` from all three `users` table operations (update, convert, insert).
   - After the user record is created/updated, if any contract field is present (`samsaran_pr`, `contract_start_date`, or `contract_end_date`), upsert a record into `affiliate_contract_history` with:
     - `user_id`: the affiliate's ID
     - `samsaran_pr`: from the form
     - `start_date`: from `contract_start_date`
     - `end_date`: from `contract_end_date`
   - Use the same lookup pattern as the import function: query by `user_id` + `samsaran_pr`, then update or insert accordingly.
   - Invalidate the `affiliate-contract-history` query key as well so the contract history view stays in sync.

### Summary of Data Flow

```text
Form submission:
  1. Save personal + assignment fields to `users` table (no contract dates)
  2. If samsaran_pr or start/end date provided:
     a. Look up affiliate_contract_history by (user_id + samsaran_pr)
     b. If found -> UPDATE
     c. If not found -> INSERT
  3. Invalidate both 'affiliate-personnel' and 'affiliate-contract-history' queries
```

### No database changes needed
All required columns already exist in both tables.
