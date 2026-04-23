

## Add "Import Userbase" Page Under Analytics

### What
Create a new page where users can upload two separate data extracts (GSM and Samsaran) via drag-and-drop. Add a link to it in the Analytics dropdown in the top navigation bar.

### Files

**1. New page — `src/pages/ImportUserbase.tsx`**
- Wrapped in `<Layout>` with a "Back" button and `Card` header titled "Import Userbase".
- Two side-by-side drag-and-drop zones in a responsive grid (`grid-cols-1 md:grid-cols-2 gap-6`):
  - **Left — Import GSM Extract**
    - Subtitle: "Upload a CSV or Excel file containing GSM Assignment details data"
  - **Right — Import Samsaran Extract**
    - Subtitle: "Upload a Samsaran worker extract"
- Each zone is a self-contained `<DropZone>` component (defined inline in the file) that:
  - Accepts `.csv`, `.xls`, `.xlsx` only (validated by extension AND MIME type: `text/csv`, `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`)
  - Shows an error toast (destructive variant) when an invalid file type is selected or dropped: *"Invalid file type. Only CSV, XLS, or XLSX files are allowed."*
  - Displays the selected file name + size after a valid selection
  - Includes a per-zone "Upload" button (disabled until a valid file is chosen). Clicking it shows a placeholder success toast — no backend wiring yet (mirrors existing import-page conventions; backend can be added later).
- Reuse styling/UX patterns from `src/pages/ImportUsers.tsx` (drag states, hover styles, file preview block) for visual consistency.

**2. Routing — `src/App.tsx`**
- Import `ImportUserbase`.
- Add `<Route path="/admin/import-userbase" element={<ImportUserbase />} />` above the catch-all.

**3. Top-bar navigation — `src/components/Layout.tsx`**
- In the new "Analytics" dropdown, add a third item **above** "Hiring Analytics":
  - Label: **Import Userbase**
  - Path: `/admin/import-userbase`
  - Icon: `Upload` (already imported)
- Final Analytics dropdown order:
  1. Import Userbase
  2. Hiring Analytics
  3. Import Staff List

### Notes
- No backend/edge function is created in this step — the page is UI-only with client-side validation, ready for a future ingestion endpoint.
- Permission gating inherits from the Analytics dropdown (`hasAdminAccess`).

