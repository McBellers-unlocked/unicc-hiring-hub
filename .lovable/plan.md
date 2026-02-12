
# Add "Contract History" to Affiliate Personnel

## Overview
Add a "Contract History" menu option to each affiliate's Actions dropdown, linking to a new page that displays the affiliate's name and a table for tracking contract-related reference numbers.

## What You'll See
- A new **"Contract History"** option in the Actions dropdown (alongside Edit and Manage Lifecycle) with a FileSpreadsheet icon
- Clicking it navigates to `/admin/affiliate-history/:id`
- That page shows a header: **"Contract History for [Affiliate Name]"**
- Below, a table with columns: Samsaran PR, Samsaran PO, GSM Reg Number, GSM PO
- Users can add, edit, and delete rows in the table

## Technical Details

### 1. Database Migration
Create an `affiliate_contract_history` table:
- `id` (uuid, PK, default gen_random_uuid())
- `user_id` (uuid, FK to users.id -- the affiliate)
- `samsaran_pr` (text, nullable)
- `samsaran_po` (text, nullable)
- `gsm_reg_number` (text, nullable)
- `gsm_po` (text, nullable)
- `created_at` (timestamptz, default now())

RLS: authenticated users can SELECT, INSERT, UPDATE, DELETE.

### 2. New Page: `src/pages/AffiliateContractHistory.tsx`
- Fetch affiliate name from `users` table using the `:id` param
- Fetch contract history rows from `affiliate_contract_history` where `user_id = :id`
- Display header with affiliate name
- Render table with the four columns plus actions (edit/delete per row)
- "Add Row" button to insert new records
- Inline editing or dialog-based editing for each row
- Uses Layout wrapper, TanStack Query for data fetching

### 3. Route: `src/App.tsx`
Add route:
```text
/admin/affiliate-history/:id -> AffiliateContractHistory
```

### 4. Menu Update: `src/pages/AffiliatePersonnel.tsx`
Add a third `DropdownMenuItem` after "Manage Lifecycle":
```text
<DropdownMenuItem asChild>
  <Link to={/admin/affiliate-history/${affiliate.id}}>
    <FileSpreadsheet /> Contract History
  </Link>
</DropdownMenuItem>
```

### Files Changed/Created
- `src/pages/AffiliateContractHistory.tsx` (new)
- `src/pages/AffiliatePersonnel.tsx` (add menu item)
- `src/App.tsx` (add route)
- SQL migration for `affiliate_contract_history` table
