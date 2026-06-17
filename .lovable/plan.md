## Problem

On `/requisitions/new`, the "Attach existing JD" feature only stages the file. Even after clicking **Generate with AI**, only **Purpose of the Position** and **Main Duties & Responsibilities** get filled. The other fields the attached JD almost always contains — Essential / Desirable Experience, Essential / Desirable Education, Languages — are left blank, so it feels like the upload "did nothing."

Two issues to fix:

1. The edge function only returns 2 keys (`purpose_of_position`, `main_duties_responsibilities`).
2. The UI never auto-runs extraction on attach, and the apply callback only writes those 2 fields.

## Plan

### 1. Expand edge function output — `supabase/functions/generate-position-description/index.ts`
Change the system prompt and response schema so the model returns **all** drafted fields in one JSON object:

- `purpose_of_position` (string)
- `main_duties_responsibilities` (markdown bullets)
- `essential_experience` (string)
- `desirable_experience` (string)
- `essential_education` (string)
- `essential_education_level` (string, normalized to one of the existing level options)
- `desirable_education` (string)
- `additional_languages` (array of `{ name, level }`)

When an attached JD is present, instruct the model to **extract verbatim where possible** instead of inventing. When no attachment, fall back to generation as today.

### 2. Update client component — `src/components/requisition/AIGeneratePositionDescription.tsx`
- Widen the `onApply` result type to include the new fields.
- Add an **auto-extract on attach** path: as soon as files are attached, automatically call the edge function in "extract-only" mode (no overwrite of non-empty fields). The existing **Generate with AI** button stays for the no-attachment / regenerate flow and keeps the overwrite confirmation dialog.
- Toast clearly when extraction completes ("Extracted N fields from <filename>").

### 3. Wire new fields into the form — `src/pages/JobRequisitionForm.tsx`
Extend the `onApply` handler at line ~1668 to also write:
- `essential_experience`, `desirable_experience`
- `essential_education`, `essential_education_level`, `desirable_education`
- `additional_languages` (and sync the local `additionalLanguages` state used by the languages UI)

Respect the same `overwrite` vs `fillEmpty` rule per field that already exists for purpose/duties.

### 4. Keep the rest of the requisition form untouched
No schema, routing, or other field changes. Competencies are intentionally **not** auto-filled — they're a controlled taxonomy (selected via checklists), and free-text extraction would create invalid values.

## Technical Notes
- Education level must be coerced to one of the form's existing dropdown options; if the model returns something else, drop it and leave the field empty.
- `additional_languages` levels must match the existing language-level options used elsewhere in the form; unknown levels get dropped.
- Auto-extract on attach uses `mode: "fillEmpty"` so the user never loses typed content silently.
- Increase `MAX_PER_FILE` budget if needed for longer JDs (current 15k chars is usually enough for one JD).

## Out of scope
- Parsing scanned/image-only PDFs (still relies on `pdfjs-dist` text extraction).
- Filling competencies, grade, duty station, or other structural fields.
