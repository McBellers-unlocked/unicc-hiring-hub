

# Add Step 3 to Launch PR Wizard

## Changes

### `src/components/affiliate/LaunchPRDialog.tsx`
1. Add `affiliateManager` prop (string | null)
2. Add state for step 3 fields: `manager` (pre-filled from `affiliateManager`), `address` (dropdown), `job` (free text)
3. Update step count in title to "Step X/3"
4. Step 2 "Next" button advances to step 3 (rename current "Submit" to "Next")
5. Step 3 renders:
   - **Manager**: text input pre-filled with affiliate's `line_manager`
   - **Address**: dropdown with options "Offshore", "Valencia", "Brindisi", "Geneva", "New York", "Rome"
   - **Job**: free text input
6. Step 3 footer: "Back" (returns to step 2) and "Submit"
7. Pre-fill manager when entering step 3

### `src/pages/AffiliateLifecycle.tsx`
- The `users` query already selects affiliate data but doesn't include `line_manager`. Add it to the select and the `AffiliateUser` interface.
- Pass `affiliateManager={affiliate.line_manager}` to `LaunchPRDialog`

