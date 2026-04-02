

## Add "Create new record" Button to Link Job Dialog

### What
Add a "Create new record" button in the dialog footer (always enabled), which shows "Job created in Samsaran", closes the dialog, and turns the "Create/Link Job" button green on the onboarding page.

### Implementation

**1. `src/components/affiliate/LinkJobDialog.tsx`**
- Add `onJobCreated` callback prop.
- Add a `handleCreate` function: shows `toast.success('Job created in Samsaran')`, resets state, calls `onJobCreated()`, closes dialog.
- Add "Create new record" button in the footer between Cancel and Link.

**2. `src/pages/AffiliateOnboarding.tsx`**
- Add `jobLinked` state (boolean).
- Pass `onJobCreated={() => setJobLinked(true)}` to `LinkJobDialog`. Also set `jobLinked(true)` on the existing link action.
- Style the "Create/Link Job" button green when `jobLinked` is true (same pattern as the "PR Launched" button).

