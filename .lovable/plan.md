

## Fix: Offer Letter Placeholder Mapping Issues

### Problems Found

1. **Mr/Ms not working**: The database stores gender as "Woman"/"Man" (not "Female"/"Male"). The current code only checks for `=== 'Female'`, so Mr/Ms is never populated.

2. **Missing `{{HR}}` placeholder**: The second page of the template has "copy {{Mr_Ms}} {{HR}} as your HR focal point" -- the `{{HR}}` placeholder (full HR focal point name) is not mapped at all.

3. **Empty string skipped**: The `set()` helper skips falsy values (`if (!value) return`), so `currency` and `amount` are silently dropped even as empty strings. These should remain editable in the dialog.

### Changes

**File: `src/pages/operations/AppointmentLifecycle.tsx`**

- Fix gender check to handle "Woman"/"Man" in addition to "Female"/"Male" (and case-insensitive):
  - "Female", "Woman", "F" -> "Ms"
  - "Male", "Man", "M" -> "Mr"

- Add `{{HR}}` mapping: map keys `['hr', 'hr_focal_point']` to `appointment.main_hr_focal_point` (full name, not just initials).

- Fix `set()` to allow empty strings when intentional: change the guard to `if (value == null || value === undefined) return` so that explicit empty strings (`''`) are preserved for fields like Currency and Amount that the user fills manually.

### No other file changes needed

The edge function replacement logic is working correctly -- the issue is purely that field values are not being populated due to the gender mismatch and missing HR mapping.

