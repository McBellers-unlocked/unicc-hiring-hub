

# Fix: Allow Null Values in Operations Form Schemas

## Problem

When editing a Separation, Appointment, or STDA record, fields like "PD Number" and "Actions in HR Plan" show the validation error "Expected string, received null". This happens because Supabase returns `null` for empty database fields, but the Zod schemas only accept `string | undefined | ""` -- not `null`.

## Solution

Add `.nullable()` to all optional string fields in the three form schemas. The pattern changes from:

```
z.string().optional().or(z.literal(''))
```

to:

```
z.string().optional().nullable().or(z.literal(''))
```

This tells Zod that `null` is a valid value, which matches what the database returns.

## Files Modified

### 1. `src/components/operations/SeparationForm.tsx`

Update all optional string fields in `separationSchema` (lines 37-57) to include `.nullable()`. Also update `is_international` to `z.boolean().optional().default(false)` and `notice_days_required` to `z.number().min(0).max(365).optional().default(0)` so these don't fail when the database returns null for them.

### 2. `src/components/operations/AppointmentForm.tsx`

Same change to all optional string fields in `appointmentSchema` (lines 37-54), plus `is_international` and `notice_days_required`.

### 3. `src/components/operations/STDAForm.tsx`

Same change to all optional string fields in `stdaSchema` (lines 33-54).

## No other files affected
