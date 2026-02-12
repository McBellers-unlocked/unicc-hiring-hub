

# Move Document Repository to HR Operations

## Overview
Move the Document Repository from its current location at `/settings` to the HR Operations section at `/operations/documents`, and update all navigation links accordingly.

## Changes

### 1. Move the page file
- Rename/move `src/pages/Settings.tsx` to `src/pages/operations/DocumentRepository.tsx`
- Update the page title from "System Settings" to "Document Repository"
- Remove the "System Settings" wrapper -- keep just the Document Repository card content

### 2. Update routing in `src/App.tsx`
- Remove the `/settings` route
- Add a new route: `/operations/documents` pointing to the moved component
- Update the import path

### 3. Update navigation links
- **`src/components/Layout.tsx`** (line ~213): Change the Manage dropdown link from `/settings` to `/operations/documents`, update label to "Document Repository"
- **`src/pages/Index.tsx`** (line ~252): Change the dashboard link from `/settings` to `/operations/documents`, update button text to "Document Repository"

### 4. Clean up
- Delete `src/pages/Settings.tsx` after the new file is created

## No database or storage changes needed
The `document_repository` table and `document-repository` storage bucket remain unchanged.

