

# Create Settings Page with Document Repository

## Overview
Create a new `/settings` page (which is already linked from the Manage dropdown and Dashboard but doesn't exist yet) with a "Document Repository" subsection where admins can upload, manage, and organize shared documents.

## What gets built

### Settings Page (`/settings`)
A new admin-only page with a clean layout containing:
- Page header: "System Settings"
- A "Document Repository" section where admins can:
  - Upload documents (PDF, Word, Excel, PowerPoint, images) to a shared repository
  - Categorize documents (e.g., Policies, Templates, Guidelines, Forms, SOPs, Other)
  - View uploaded documents in a table with name, category, uploaded by, date, and size
  - Download or delete documents
  - Search/filter documents by name or category

The document files will be stored in Supabase Storage (using the existing `application-files` bucket or a new `document-repository` bucket), and metadata will be stored in a new `document_repository` database table.

## Technical details

### New files
- `src/pages/Settings.tsx` -- Settings page with the Document Repository subsection

### Database migration
- Create `document_repository` table with columns: `id`, `name`, `category`, `file_path`, `file_url`, `file_size`, `file_type`, `uploaded_by`, `created_at`
- Create a `document-repository` storage bucket (public)
- Add RLS policies: authenticated users can read, admins can insert/update/delete

### Route registration
- Add `/settings` route in `src/App.tsx` pointing to the new Settings component

### Pattern followed
- Reuses the same upload/download/delete patterns from `PortfolioSection.tsx`
- Uses existing UI components: Layout, Card, Table, Badge, Select, Input, Button
- Admin-only access check via `useAuth` hook

