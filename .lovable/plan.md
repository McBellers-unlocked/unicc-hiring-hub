## Conditional Lifecycle/Onboarding Link in Contract History

### What to do

**File**: `src/pages/AffiliateContractHistory.tsx`

1. **Determine the oldest record** — Compute the oldest record by sorting rows by `start_date`. The oldest (or only) record routes to `/onboarding/`, all others route to `/lifecycle/`.
2. **Update the link (~line 387)** — Replace the hardcoded `/lifecycle/` path with a conditional:
  - If the row is the oldest record (or the only one), link to `/admin/affiliate-personnel/${id}/onboarding/${row.record_number}`
  - Otherwise, link to `/admin/affiliate-personnel/${id}/lifecycle/${row.record_number}`
3. **Update the tooltip** — Change tooltip text to "Go to Onboarding" or "Go to Lifecycle" accordingly.

The oldest record is determined by comparing `created_at` timestamps across all rows (not just filtered/sorted view).