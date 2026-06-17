## Problem

On `/requisitions/new`, the "AI Generate Position Description" button stays disabled with "Fill grade…" even after the user selects a grade.

## Root cause

In `src/pages/JobRequisitionForm.tsx` (lines 1645–1663), the gating logic watches a non-existent form field `level`:

```ts
const wLevel = (form.watch as any)('level');
...
if (!wLevel?.toString().trim()) missing.push('grade');
...
gradeLevel: ((form.getValues as any)('level') || '').toString(),
```

The actual form field is `grade` (defined at line 113, registered at line 1231). `level` is never set, so the check always fails.

## Fix

In `src/pages/JobRequisitionForm.tsx`, replace the two `'level'` references in the Position Description card with `'grade'`:

- `form.watch('level')` → `form.watch('grade')`
- `form.getValues('level')` → `form.getValues('grade')`

This is the only change. The button will then enable as soon as title, grade, and division are filled, and the correct grade gets passed to the AI generator as `gradeLevel`.
