
# Fix: Edit Appointment Form Not Pre-Populating

## The Problem
When clicking "Edit Appointment" for Matthew VALENTE (or any appointment), the form opens with empty fields instead of showing the existing data.

## Root Cause
In `AppointmentForm.tsx`, React Hook Form's `defaultValues` are only applied on the **first render** of the form component. When the user:
1. Opens the dialog for one record
2. Closes it
3. Opens it again for a different record

...the form doesn't re-initialize because React Hook Form caches the default values.

## Technical Details

Current code (lines 78-106):
```typescript
const form = useForm<AppointmentFormData>({
  resolver: zodResolver(appointmentSchema),
  defaultValues: {
    last_name: '',
    first_name: '',
    // ... other defaults
    ...initialData,  // This only works on FIRST mount
  },
});
```

The `...initialData` spread only applies when the form is first created. When `initialData` changes (different appointment being edited), the form keeps the old/default values.

## Solution
Add a `useEffect` to reset the form whenever `initialData` or `open` changes:

```typescript
// Reset form when initialData changes (for edit mode)
useEffect(() => {
  if (open && initialData) {
    form.reset({
      last_name: initialData.last_name || '',
      first_name: initialData.first_name || '',
      email: initialData.email || '',
      operation_type: initialData.operation_type || 'Appointment',
      status: initialData.status || 'Not started',
      tentative_date: initialData.tentative_date || '',
      effective_date: initialData.effective_date || '',
      job_title: initialData.job_title || '',
      grade: initialData.grade || '',
      contract_type: initialData.contract_type || '',
      duty_station: initialData.duty_station || '',
      section_unit: initialData.section_unit || '',
      supervisor: initialData.supervisor || '',
      old_po: initialData.old_po || '',
      new_po: initialData.new_po || '',
      vacancy_reference: initialData.vacancy_reference || '',
      main_hr_focal_point: initialData.main_hr_focal_point || '',
      recruitment_type: initialData.recruitment_type || 'Newcomer',
      is_international: initialData.is_international ?? false,
      notice_days_required: initialData.notice_days_required ?? 30,
      comments: initialData.comments || '',
      onboarding_comments: initialData.onboarding_comments || '',
      actions_in_hr_plan: initialData.actions_in_hr_plan || '',
    });
  } else if (open && !initialData) {
    // Reset to empty for new appointments
    form.reset({
      last_name: '',
      first_name: '',
      email: '',
      operation_type: 'Appointment',
      status: 'Not started',
      tentative_date: '',
      effective_date: '',
      job_title: '',
      grade: '',
      contract_type: '',
      duty_station: '',
      section_unit: '',
      supervisor: '',
      old_po: '',
      new_po: '',
      vacancy_reference: '',
      main_hr_focal_point: '',
      recruitment_type: 'Newcomer',
      is_international: false,
      notice_days_required: 30,
      comments: '',
      onboarding_comments: '',
      actions_in_hr_plan: '',
    });
  }
}, [open, initialData, form]);
```

## File to Modify

| File | Change |
|------|--------|
| `src/components/operations/AppointmentForm.tsx` | Add `useEffect` to reset form on `open`/`initialData` change |

## Expected Result
After this fix:
- Clicking "Edit" on Matthew VALENTE will show all his data pre-populated
- Clicking "Edit" on any other appointment will show that appointment's data
- Clicking "Add Appointment" will show empty fields
- Form properly clears/resets between different edit operations
