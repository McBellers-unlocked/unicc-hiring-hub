

## Refactor Lifecycle Management to be PR-based

### Overview
Change the lifecycle management from being keyed by affiliate user ID to being keyed by Samsaran PR number. Each PR in contract history gets its own independent lifecycle screen. The route changes from `/admin/affiliate-personnel/:id/lifecycle` to `/admin/affiliate-personnel/:id/lifecycle/:samsaranPr`.

### Database Change

Add a `samsaran_pr` column to `affiliate_lifecycle_checklists` to link checklist items to a specific PR instead of relying on contract dates.

```sql
ALTER TABLE affiliate_lifecycle_checklists
  ADD COLUMN samsaran_pr text;
```

### Route Change

**File: `src/App.tsx`**

Update the route from:
```
/admin/affiliate-personnel/:id/lifecycle
```
to:
```
/admin/affiliate-personnel/:id/lifecycle/:samsaranPr
```

### Changes to `src/pages/AffiliateLifecycle.tsx`

1. **Extract `samsaranPr` from URL params** instead of only `id`. Use `useParams<{ id: string; samsaranPr: string }>()`.

2. **Fetch the contract history record** matching `user_id = id` and `samsaran_pr = samsaranPr` from `affiliate_contract_history`. This provides the `start_date`, `end_date`, `samsaran_po`, `gsm_reg_number`, and `gsm_po` for the header card.

3. **Update the info card** at the top to show:
   - Name and email (from the users query, kept as-is)
   - Samsaran PR number (from URL / contract history record)
   - Contract start date and end date (from the contract history record, not the users table)

4. **Update contract info calculation** to use `start_date` / `end_date` from the contract history record rather than from `users.contract_start_date` / `users.contract_end_date`.

5. **Update checklist queries** to filter by `samsaran_pr` instead of `next_contract_start`:
   - Fetch: `.eq('samsaran_pr', samsaranPr)` instead of `.eq('next_contract_start', ...)`
   - Initialize: include `samsaran_pr` field in each inserted checklist item

### Changes to `src/pages/AffiliatePersonnel.tsx`

**"Manage Lifecycle" link** (line 893): Change the link from:
```
/admin/affiliate-personnel/${affiliate.id}/lifecycle
```
to:
```
/admin/affiliate-personnel/${affiliate.id}/lifecycle/${encodeURIComponent(latest?.samsaran_pr || '')}
```

This uses the PR value already displayed in the table row (from `contractHistoryMap`). If no PR exists, the link is disabled or hidden.

### Changes to `src/pages/AffiliateContractHistory.tsx`

**"Go to Lifecycle" link** (line 259): Change the link from:
```
/admin/affiliate-personnel/${id}/lifecycle
```
to:
```
/admin/affiliate-personnel/${id}/lifecycle/${encodeURIComponent(row.samsaran_pr || '')}
```

Each row in contract history links to its own PR-specific lifecycle.

### Summary of Data Flow

```text
Affiliate Personnel table
  -> "Manage Lifecycle" uses the PR shown in that row
  -> navigates to /admin/affiliate-personnel/{userId}/lifecycle/{samsaranPr}

Contract History table
  -> Each row's "Go to Lifecycle" button uses that row's samsaran_pr
  -> navigates to /admin/affiliate-personnel/{userId}/lifecycle/{samsaranPr}

Lifecycle page
  -> Fetches user info from users table (name, email, type, division)
  -> Fetches contract details from affiliate_contract_history WHERE samsaran_pr = :samsaranPr
  -> Fetches/creates checklist items filtered by samsaran_pr
  -> Header shows: Name, Email, Samsaran PR, Start Date, End Date
```
