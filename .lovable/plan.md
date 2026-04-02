
## Fix affiliate wizard so Contract "Next" never closes the dialog

### What I found
The current fix in `src/components/affiliate/AffiliateForm.tsx` only guards the form’s submit handler, but the whole 3-step dialog is still wrapped in one `<form>`. That means intermediate-step interactions can still end up triggering submit semantics unexpectedly, which explains why the modal can still close from the Contract step.

### Implementation
**File:** `src/components/affiliate/AffiliateForm.tsx`

1. **Decouple step navigation from form submission**
   - Stop relying on the form’s native submit behavior for step changes.
   - Keep submission available only on the final `assignment` step.

2. **Add an explicit `handleNext` function**
   - Use `trigger` from `react-hook-form`.
   - On `personal`:
     - validate only the personal-step required fields before advancing (`name`, `affiliate_type`, and `email` only in edit mode).
   - On `contract`:
     - move to `assignment` without submitting.
   - This makes the Next button deterministic.

3. **Change button behavior**
   - Keep intermediate **Next** buttons as `type="button"` and call `handleNext`.
   - Change final **Add Affiliate / Save Changes** action to explicitly call `handleSubmit(handleFormSubmit)` from its `onClick`, instead of depending on general form submission.

4. **Prevent Enter key from submitting on non-final steps**
   - Add a form-level `onKeyDown` handler:
     - if `Enter` is pressed while `activeTab !== 'assignment'`, `preventDefault()`
     - then run the same step-advance logic as the Next button.
   - This covers date inputs and any text/number field in the Contract step.

5. **Keep existing Back/Cancel behavior**
   - No changes needed there.
   - The dialog should only close after a successful final submission from the Assignment step.

### Result
After this change:
- Clicking **Next** on the Contract step will always open **Assignment**
- Pressing **Enter** on Personal/Contract will no longer submit the form
- The popup will only close after the final submit succeeds

### Technical details
```text
Current behavior:
single form wrapper
  -> intermediate steps can still trigger submit unexpectedly
  -> parent onSubmit runs
  -> success path closes modal

Planned behavior:
Next/Back = local wizard navigation only
Final button = only place that calls handleSubmit(handleFormSubmit)
Enter on non-final steps = prevented / mapped to Next
```
