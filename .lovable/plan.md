

## Auto-Fill Offer Letter Placeholders from Appointment Data

### Problem
When generating an offer letter, the PDF template contains placeholders like `{{Mr_Ms}}`, `{{HRINITIAL}}`, `{{Staff_Number}}`, `{{DS}}`, `{{country}}`, `{{Grade}}`, `{{Level}}`, `{{Currency}}`, `{{Amount}}`, `{{Reference}}`, etc. Currently, the `buildFieldMapping` function only maps a few basic fields and misses most of these, leaving them as raw placeholders in the generated document.

### Solution
Expand `buildFieldMapping` in `AppointmentLifecycle.tsx` to:

1. **Derive `Mr_Ms`** from the linked user's `gender` field in the `users` table (e.g., "Female" -> "Ms", "Male" -> "Mr")
2. **Derive `HRINITIAL`** from `main_hr_focal_point` on the appointment (e.g., "Lucia RODENAS" -> "LR")
3. **Derive `Staff_Number`** from the linked user's `staff_number` field
4. **Map `DS`** to `duty_station`
5. **Map `country`** from duty station using a simple lookup (Valencia -> Spain, Brindisi -> Italy, etc.)
6. **Map `Grade` and `Level`** by splitting the grade field (e.g., "G5" -> Grade="G", Level/Step from user record or left for manual entry)
7. **Map `Position`** to `job_title`
8. **Map `Reference`** to `vacancy_reference`
9. **Add `Currency` and `Amount`** as empty fields for manual entry (salary data not stored in the appointment record)
10. **Add today's date** formatted as "dd MMMM yyyy"

### Technical Details

**File: `src/pages/operations/AppointmentLifecycle.tsx`**

- Fetch the linked user record (`users` table) using `appointment.user_id` when opening the offer letter dialog, to get `gender`, `staff_number`, and `current_grade`
- Expand `buildFieldMapping` to accept both appointment and user data:

```text
Placeholder       -> Source
-------------------------------------------------
Mr_Ms             -> users.gender ("Female"->"Ms", "Male"->"Mr")
last_name         -> appointment.last_name
first_name        -> appointment.first_name
HRINITIAL         -> initials from appointment.main_hr_focal_point
Staff_Number      -> users.staff_number
Position          -> appointment.job_title
DS                -> appointment.duty_station
country           -> lookup from duty_station (Valencia->Spain, etc.)
Grade             -> first part of grade (e.g. "G" from "G5")
Level             -> numeric part of grade (e.g. "5" from "G5")
Reference         -> appointment.vacancy_reference
Currency          -> empty (manual entry)
Amount            -> empty (manual entry)
```

- Add a `DUTY_STATION_COUNTRY` map:
```text
Valencia -> Spain
Brindisi -> Italy
New York -> United States of America
Geneva -> Switzerland
Lyon -> France
Rome -> Italy
```

- Add an `extractInitials` helper: splits name by spaces, takes first character of each word, uppercases (e.g., "Lucia RODENAS" -> "LR")

- In `handleOpenOfferLetter`, fetch the user record before calling `buildFieldMapping`:
```text
if (appointment.user_id) {
  fetch from users table where id = appointment.user_id
  pass user data to buildFieldMapping
}
```

**No edge function changes needed** -- the replacement logic already works; the issue is purely that field values were not being populated.

