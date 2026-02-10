

# Fix: Strip `selectedUserId` from Database Update Payloads

## Problem

When updating a Separation or Appointment, the form data object includes `selectedUserId` -- a frontend-only property used for linking staff. This property gets spread into the Supabase `.update()` call via `...data`, causing the error: *"Could not find the 'selectedUserId' column of 'hr_separations' in the schema cache"*.

The STDAs page already handles this correctly by destructuring `selectedUserId` out before building the update payload.

## Solution

Apply the same pattern used in STDAs: destructure `selectedUserId` out of `data` before spreading into the database update.

## Files Modified

### 1. `src/pages/operations/Separations.tsx` (line ~246)

In the `updateMutation`, destructure `selectedUserId` out of `data` and map it to the `user_id` database column:

```typescript
const { selectedUserId, ...formData } = data;
```

Then use `formData` (not `data`) in the `.update()` call, and add `user_id: selectedUserId || null` explicitly.

### 2. `src/pages/operations/Appointments.tsx` (line ~176)

Same fix: destructure `selectedUserId` out of `data`, use `formData` in `.update()`, and map `user_id: selectedUserId || null`.

### No other files affected

The STDAs page already applies this pattern correctly.
