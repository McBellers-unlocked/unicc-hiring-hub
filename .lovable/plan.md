

## Enhance Affiliate Contract History Page

### 1. Add Samsaran PR Search Filter

Add a search input at the top of the "Contract Records" card that filters both the contract records table and the contract documents table by Samsaran PR.

**File: `src/pages/AffiliateContractHistory.tsx`**

- Add a `prFilter` state variable (string, default empty).
- Add a search `Input` with a `Search` icon below the Card title area, before the table.
- Filter `rows` by checking if `samsaran_pr` includes the search term (case-insensitive).
- Pass the filtered PR list to `AffiliateContractDocuments` via a new `filterPR` prop so documents are also filtered.
- Update `availablePRs` to derive from full rows (unfiltered), but the documents component will use `filterPR` to filter its display.

**File: `src/components/affiliate/AffiliateContractDocuments.tsx`**

- Add an optional `filterPR` prop to the `Props` interface.
- When `filterPR` is non-empty, filter the `documents` array to only show documents whose `samsaran_pr` includes the search term (case-insensitive).

### 2. Add "Add Document" Button to Contract Documents

Replace the drag-and-drop zone as the only upload method with an explicit "Add Document" button in the card header (top-right), while keeping the drag-and-drop area as well.

**File: `src/components/affiliate/AffiliateContractDocuments.tsx`**

- Add a hidden file input ref (already exists as `fileInputRef`).
- Add an "Add Document" button next to the `CardTitle` that triggers `fileInputRef.current?.click()`.
- Uses the same `openTagDialog` flow already in place.

### 3. Expand Document Type Options

Update the Type select in the tagging dialog and the display logic in the table.

**File: `src/components/affiliate/AffiliateContractDocuments.tsx`**

Current types: `contract`, `selection_report`

New types to add:
- `rate_determination` -- "Rate Determination"
- `nda` -- "NDA"
- `pension_form` -- "Pension Form"
- `doi` -- "DOI"
- `id_document` -- "ID"
- `phf` -- "PHF"
- `other` -- "Other"

Changes:
- Add the 7 new `SelectItem` entries in the Type select (lines 300-304).
- Create a label map object and use it in the table cell (line 242) instead of the current inline ternary, so all types render readable labels.

### Technical Summary

| File | Changes |
|------|---------|
| `src/pages/AffiliateContractHistory.tsx` | Add `prFilter` state, search input, filter logic for rows, pass `filterPR` prop |
| `src/components/affiliate/AffiliateContractDocuments.tsx` | Add `filterPR` prop and filtering, "Add Document" button in header, 7 new doc types with label map |
