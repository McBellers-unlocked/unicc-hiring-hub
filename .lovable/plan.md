

# Add Unit Price, Unit, and Currency to Contract Records

## Database Change
Add three columns to `affiliate_contract_history`:
- `unit_price` (NUMERIC, nullable) — float for price
- `unit` (TEXT, nullable) — "day" or "hour"
- `currency` (TEXT, nullable) — "USD", "EUR", "CHF", "INR", "PKR", "BRL"

## Frontend Changes (`src/pages/AffiliateContractHistory.tsx`)

1. **Interfaces**: Add `unit_price`, `unit`, `currency` to `ContractHistoryRow` and `FormData`
2. **Empty form**: Add defaults for the three new fields
3. **Save mutation payload**: Include the three new fields
4. **Table columns**: Add Unit Price, Unit, Currency columns (with sorting) after Days Worked
5. **Table cells**: Display values (format unit_price with currency symbol)
6. **Dialog form**: Add three new fields after Days Worked:
   - Unit Price: number input (step="0.01")
   - Unit: Select dropdown with "day"/"hour"
   - Currency: Select dropdown with the six currency options
7. **Edit handler**: Populate the three new fields from row data

