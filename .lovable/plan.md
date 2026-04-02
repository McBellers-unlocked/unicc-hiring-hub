

## Convert Division and Unit to Dropdowns in Affiliate Form

### What
Replace the free-text `Division` and `Unit` inputs in the Assignment tab of the Add Affiliate wizard with dropdown selects, using the same options as the Initial Position Request form.

### Implementation

**File: `src/components/affiliate/AffiliateForm.tsx`**

1. **Add imports**: Import `DIVISIONS`, `DIVISION_UNITS` from `@/lib/organizationConstants`, and `Select, SelectContent, SelectItem, SelectTrigger, SelectValue` from `@/components/ui/select`.

2. **Replace Division input** (lines 403-410): Replace the `<Input>` with a `<Select>` populated from `DIVISIONS` (keys as values, full names as labels). Use `setValue('division', ...)` on change and `watch('division')` for the current value. Also reset the `unit` field when division changes.

3. **Replace Unit input** (lines 412-419): Replace with a `<Select>` populated from `DIVISION_UNITS[selectedDivision]`. The options are filtered based on the selected division. If no division is selected, show a disabled placeholder.

4. **Wire up with react-hook-form**: Since `Select` from radix doesn't work with `register`, use `Controller` or manual `watch`/`setValue` pattern (consistent with how the form already works).

