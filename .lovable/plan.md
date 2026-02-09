

# Procurement TOR Request Feature

## Overview
Add a new "Procurement TOR" request type alongside the existing "Create a Position" initial request. When users navigate to `/requisitions/initial/new`, they will see a selector page offering two options. Choosing "Procurement TOR" routes to a dedicated form based on the UNICC RFP Terms of Reference template.

## User Flow

1. User clicks "New Initial Request" (from dashboard, requisitions page, etc.)
2. Lands on a **selector page** at `/requisitions/initial/new` with two cards:
   - **Create a Position** -- existing HR initial request flow
   - **Procurement TOR** -- new TOR request form
3. Selecting "Create a Position" navigates to `/requisitions/initial/new?type=position` (renders existing `InitialRequestForm`)
4. Selecting "Procurement TOR" navigates to `/requisitions/initial/new?type=tor` (renders new `ProcurementTORForm`)

## TOR Form Fields (derived from uploaded RFP document)

Based on the uploaded UNICC RFP TOR template, the form will have the following sections:

### Section 1: Basic Information
- **Title of Required Services** (text input, required)
- **Requesting Division** (dropdown -- same division list as InitialRequestForm)
- **Requesting Unit** (dropdown -- filtered by division, same as InitialRequestForm)
- **Requested by** (auto-filled from logged-in user)

### Section 2: Background & Scope
- **Background Information** (rich textarea -- context for the requirement)
- **Required Profile** (textarea -- description of the type of individual/firm needed)
- **Scope of Work / Duties** (textarea -- responsibilities and deliverables)

### Section 3: Required Skills
- **Required Technical Skills (MUST have)** (textarea -- mandatory skills/experience)
- **Desired Technical Skills (SHOULD have)** (textarea -- preferred skills/experience)
- **Required Soft Skills** (textarea -- behavioral competencies)
- **Desirable Certifications** (textarea -- relevant certifications)

### Section 4: Logistics
- **Duty Station** (checkbox group -- Valencia, Brindisi, New York, Geneva, Rome, Remote; same as InitialRequestForm)
- **On-call Requirements** (radio group):
  - One week per month
  - May be required on an exceptional basis
  - Not required
- **Estimated Duration** (text input -- e.g., "12 months")
- **Estimated Start Date** (date picker)

### Section 5: Funding
- **Funding Status** (radio group -- same options as InitialRequestForm)
- **Funding Comments** (textarea, optional)

### Section 6: Additional Notes
- **Additional Comments** (textarea, optional)

## Database Changes

### New table: `procurement_tors`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | Default `gen_random_uuid()` |
| `title` | text | Required -- title of required services |
| `division` | text | Division code (CS, DD, DS, etc.) |
| `unit` | text | Unit name |
| `requested_by` | uuid (FK users.id) | Auto-set from auth |
| `background` | text | Background information |
| `required_profile` | text | Required profile description |
| `scope_of_work` | text | Duties and responsibilities |
| `required_technical_skills` | text | MUST-have skills |
| `desired_technical_skills` | text | SHOULD-have skills |
| `required_soft_skills` | text | Soft skills |
| `desirable_certifications` | text | Certifications |
| `duty_station` | text | JSON array of locations |
| `on_call_requirement` | text | On-call option selected |
| `estimated_duration` | text | e.g., "12 months" |
| `estimated_start_date` | date | Target start |
| `funding_status` | text | Funding selection |
| `funding_comments` | text | Optional |
| `additional_comments` | text | Optional |
| `status` | text | Default 'draft' (draft, submitted) |
| `slug` | text (unique) | URL-friendly slug |
| `created_at` | timestamptz | Default `now()` |
| `updated_at` | timestamptz | Default `now()` |

**RLS Policies:**
- Users can read their own TORs (`requested_by = auth.uid()`)
- Admin/HR Assistant can read all TORs
- Users can insert TORs (with `requested_by` set to their own ID)
- Users can update their own draft TORs

## Code Changes

### 1. New selector page: `src/pages/InitialRequestSelector.tsx`
- Two cards side by side: "Create a Position" and "Procurement TOR"
- Each card has an icon, title, short description, and a button
- Clicking navigates to the appropriate form

### 2. New TOR form page: `src/pages/ProcurementTORForm.tsx`
- Full form matching the fields above
- Reuses shared constants (DIVISIONS, DIVISION_UNITS, LOCATIONS, FUNDING_OPTIONS) extracted or imported from InitialRequestForm
- Save as draft and Submit functionality
- View/edit existing TOR via `/requisitions/tor/:id`

### 3. Update routing in `src/App.tsx`
- Change `/requisitions/initial/new` to render `InitialRequestSelector`
- Add `/requisitions/initial/new/position` for `InitialRequestForm`
- Add `/requisitions/tor/new` for `ProcurementTORForm`
- Add `/requisitions/tor/:id` for viewing/editing existing TORs

### 4. Update `InitialRequestForm.tsx`
- No major changes needed; it will still work as-is, just accessed via a slightly different route

### 5. Database migration
- Create `procurement_tors` table with RLS policies
- Add `updated_at` trigger

## Technical Notes

- The shared organizational constants (DIVISIONS, DIVISION_UNITS, LOCATIONS, FUNDING_OPTIONS) will be extracted into a shared file `src/lib/organizationConstants.ts` to avoid duplication between the two forms
- No approval workflow for now (as confirmed) -- TORs can be saved as draft or submitted
- The TOR form will follow the same visual style and layout patterns as InitialRequestForm for consistency
