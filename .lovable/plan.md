

## Create/Link Vendor Wizard Dialog

### What
Add a vendor wizard dialog to the "Create/Link Vendor" button, similar to the Job wizard but with vendor-specific fields (Name, Group, GSM Supplier Number) and a searchable dummy vendor list.

### Implementation

**1. Create `src/components/affiliate/LinkVendorDialog.tsx`**
- Mirror the `LinkJobDialog` pattern.
- Dummy vendor list: ~8 company names (e.g., "Accenture", "Deloitte Consulting", "McKinsey & Company", "PwC Advisory", "KPMG International", "Capgemini", "IBM Consulting", "Booz Allen Hamilton").
- Search bar labeled "Search vendors in Samsaran" filtering the list.
- Below the search results, three fields:
  - **Name**: free text `Input`
  - **Group**: read-only `Input` pre-filled with "Individual service contractor"
  - **GSM Supplier Number**: free text `Input`
- Footer: Cancel, "Create new record" (always enabled), "Link" (enabled when a vendor is selected from the list).
- On Link: `toast.success('Vendor linked to Samsaran')`, call `onVendorCreated`, close.
- On Create: `toast.success('Vendor created in Samsaran')`, call `onVendorCreated`, close.

**2. Update `src/pages/AffiliateOnboarding.tsx`**
- Add `vendorLinked` state and `showLinkVendor` state.
- Wire "Create/Link Vendor" button to open the dialog.
- Turn button green with text "Vendor Linked" when `vendorLinked` is true (same pattern as Job/PR buttons).
- Render `<LinkVendorDialog>` with appropriate props.

