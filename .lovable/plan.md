

## Add "Days Worked" Column to Affiliate Contract Management

### 1. Database Migration

Add a `days_worked` integer column to the `affiliate_contract_history` table:

```sql
ALTER TABLE affiliate_contract_history ADD COLUMN days_worked integer;
```

### 2. Contract Records Table (AffiliateContractHistory.tsx)

- Add `days_worked` to the `ContractHistoryRow` interface and `FormData` interface.
- Add `days_worked: ''` to `emptyForm`.
- Add a "Days Worked" column header between "End Date" and "Actions" in the table.
- Display the value in each row (or `-` if null).
- Add a "Days Worked" input field (type number) in the Add/Edit Record dialog.
- Include `days_worked` in the save mutation payload (convert to integer or null).
- Populate the field when editing an existing row.

### 3. Add Affiliate Form (AffiliateForm.tsx)

- Add `days_worked: z.coerce.number().optional()` to the Zod schema.
- Add a "Days Worked" number input field in the Contract tab, placed after the date pickers and before the First Incumbency Date field.

### 4. Affiliate Personnel Submit Logic (AffiliatePersonnel.tsx)

- Include `days_worked` in the contract history upsert logic (both update and insert paths), reading from `data.days_worked`.
- Update the condition that triggers the upsert to also check for `data.days_worked`.

### Technical Summary

| File | Changes |
|------|---------|
| Database | Add `days_worked integer` column to `affiliate_contract_history` |
| `src/pages/AffiliateContractHistory.tsx` | Add to interface, form, table column, dialog field, save payload |
| `src/components/affiliate/AffiliateForm.tsx` | Add to schema, add number input in Contract tab |
| `src/pages/AffiliatePersonnel.tsx` | Include `days_worked` in contract history upsert |

