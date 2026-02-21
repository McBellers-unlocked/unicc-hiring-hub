

## Move "Offer Acceptance" to Affiliate Recruitment

A simple reorganization: move "Offer Acceptance" from the Staff Recruitment section to the top of the Affiliate Recruitment list, and leave Staff Recruitment empty (showing the placeholder text).

### Changes (single file: `src/pages/EmailHub.tsx`)

1. **Update `affiliateEmails` array** (line 15-19): Add `'Offer Acceptance'` as the first item.
2. **Update `staffEmails` array** (line 21-23): Remove `'Offer Acceptance'`, making it an empty array.
3. **Update Staff Recruitment card** (lines 175-190): Replace the `.map()` rendering with the placeholder text `"No items configured yet."` (since the array is now empty), or keep the `.map()` which will simply render nothing -- replacing with placeholder is cleaner.

No logic changes needed -- the `handleDraftEmail` function already handles the `'Offer Acceptance'` label regardless of which section it appears in.

