

# Add "Go to Lifecycle" Button on Contract Records

## What Changes
Each row in the Contract Records table on `/admin/affiliate-history/:id` will get a new **"Go to Lifecycle"** button on the right side (in the Actions column), next to the existing Edit and Delete buttons.

Clicking it navigates to `/admin/affiliate-personnel/{id}/lifecycle` for that affiliate.

## Technical Details

### File Modified: `src/pages/AffiliateContractHistory.tsx`

1. **Import** the `ExternalLink` (or similar) icon from `lucide-react` for the button
2. **Add a button** in the Actions cell of each table row, using a `<Link>` to `/admin/affiliate-personnel/${id}/lifecycle`
3. The button will use `variant="ghost"` and `size="icon"` styling, consistent with the existing Edit/Delete buttons, with a tooltip or label "Go to Lifecycle"
4. Widen the Actions column slightly (`w-32` instead of `w-24`) to accommodate the third button

