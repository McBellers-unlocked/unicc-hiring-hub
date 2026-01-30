
## Plan: Add Contract Break Status for Affiliates ✅ COMPLETED

### Implementation Summary

**Database**: Added `first_incumbency_date` column to `users` table

**Frontend** (`src/pages/AffiliatePersonnel.tsx`):
- Updated `getContractStatus` to check `first_incumbency_date` for contract break detection
- Added new filters: "Contract Break" and "No Data"
- Added new stat cards: "Contract Break" and "No Data" counts
- Updated table display with appropriate icons

**Import Functions**:
- `import-staff-list`: Now imports `first_incumbency_date` from CSV
- `import-affiliate-personnel`: Now imports `first_incumbency_date` from CSV

### Status Logic

| Scenario | first_incumbency_date | contract_start_date | Status Display |
|----------|----------------------|---------------------|----------------|
| Contract break | ✓ has date | Future date | "Non-active: Contract break" (yellow) |
| New hire soon | NULL | Future date | "Starts [date]" (outline) |
| No data at all | NULL | NULL | "Non-active" (red) |
| Active contract | any | Past date | "Active" or "Xd remaining" |
