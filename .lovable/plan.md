

## Create/Link Job Wizard Dialog

### What
Add a dialog wizard to the "Create/Link Job" button on the onboarding page. It displays the affiliate's job title at the top, provides a searchable list of dummy job titles, and enables a "Link" button upon selection.

### Implementation

**1. Fetch `job_title` in `AffiliateOnboarding.tsx`**
- Add `job_title` to the `users` query select and the `AffiliateUser` interface.

**2. Create `src/components/affiliate/LinkJobDialog.tsx`**
- A `Dialog` component with props: `open`, `onOpenChange`, `affiliateJobTitle`.
- **Top section**: Display the affiliate's job title in a highlighted card/banner.
- **Search section**: A text input filtering a hardcoded list of ~10 dummy job titles (e.g., "Programme Analyst", "ICT Associate", "Administrative Assistant", "Finance Officer", "Security Coordinator", "Communications Specialist", "HR Associate", "Logistics Assistant", "Project Manager", "Data Analyst").
- **Results list**: Filtered titles displayed as selectable items (click to select, highlighted when active).
- **State**: `selectedTitle` (string | null), `searchQuery` (string).
- **Footer**: A "Link" button, disabled when no title is selected. On click: show `toast.success("Job linked with Samsaran")` and close the dialog.

**3. Wire up in `AffiliateOnboarding.tsx`**
- Add `showLinkJob` state.
- Replace the `console.log` onClick on "Create/Link Job" with `setShowLinkJob(true)`.
- Render `<LinkJobDialog>` passing `affiliate.job_title`.

### Technical details
- Uses existing `Dialog`, `Input`, `Button`, `toast` components.
- No database changes needed — purely UI with dummy data for now.
- Similar pattern to how `LaunchPRDialog` is wired up.

