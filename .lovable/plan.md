

# Fix: Separation Edit Form Not Loading Existing Data

## Problem

When you click "Edit" on a separation record, the form opens but all fields are empty. This happens because React Hook Form's `defaultValues` are only applied once when the form first mounts. Since the Dialog component stays mounted in the DOM, subsequent edits never refresh the form values.

## Solution

Add a `useEffect` in `SeparationForm.tsx` that calls `form.reset(...)` whenever the `initialData` or `open` state changes. This ensures the form is always populated with the correct record data when the dialog opens.

## Technical Details

### Modified file: `src/components/operations/SeparationForm.tsx`

Add a `useEffect` (importing it alongside the existing `useState`) that triggers when `initialData` or `open` changes:

```typescript
useEffect(() => {
  if (open && initialData) {
    form.reset({
      last_name: '',
      first_name: '',
      email: '',
      operation_type: 'Separation',
      reason: '',
      status: 'Not started',
      tentative_date: '',
      effective_date: '',
      // ... all other default fields ...
      ...initialData,
    });
  } else if (open && !initialData) {
    form.reset({ /* clean defaults for "Add New" */ });
  }
}, [open, initialData]);
```

This is a single change in one file. No other files are affected.

