

## Multi-Select Years and Owners

### What changes

**File**: `src/pages/StrategyTracker.tsx`

Replace the single-select `<Select>` dropdowns for **Year** and **Owner** with multi-select controls using Popover + Checkbox pattern (since Radix Select doesn't support multi-select natively).

### Type changes
- `StrategyItem.year`: change from `string` to `string[]` (default `["2026"]`)
- `StrategyItem.owner`: change from `string` to `string[]` (default `[]`)

### UI approach
For both Year and Owner columns, use a `<Popover>` containing a list of `<Checkbox>` items. The trigger button shows selected values as comma-separated text or badges (e.g., "2026, 2027" or "LAVAL, VALENTE").

### Components used
- `@radix-ui/react-popover` (already installed) — for the dropdown container
- `@radix-ui/react-checkbox` (already installed) — for each selectable option

### Migration note
- Existing localStorage data uses `string` for year/owner. Add a migration helper on load: if `year` is a string, wrap it in an array; if `owner` is a string, wrap non-empty values in an array.

