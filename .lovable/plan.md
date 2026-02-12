

# Add "Manage Lifecycle" to Appointments

## Overview
Add a "Manage Lifecycle" option to the three-dot Actions menu on each appointment row. It navigates to a new page `/operations/appointments/:id/lifecycle` that shows a timeline with administrative onboarding stages and a checklist per stage -- following the same pattern as the affiliate lifecycle feature.

## What You'll See
- A new **"Manage Lifecycle"** menu item (with a ClipboardCheck icon) in the three-dot dropdown on each appointment row
- Clicking it navigates to `/operations/appointments/:id/lifecycle`
- The lifecycle page shows:
  - A header with the appointee's name and key details (grade, duty station, tentative date)
  - A horizontal timeline with 6 administrative stages
  - A checklist for the active stage with items to tick off
  - A "days until start" indicator

## Lifecycle Stages and Checklist Items

| Stage | Day Marker | Checklist Items |
|---|---|---|
| Offer Letter | -45 | Draft offer letter, Obtain HR signature, Send to candidate, Receive signed acceptance |
| Medical Clearance | -35 | Request medical exam, Receive medical results, Review and approve clearance |
| Visa & Travel | -25 | Confirm visa requirements, Submit visa application, Arrange travel, Receive visa confirmation |
| Badge & Access | -14 | Request building access badge, Request IT account creation, Request VPN/remote access, Assign workstation |
| Contract Signed | -7 | Finalize contract terms, Issue contract for signature, Receive signed contract, File signed contract |
| Onboarding Complete | 0 | Confirm first-day logistics, Welcome package sent, Orientation scheduled, Manager notified |

## Technical Details

### 1. Database: `appointment_lifecycle_checklist` table (migration)
- `id` (uuid, PK)
- `appointment_id` (uuid, FK to hr_appointments.id, ON DELETE CASCADE)
- `stage_key` (text) -- e.g. "offer_letter"
- `item_key` (text) -- e.g. "draft_offer_letter"
- `completed` (boolean, default false)
- `completed_at` (timestamptz, nullable)
- `completed_by` (uuid, nullable)
- `created_at` (timestamptz, default now())
- Unique constraint on (appointment_id, stage_key, item_key)
- RLS: authenticated users can SELECT, INSERT, UPDATE, DELETE

### 2. New config file: `src/lib/appointmentLifecycleConfig.ts`
Follows the same pattern as `affiliateLifecycleConfig.ts`:
- `APPOINTMENT_LIFECYCLE_STAGES` array with key, label, dayMarker, description
- `DEFAULT_APPOINTMENT_CHECKLIST_ITEMS` record mapping stage keys to item arrays
- Helper functions: `getStageStatus`, `getStageColorClass`

### 3. New page: `src/pages/operations/AppointmentLifecycle.tsx`
- Uses `useParams` to get the appointment ID
- Fetches appointment details from `hr_appointments`
- Fetches/initializes checklist from `appointment_lifecycle_checklist`
- Reuses `AffiliateLifecycleTimeline` component pattern (or creates a shared one)
- Displays checklist items with toggle functionality per stage
- Calculates days until tentative_date for the timeline

### 4. Route: `src/App.tsx`
Add route: `/operations/appointments/:id/lifecycle`

### 5. Menu update: `src/pages/operations/Appointments.tsx`
Add a `DropdownMenuItem` after the "Edit" option:
```
<DropdownMenuItem onClick={() => navigate(`/operations/appointments/${apt.id}/lifecycle`)}>
  <ClipboardCheck className="h-4 w-4 mr-2" />
  Manage Lifecycle
</DropdownMenuItem>
```

### Files Created/Modified
- **New**: `src/lib/appointmentLifecycleConfig.ts`
- **New**: `src/pages/operations/AppointmentLifecycle.tsx`
- **Modified**: `src/pages/operations/Appointments.tsx` (add menu item + navigate import)
- **Modified**: `src/App.tsx` (add route)
- **New**: SQL migration for `appointment_lifecycle_checklist` table
