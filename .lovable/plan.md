

## Create/Link Worker Wizard Dialog

### What
Add a new "Create/Link Worker" wizard dialog, similar to the existing Job and Vendor wizards. It includes a search bar with dummy people names and pre-filled form fields sourced from the affiliate's data.

### Changes

**1. Update `AffiliateUser` interface and query in `src/pages/AffiliateOnboarding.tsx`**
- Add `duty_station`, `first_incumbency_date`, and `gender` to the interface and the Supabase select query.
- Add `workerLinked` and `showLinkWorker` state.
- Wire the "Create/Link Worker" button to open the dialog; turn green with "Worker Linked" text when done.
- Render `<LinkWorkerDialog>` with props: `affiliateName`, `contractStartDate` (from contract), `affiliateDutyStation`, `affiliateFirstIncumbency`, `affiliateGender`.

**2. Create `src/components/affiliate/LinkWorkerDialog.tsx`**
- Search bar: "Search workers in Samsaran" with dummy people names (e.g., "Maria Garcia", "James Smith", "Aisha Patel", "Chen Wei", "Fatima Al-Hassan", "Lucas Müller", "Yuki Tanaka", "Priya Sharma").
- Selectable list below the search bar (same pattern as LinkJobDialog).
- Form fields below, all editable and pre-filled:
  - **First Name** — split from `affiliateName` (first word)
  - **Last Name** — split from `affiliateName` (remaining words)
  - **Contract Employment Start Date** — from `contractStartDate`
  - **Office Location** — from `affiliateDutyStation`
  - **Original Hire Date** — from `affiliateFirstIncumbency`
  - **Gender** — from `affiliateGender`
- Footer: Cancel, "Create new record" (always enabled), "Link" (enabled when a worker is selected).
- On Link: `toast.success('Worker linked to Samsaran')`, call `onWorkerCreated`, close.
- On Create: `toast.success('Worker created in Samsaran')`, call `onWorkerCreated`, close.

### Technical details
- Date fields displayed as formatted strings (dd MMM yyyy) in text inputs.
- All fields are editable (not read-only) so the user can override pre-filled values.
- Follows the exact same component pattern as `LinkJobDialog` and `LinkVendorDialog`.

