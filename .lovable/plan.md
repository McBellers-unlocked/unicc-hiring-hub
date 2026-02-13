

## Update Affiliate Personnel Table Columns

### Overview
Replace the "Contract End" column with three new columns sourced from the `affiliate_contract_history` table: "Current PR", "Start Date", and "End Date". The "Current PR" shows the Samsaran PR from the record with the most recent contract start date.

### Changes to `src/pages/AffiliatePersonnel.tsx`

**1. Add a new query to fetch all affiliate contract history records**

Fetch all rows from `affiliate_contract_history` for the displayed affiliates. Group them by `user_id` and, for each affiliate, find the record with the latest `start_date` to determine the "current" contract.

**2. Replace columns in the table**

Current column order:
Name | Type | Division | Job Title | Location | First Contract | Status | **Contract End** | Actions

New column order:
Name | Type | Division | Job Title | Location | First Contract | Status | **Current PR** | **Start Date** | **End Date** | Actions

- **Current PR**: The `samsaran_pr` value from the `affiliate_contract_history` row with the most recent `start_date` for that affiliate. Shows "-" if no records exist.
- **Start Date**: The `start_date` from the same most-recent record. Formatted as locale date.
- **End Date**: The `end_date` from the same most-recent record. Formatted as locale date.

**3. Remove the "Contract End" column**

Remove the `SortableTableHead` for `contract_end_date` and its corresponding `TableCell`.

### Technical Details

| Area | Detail |
|------|--------|
| New query | `supabase.from('affiliate_contract_history').select('user_id, samsaran_pr, start_date, end_date').order('start_date', { ascending: false })` |
| Lookup | Build a `Map<user_id, { samsaran_pr, start_date, end_date }>` keeping only the first (most recent) record per user |
| New columns | Three non-sortable `TableHead` elements for Current PR, Start Date, End Date |
| Removed column | `contract_end_date` sortable head and cell |
| SortField type | Remove `'contract_end_date'` from the `SortField` union type |

