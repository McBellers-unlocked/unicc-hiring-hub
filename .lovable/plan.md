

# Document Templates with Fillable Fields

## Overview
Enhance the Document Repository to support **document templates** -- uploaded Word/PDF files that contain placeholder fields (like `{{recipient_name}}`, `{{date}}`). Users can select a template, fill in the fields via a form, and download a completed document.

## How It Works

1. **Admin uploads a template** (Word .docx file) with placeholders like `{{recipient_name}}`, `{{position_title}}`, `{{start_date}}`
2. The system **scans the file** to detect all `{{placeholder}}` fields and stores them as metadata
3. Any user can **select a template**, see the detected fields as a form, fill them in, and **download the completed document** with all placeholders replaced

Note: PDF templates are supported for viewing/downloading but placeholder replacement works best with `.docx` files since PDFs are not easily editable programmatically.

## Database Changes

### New table: `document_templates`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Template ID |
| name | text | Template display name |
| category | text | Category (Letters, Contracts, General, etc.) |
| description | text | Optional description |
| file_path | text | Path in Supabase storage |
| file_type | text | MIME type |
| fields | jsonb | Array of detected placeholder field names |
| uploaded_by | uuid | User who uploaded |
| created_at | timestamptz | Upload timestamp |

RLS: All authenticated users can read; only Admins can insert/delete.

## Implementation Steps

### 1. Database migration
- Create `document_templates` table with RLS policies

### 2. Edge function: `parse-template-fields`
- Accepts a `.docx` file path from storage
- Reads the file content, scans for `{{...}}` placeholders using regex
- Returns the list of detected field names
- Stores them in the `fields` column

### 3. Edge function: `generate-filled-document`
- Accepts a template ID and a key-value map of field values
- Reads the `.docx` template from storage
- Replaces all `{{placeholder}}` occurrences with provided values
- Returns the filled document as a downloadable `.docx` file

### 4. Update Document Repository page
- Add a **second tab** or section: "Document Templates" alongside the existing "Document Repository"
- **Template upload** (Admin): Upload a `.docx` file, system auto-detects fields, admin reviews and saves
- **Template list**: Shows all available templates with name, category, field count
- **"Use Template" button**: Opens a dialog/form with all detected fields as text inputs
- **"Download" button**: Calls the edge function and downloads the filled document

### 5. UI Flow
- Page has two tabs: **Documents** (existing file repository) and **Templates** (new)
- Templates tab shows a card grid or table of available templates
- Clicking "Use Template" opens a dialog with:
  - Template name and description at the top
  - Auto-generated form fields for each placeholder (labeled with human-readable names derived from the placeholder, e.g. `recipient_name` becomes "Recipient Name")
  - A "Download Filled Document" button that generates and downloads the `.docx`

## Technical Details

### Placeholder format
Templates use double-curly-brace syntax: `{{field_name}}`. Field names use snake_case and are converted to Title Case for display (e.g., `{{start_date}}` displays as "Start Date").

### Edge function: `parse-template-fields`
- Uses a lightweight DOCX parser (docx files are ZIP archives containing XML)
- Extracts all text content from `word/document.xml`
- Regex scans for `\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}` patterns
- Returns deduplicated list of field names

### Edge function: `generate-filled-document`
- Reads the template `.docx` from storage
- Performs string replacement on the XML content inside the ZIP
- Returns the modified `.docx` as a binary response for download

### Categories updated
Template categories: "Letters", "Contracts", "Certificates", "Memos", "General"

