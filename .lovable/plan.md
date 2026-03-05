

## Add Unit Price, Unit, and Currency to Affiliate Import

### Changes

**1. Edge Function (`supabase/functions/import-affiliate-personnel/index.ts`)**
- Add `unit_price`, `unit`, and `currency` to the `AffiliateRow` interface
- Add column detection for "unit price", "unit" (needs disambiguation from existing unit/section column — use pattern like "price unit" or "billing unit" for the unit field, or detect "unit price" first then use remaining "unit" columns), and "currency"
- Parse `unit_price` as a float, `unit` as string (day/hour), `currency` as string (USD/EUR/CHF etc.)
- In the contract history upsert block, include these three fields in `contractData` when present

The tricky part: there's already a `unitIndex` for the organizational unit column. The new "Unit" (day/hour) is a contract field. I'll use distinct patterns:
- "unit price" → unit_price column (already distinct)
- For the billing unit (day/hour): use pattern "billing unit" or detect columns named exactly "unit" that appear after "unit price" — actually simpler: use "price unit" or just add it. Looking at the CSV template section in the UI, the expected columns list doesn't mention these yet.

I'll use these column detection patterns:
- `unit_price`: patterns `['unit price', 'unitprice', 'daily rate', 'rate']`
- `contract_unit`: patterns `['billing unit', 'price unit']` — but the user likely just wants a column called "Unit" for day/hour. Since there's already a "Unit" column (org unit), I'll match the *contract* unit by checking for a column header that exactly equals "unit" appearing *after* "unit price", or use a distinct header name. Simplest: detect column headers in order — first "unit" match goes to org unit (existing), if there's a second one or if it matches "contract unit"/"billing unit", use that. 

Actually, the simplest approach: rename the expected CSV column to "Contract Unit" or "Billing Unit" to avoid ambiguity with the org "Unit" column. Or better: use exact matching — the existing unit column matches headers containing "unit" broadly, so I'll add specific patterns like `['contract unit', 'billing unit']` for the new field, and document the expected column name as "Contract Unit" in the UI.

Alternatively, looking at the existing column detection, `unitIndex` uses pattern `['unit']` which is very broad. The new fields could use `['unit price']` (already distinct since it has "price"), and for the day/hour unit: `['contract unit', 'billing unit']`. I'll go with "Contract Unit" as the CSV column name.

**2. UI (`src/pages/ImportAffiliatePersonnel.tsx`)**
- Add "Unit Price", "Contract Unit", and "Currency" to the expected CSV columns list

### Technical Details

Edge function changes (lines ~8-30, ~96-126, ~182-204, ~327-333):

1. Add to `AffiliateRow` interface: `unit_price: string; contract_unit: string; currency: string;`
2. Add column detection after line 125:
   ```typescript
   const unitPriceIndex = findColumn(['unit price', 'unitprice', 'daily rate']);
   const contractUnitIndex = findColumn(['contract unit', 'billing unit']);
   const currencyIndex = findColumn(['currency']);
   ```
3. Add to parsed row object (after line 203):
   ```typescript
   unit_price: unitPriceIndex !== -1 ? values[unitPriceIndex]?.trim() : '',
   contract_unit: contractUnitIndex !== -1 ? values[contractUnitIndex]?.trim() : '',
   currency: currencyIndex !== -1 ? values[currencyIndex]?.trim() : '',
   ```
4. In contract data block (~line 327-333), add:
   ```typescript
   if (affiliate.unit_price) {
     const parsed = parseFloat(affiliate.unit_price);
     if (!isNaN(parsed)) contractData.unit_price = parsed;
   }
   if (affiliate.contract_unit) contractData.unit = affiliate.contract_unit;
   if (affiliate.currency) contractData.currency = affiliate.currency;
   ```

5. Update UI expected columns list to include the three new fields.

