

# Add "Launch PR" Button and Wizard Dialog to Lifecycle Management

## Overview
Add a prominent "Launch PR" button in the affiliate info card between the name/email and the badges (affiliate type, division). Clicking it opens a wizard dialog showing contract record fields that are editable and synced back to the database.

## Changes

### 1. Update contract query to include new fields (`src/pages/AffiliateLifecycle.tsx`)
- Add `unit_price`, `unit`, `currency` to the `ContractRecord` interface
- Add these fields to the `.select()` call in the contract query

### 2. Add "Launch PR" button in the affiliate info card
- Place it between the name/email div and the badges div (line 257 area)
- Style: `bg-primary text-primary-foreground` (matching the blue used for icons/timeline)
- Icon: `Rocket` from lucide-react

### 3. Create the Launch PR wizard dialog
- State: `showLaunchPR` boolean, plus local form state for the 6 fields (start_date, end_date, days_worked calculated, unit_price, unit, currency)
- **Page 1**: Display and edit 6 fields:
  - Start Date and End Date: date pickers (using `CustomDatePicker`)
  - Unit Price: numeric input (step="0.01")
  - Unit: dropdown ("day" / "hour")
  - Currency: dropdown ("USD", "EUR", "CHF", "INR", "PKR", "BRL")
  - Days Worked: displayed as read-only (calculated from start/end dates, or from the record)
- "Next" button disabled if any of the 6 fields is empty/missing
- On field change: update the contract record in `affiliate_contract_history` via a mutation, then invalidate the contract query

### 4. Add update mutation
- A mutation that updates `start_date`, `end_date`, `unit_price`, `unit`, `currency` on the `affiliate_contract_history` record by `record_number`
- On success: invalidate the contract query and show toast

## Files Modified
- `src/pages/AffiliateLifecycle.tsx` — all changes in this single file (query, button, dialog, mutation)

