

## Add Start Date and End Date to Contract History Records

### Overview
Add two new date columns ("Start Date" and "End Date") to the affiliate contract history table and UI. These correspond to the "Contract Start Date" and "Contract End Date" columns from the affiliate personnel CSV import.

### Changes

**1. Database migration**

Add two nullable `date` columns to the `affiliate_contract_history` table:
- `start_date` (date, nullable)
- `end_date` (date, nullable)

**2. Update `src/pages/AffiliateContractHistory.tsx`**

- Add `start_date` and `end_date` to the `ContractHistoryRow` interface and `FormData` interface
- Add two date input fields in the add/edit dialog form
- Add "Start Date" and "End Date" column headers in the table
- Display formatted dates in the table cells
- Include the new fields in the `emptyForm` default, `openEdit` mapping, and save mutation payload

### Technical Details

| Area | Detail |
|------|--------|
| Migration SQL | `ALTER TABLE affiliate_contract_history ADD COLUMN start_date date, ADD COLUMN end_date date;` |
| Input type | HTML date inputs (`<Input type="date" />`) for clean date picking |
| Display format | Formatted as locale date string, or "-" if null |
| Form defaults | Empty string, sent as `null` to the database when blank |

