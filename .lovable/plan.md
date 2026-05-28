# AI-Assisted Position Description Population

Add the ability to auto-populate **Purpose of the Position** and **Main Duties and Responsibilities** on the Job Requisition form, driven by the position title (and other already-entered context). Users can optionally attach one or more existing JD files (PDF/DOCX/TXT) as additional grounding context for the AI.

## UX

In `src/pages/JobRequisitionForm.tsx`, inside the "Position Description" card header, add a small toolbar with two actions:

1. **Generate with AI** — primary button (sparkles icon). Enabled once `position_title` and `nature_of_position` are filled.
2. **Attach existing JD(s)** — outline button (paperclip icon). Opens a file picker (multi-select, accepts `.pdf`, `.docx`, `.doc`, `.txt`, up to ~5 MB each). Attached files are listed as removable chips below the toolbar; they are kept in component state only (not persisted) and re-used on subsequent generations.

Clicking **Generate with AI** opens a confirmation dialog when either target field already has content, warning that it will overwrite (with options: Overwrite both / Fill only empty / Cancel).

While generating, both target fields show a skeleton/loading overlay and the button shows a spinner. On success, fields are populated and toast confirms; on error, toast surfaces the gateway error (402/429/etc).

## Generation Flow

Client gathers:
- `position_title`, `nature_of_position`, `grade_level`, `duty_station`, `unit_section_division`, `objectives_of_programme` (if filled)
- Attached JD files: parsed client-side to plain text where possible (use existing PDF parsing pattern if any; otherwise send base64 to the edge function for parsing).

To keep this simple and consistent with the rest of the codebase, send everything to a new edge function which does parsing + AI call server-side.

## Backend — new Edge Function

`supabase/functions/generate-position-description/index.ts`

- Verifies JWT (user must be authenticated).
- Accepts JSON body:
  ```
  {
    positionTitle, natureOfPosition, gradeLevel?, dutyStation?,
    unitSectionDivision?, objectivesOfProgramme?,
    attachments?: [{ filename, mimeType, base64 }]
  }
  ```
- Validates with Zod.
- For each attachment, extracts text:
  - `.txt` → decode base64
  - `.pdf` → `npm:pdf-parse` (or `unpdf`)
  - `.docx` → `npm:mammoth`
  - Truncate each to ~15k chars; cap total attached context at ~40k chars.
- Calls Lovable AI Gateway (`google/gemini-3-flash-preview`) via the standard provider helper used elsewhere, with `Output.object` structured output:
  ```
  { purpose_of_position: string, main_duties_responsibilities: string }
  ```
- System prompt instructs the model to:
  - Write in UNICC/UN tone, third person, present tense.
  - Purpose: 2–4 sentences explaining context and main purpose.
  - Main Duties: Markdown bulleted list, each bullet structured WHAT / WHY / HOW (matching the existing helper text at line 1743).
  - Use attached JDs as grounding when provided; otherwise infer from title + nature + grade.
  - Do not invent project/client names; leave `[SUPERVISOR TITLE]`-style placeholders only where the existing template uses them.
- Returns `{ purpose_of_position, main_duties_responsibilities }`.

## Frontend wiring

- New file `src/components/requisition/AIGeneratePositionDescription.tsx` exporting the toolbar + dialog.
- Wired into Position Description card in `JobRequisitionForm.tsx`. On success calls:
  ```
  form.setValue('purpose_of_position', result.purpose_of_position, { shouldDirty: true });
  form.setValue('main_duties_responsibilities', fixMarkdownFormatting(result.main_duties_responsibilities), { shouldDirty: true });
  ```
- Reads files via `FileReader.readAsDataURL`, strips data URL prefix to get base64, invokes the function with `supabase.functions.invoke('generate-position-description', { body })`.
- Error handling surfaces 402 (credits) and 429 (rate limit) per gateway guidelines.

## Files

- New: `supabase/functions/generate-position-description/index.ts`
- New: `src/components/requisition/AIGeneratePositionDescription.tsx`
- Edited: `src/pages/JobRequisitionForm.tsx` (toolbar in Position Description card, state for attachments and loading, integration)

## Non-goals (for now)

- No JD library/storage — attachments are session-only.
- No ML/embedding-based retrieval from past requisitions (future work, as noted by the user).
- No changes to other fields (experience, education, competencies).
