

# Add Document Upload Section to Affiliate Contract History

## What You'll See
Below the existing "Contract Records" table on `/admin/affiliate-history/:id`, a new **"Contract Documents"** section will appear with:

- A **drag-and-drop zone** where you can drop files (or click to browse)
- Each uploaded file gets tagged with metadata via a dialog:
  - **Related Samsaran PR** -- a dropdown populated from the existing contract records for that affiliate
  - **Name** -- auto-filled with the affiliate's name (editable)
  - **Type** -- dropdown: "Contract" or "Selection Report"
  - **Status** -- dropdown: "Draft", "Uploaded", or "Verified"
- A table listing all uploaded documents with their tags, download link, and delete action
- Ability to edit tags on existing documents

## Technical Details

### 1. Database Migration: `affiliate_contract_documents` table

| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | auto-generated |
| user_id | uuid | FK to users(id) -- the affiliate |
| samsaran_pr | text | selected from existing contract history PRs |
| affiliate_name | text | auto-filled from affiliate name |
| doc_type | text | "contract" or "selection_report" |
| status | text | "draft", "uploaded", or "verified" |
| file_name | text | original file name |
| file_path | text | path in storage bucket |
| file_size | bigint | file size in bytes |
| created_at | timestamptz | default now() |

RLS: authenticated users can SELECT, INSERT, UPDATE, DELETE.

### 2. Storage

Files will be uploaded to the existing **`document-repository`** bucket (already public) under the path `affiliate-documents/{user_id}/{filename}`.

### 3. UI Changes in `src/pages/AffiliateContractHistory.tsx`

- Add a second Card below the Contract Records card titled **"Contract Documents"**
- Drag-and-drop area using native HTML drag events (same pattern used elsewhere in the app)
- On file drop/select, a dialog opens with:
  - **Related Samsaran PR** -- `<Select>` dropdown populated from `rows` (the contract records already fetched), showing unique non-null `samsaran_pr` values
  - **Name** -- `<Input>` pre-filled with `affiliate?.name`
  - **Type** -- `<Select>` with options "Contract" and "Selection Report"
  - **Status** -- `<Select>` with options "Draft", "Uploaded", "Verified"
- On save: upload file to storage, insert record in DB
- Table shows all documents with columns: File Name, Samsaran PR, Type, Status, Actions (download, edit tags, delete)
- Edit button opens the same tag dialog pre-filled with current values (no file re-upload needed)

### Files Modified
- **Modified**: `src/pages/AffiliateContractHistory.tsx` -- add the documents section with drag-and-drop, tagging dialog, and documents table
- **New**: SQL migration for `affiliate_contract_documents` table

No new dependencies required -- uses native HTML5 drag-and-drop and existing UI components (Select, Dialog, Table).

