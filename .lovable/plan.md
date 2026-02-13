

## Update Import Function to Handle Contract History Fields

### Problem
The current `import-affiliate-personnel` edge function only updates the `users` table. The CSV template now includes contract history fields (Samsaran PR, Samsaran PO, GSM Reg Number, GSM PO) that map to the `affiliate_contract_history` table, but the importer ignores them.

### Solution
Extend the edge function to parse the new contract history columns and upsert records into `affiliate_contract_history` after processing each affiliate's user record.

### Technical Details

**File: `supabase/functions/import-affiliate-personnel/index.ts`**

1. **Add column detection** for the new fields (around line 113):
   - `samsaran_pr` (pattern: `samsaran pr`)
   - `samsaran_po` (pattern: `samsaran po`)
   - `gsm_reg_number` (pattern: `gsm reg`)
   - `gsm_po` (pattern: `gsm po`)

2. **Extend `AffiliateRow` interface** (line 8) with four new fields:
   - `samsaran_pr: string`
   - `samsaran_po: string`
   - `gsm_reg_number: string`
   - `gsm_po: string`

3. **Parse the new fields** in the row-processing loop (around line 174), reading values from the detected column indices.

4. **Upsert into `affiliate_contract_history`** after each user is created/updated (around lines 243-307):
   - Only if at least one contract field (samsaran_pr, samsaran_po, gsm_reg_number, gsm_po, contract_start_date, contract_end_date) has a value.
   - Use `samsaran_pr` as the lookup key: query `affiliate_contract_history` for an existing record matching both `user_id` and `samsaran_pr`.
   - If found: update that record with the new values.
   - If not found: insert a new record with `user_id`, `samsaran_pr`, `samsaran_po`, `gsm_reg_number`, `gsm_po`, `start_date`, `end_date`.
   - Track contract-specific errors separately and include them in the response.

5. **Update response summary** to include a `contracts_updated` count alongside `created` and `updated`.

### Flow

```text
For each CSV row:
  1. Upsert user in `users` table (existing logic)
  2. If any contract field is present:
     a. Look up existing contract record by (user_id + samsaran_pr)
     b. If exists -> UPDATE the record
     c. If not -> INSERT new record
```

### No database schema changes needed
The `affiliate_contract_history` table already has all required columns (`samsaran_pr`, `samsaran_po`, `gsm_reg_number`, `gsm_po`, `start_date`, `end_date`, `user_id`).

