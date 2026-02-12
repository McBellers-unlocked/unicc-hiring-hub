

# Generate Offer Letter from Template on Appointment Lifecycle

## Overview
On the Appointment Lifecycle page, the "Draft offer letter" checklist item will get a **"Generate Offer Letter"** button. Clicking it opens a dialog that:
1. Fetches the "Letter of Fixed-Term Appointment - G Staff" template from the Document Repository
2. Parses its `{{placeholder}}` fields
3. Auto-fills them from the appointment's data (name, grade, duty station, job title, etc.)
4. Lets the user review/edit each field
5. Generates and downloads the filled `.docx` document

## What You'll See
- A **FileEdit** icon button labeled "Generate Offer Letter" next to the "Draft offer letter" checklist item
- A dialog with:
  - Template name shown in the header
  - All detected `{{placeholder}}` fields listed as input fields
  - Fields automatically pre-filled from the appointment record (first name, last name, grade, duty station, job title, section/unit, supervisor, email, contract type, effective date, etc.)
  - A **Download Filled Document** button that generates the `.docx` and triggers a browser download

## Technical Details

### 1. New Edge Function: `generate-repo-document`
A variant of the existing `generate-filled-document` edge function, but reads from the **`document-repository`** storage bucket using a `file_path` directly (instead of looking up a `document_templates` record by ID).

**Input:** `{ file_path: string, field_values: Record<string, string> }`
**Process:** Download `.docx` from `document-repository` bucket, replace `{{placeholders}}` with values, return filled `.docx` binary.
**Output:** Binary `.docx` file download.

### 2. Field Parsing (inline in the dialog)
When the dialog opens, it calls the `document-repository` bucket to download the file, then uses a new edge function endpoint to extract `{{field}}` placeholders. To keep it simple, a single new edge function `parse-repo-template-fields` will:
- Accept `{ file_path: string }` (path in `document-repository` bucket)
- Parse the `.docx` XML for `{{field_name}}` patterns
- Return `{ fields: string[] }`

### 3. Appointment Data to Field Mapping
The following appointment fields will be mapped to template placeholders (case-insensitive, underscore-normalized matching):

| Appointment Field | Matched Placeholders |
|---|---|
| `first_name` | first_name, firstname |
| `last_name` | last_name, lastname, surname |
| `first_name + last_name` | name, full_name, fullname, staff_name |
| `email` | email |
| `grade` | grade, level |
| `job_title` | job_title, jobtitle, title, position |
| `duty_station` | duty_station, dutystation, location |
| `section_unit` | section, unit, section_unit, sectionunit |
| `supervisor` | supervisor, line_manager, linemanager, manager |
| `contract_type` | contract_type, contracttype |
| `effective_date` | effective_date, effectivedate, start_date, startdate |
| `vacancy_reference` | vacancy_reference, vacancy_ref |

### 4. UI Changes in `AppointmentLifecycle.tsx`
- Add state for the offer letter dialog (open/closed, parsed fields, field values, loading/generating states)
- On the `draft_offer_letter` checklist item row, render a "Generate Offer Letter" button
- Dialog component with:
  - Loading spinner while fields are being parsed
  - Auto-filled input fields
  - Generate + download action
- Fetch the template file path from `document_repository` table where `name ILIKE '%Letter of Fixed-Term Appointment - G Staff%'`

### Files Created/Modified
- **New**: `supabase/functions/parse-repo-template-fields/index.ts` -- parse fields from `document-repository` bucket
- **New**: `supabase/functions/generate-repo-document/index.ts` -- fill and generate doc from `document-repository` bucket
- **Modified**: `src/pages/operations/AppointmentLifecycle.tsx` -- add the Generate Offer Letter button and dialog

