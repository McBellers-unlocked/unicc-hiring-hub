
# Fix: STDA Update Error - "selectedUserId column not found"

## Problem
When updating an STDA record, the error occurs:
> "Could not find the 'selectedUserId' column of 'hr_stdas' in the schema cache"

## Root Cause
The update mutation in `STDAs.tsx` spreads the entire form data object directly into the Supabase update:

```typescript
.update({
  ...data,  // Includes selectedUserId which is NOT a database column
  start_date: data.start_date || null,
  end_date: data.end_date || null,
})
```

The `STDAFormData` type includes a `selectedUserId` property for local state tracking, but this property doesn't exist in the `hr_stdas` table - the database column is called `user_id`.

## Solution
Update the mutation to explicitly map form fields to database columns, excluding `selectedUserId` from the update payload and properly mapping it to `user_id` if needed.

## File to Modify
`src/pages/operations/STDAs.tsx`

## Changes

Update the `updateMutation` (around line 174-196) to explicitly specify only valid database columns:

```typescript
// Update mutation
const updateMutation = useMutation({
  mutationFn: async ({ id, data }: { id: string; data: STDAFormData }) => {
    // Destructure to exclude selectedUserId and map to correct column
    const { selectedUserId, ...formData } = data;
    
    const updateData = {
      last_name: formData.last_name,
      first_name: formData.first_name,
      email: formData.email || null,
      staff_number: formData.staff_number || null,
      operation_type: formData.operation_type,
      status: formData.status,
      start_date: formData.start_date || null,
      end_date: formData.end_date || null,
      job_title: formData.job_title || null,
      grade: formData.grade || null,
      contract_type: formData.contract_type || null,
      duty_station: formData.duty_station || null,
      section_unit: formData.section_unit || null,
      supervisor: formData.supervisor || null,
      old_pd: formData.old_pd || null,
      new_pd: formData.new_pd || null,
      vacancy_reference: formData.vacancy_reference || null,
      main_hr_focal_point: formData.main_hr_focal_point || null,
      comments: formData.comments || null,
      actions_in_hr_plan: formData.actions_in_hr_plan || null,
      original_job_title: formData.original_job_title || null,
      original_grade: formData.original_grade || null,
      original_unit: formData.original_unit || null,
      // Map selectedUserId to the correct database column
      user_id: selectedUserId || null,
    };

    const { error } = await supabase
      .from('hr_stdas')
      .update(updateData)
      .eq('id', id);
    
    if (error) throw error;
  },
  // ... rest of mutation config
});
```

This follows the same explicit mapping pattern already used in the `createMutation` and ensures only valid database columns are sent to Supabase.
