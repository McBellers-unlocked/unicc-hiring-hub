

# Convert Add Affiliate Tabs to Wizard Flow

## Overview
Replace the free-navigation tabs with a sequential wizard. The bottom-right button says "Next" on the Personal and Contract tabs, advancing to the next tab. Only on the Assignment tab does it say "Add Affiliate" and submit the form.

## Changes — `src/components/affiliate/AffiliateForm.tsx`

1. **Remove clickable tab navigation** — Keep the `TabsList` visible for visual context (showing which step you're on) but make the triggers non-interactive (disable clicking to jump between tabs). Alternatively, keep them clickable for going back but control forward movement via the button.

2. **Replace the submit button logic in `DialogFooter`**:
   - **Personal tab**: "Next" button (type `button`) that sets `activeTab` to `"contract"`
   - **Contract tab**: "Next" button (type `button`) that sets `activeTab` to `"assignment"`, plus a "Back" button
   - **Assignment tab**: "Add Affiliate" / "Save Changes" submit button (type `submit`), plus a "Back" button

3. **Keep Cancel button** on all steps.

No other files need changes.

