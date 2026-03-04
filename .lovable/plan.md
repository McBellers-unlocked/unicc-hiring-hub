

# Add Step 2 to Launch PR Wizard

## Overview
Add a second page to the LaunchPR wizard dialog with two pre-filled text fields: "Item Description" and "Direct Appointment Justification". The "Next" button on step 1 advances to step 2.

## Changes

### `src/components/affiliate/LaunchPRDialog.tsx`
1. **Accept affiliate info** — Add `affiliateName` and `affiliateUnit` to props (passed from parent)
2. **Add step state** — `step` state (1 or 2)
3. **Add form state for step 2** — `itemDescription` and `directAppointmentJustification` strings
4. **Pre-fill on entering step 2** — When clicking "Next" on step 1, set `step` to 2 and pre-fill:
   - Item Description: `"Individual consultancy contract for [name], in [unit], from [formatted start date] to [formatted end date]."`
   - Direct Appointment Justification: `"N/A"`
5. **Render step 2** — Show two `Textarea` fields (editable) for the two values
6. **Footer** — Step 2 shows "Back" (returns to step 1) and a placeholder "Submit"/"Next" button
7. **Reset step to 1** when dialog closes

### `src/pages/AffiliateLifecycle.tsx`
- Pass `affiliateName={affiliate.name}` and `affiliateUnit={affiliate.unit}` to `LaunchPRDialog`

