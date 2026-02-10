
# Update Linked Appointment Date When Separation (CB) Is Edited

## Overview

Currently, the CB return date logic only runs when **creating** a new Separation (CB). If the separation date or duty station is later edited, the linked Appointment (CB) keeps the old return date. This change will recalculate and update the linked appointment's tentative date whenever a CB separation is updated.

## Technical Changes

### Modified file: `src/pages/operations/Separations.tsx`

In the `updateMutation` (around line 245), after the existing separation update succeeds, add logic to:

1. Check if the separation being edited is a CB type (`operation_type` includes "(CB)")
2. Check if it has a `linked_appointment_id`
3. If both are true and `tentative_date` is provided, recalculate the return date using `calculateCBReturnDate(data.tentative_date, data.duty_station)`
4. Update the linked appointment's `tentative_date` with the new calculated date

The updated mutation will need access to the current separation record (from `editingSeparation`) to get the `linked_appointment_id` and `operation_type`. These fields should already be available since `editingSeparation` holds the full row.

### No other files affected

The `calculateCBReturnDate` utility and holiday data in `src/lib/officialHolidays.ts` are already in place and will be reused.
