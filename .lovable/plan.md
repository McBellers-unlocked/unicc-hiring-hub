

# Fix: Preserve User Link When Editing Separations/Appointments

## Problem

When you edit an existing separation (or appointment) that was linked to a user, the link is silently wiped out. Two things go wrong:

1. The form's `selectedUserId` local state starts as `null` and is never initialized from the existing record's `user_id`, so the linked staff name doesn't display either.
2. The update mutation always sets `user_id: selectedUserId || null`. Since `selectedUserId` is never populated from existing data, every update overwrites `user_id` with `null`.

## Solution

### 1. `src/components/operations/SeparationForm.tsx`

- In the `useEffect` that resets form data when `open`/`initialData` changes, also set `selectedUserId` and `linkedStaffName` from `initialData`:
  - If `initialData.user_id` exists, set `selectedUserId` to that value
  - If `initialData.first_name` and `initialData.last_name` exist, set `linkedStaffName` so the "Linked to: ..." label appears
- Clear both when opening a blank form (no `initialData`)

### 2. `src/pages/operations/Separations.tsx`

- In the `updateMutation`, only include `user_id` in the update payload if `selectedUserId` was explicitly provided (i.e., is not `undefined`). Change from:
  ```
  user_id: selectedUserId || null
  ```
  to only setting `user_id` when `selectedUserId !== undefined` -- this way, if the user didn't touch the staff picker, the existing `user_id` is left unchanged.

### 3. `src/components/operations/AppointmentForm.tsx`

- Same `useEffect` fix: initialize `selectedUserId` and `linkedStaffName` from `initialData` when the form opens for editing.

### 4. `src/pages/operations/Appointments.tsx`

- Same update mutation fix: only include `user_id` in the payload when `selectedUserId` was explicitly provided.

## No other files affected

