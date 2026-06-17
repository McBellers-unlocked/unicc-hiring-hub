# Fix JD upload + expand auto-fill on `/requisitions/new`

## Root cause of "AI generation failed"

The previous CORS "fix" introduced an import that doesn't exist:

```ts
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
```

The `/cors` sub-path is not exported by `@supabase/supabase-js`. The function fails to load in Deno, so every `supabase.functions.invoke("generate-position-description", …)` returns a network-style "Failed to send a request" error — regardless of the JD content.

Every other edge function in this repo declares CORS inline; we'll do the same.

## What the AI currently fills vs. what you want

| Field | Today | After this change |
|---|---|---|
| Position Title | — | Auto |
| Nature of position | — | Auto (mapped to enum) |
| Grade | — | Auto (mapped to enum) |
| Unit / Section / Division | — | Auto (mapped to catalogue) |
| Duty station | — | Auto (mapped to enum) |
| Purpose of position | Auto | Auto |
| Main duties & responsibilities | Auto | Auto |
| Essential / desirable experience | Auto | Auto |
| Essential / desirable education (+ level) | Auto | Auto |
| Additional languages | Auto | Auto |
| Core / Management / Leadership competencies | — | Auto (checked from catalogue) |

## Changes

### 1. `supabase/functions/generate-position-description/index.ts`
- Remove the broken `npm:@supabase/supabase-js@2/cors` import.
- Restore an inline `corsHeaders` object (same shape used by every other function in the repo) and keep it spread into every response, including the OPTIONS preflight and all error returns.
- Extend the system prompt and the JSON schema the model must return to also include:
  - `position_title`
  - `nature_of_position` — must be one of: `Fixed term | Temporary | Individual Consultant | STDA | Intern`
  - `grade` — must be one of: `G3 G4 G5 G6 G7 P1 P2 P3 P4 P5 D1 D2`
  - `duty_station` — must be one of: `Brindisi | Geneva | Lyon | New York | Rome | Valencia` (plus `Remote` only for Intern / Individual Consultant)
  - `division` — one of: `CS | DD | DS | DO | MS | OP` (key only)
  - `unit_section_division` — must be one of the unit strings defined in `DIVISION_UNITS` for the chosen division (full string, e.g. `"CISO Section (CISO)"`)
  - `core_competencies[]`, `management_competencies[]`, `leadership_competencies[]` — each value must be the exact key portion (text before the first colon) from the inline catalogue in `JobRequisitionForm.tsx` (lines 2302–2306, 2355–2358, 2405–2408)
- Server-side validation: any value the model returns that is not in the allowed enum/catalogue is dropped (returned as `null` / removed from the array) so we never store junk.
- For competencies, enforce the form's rule (max 3 across all three groups for non-Intern; max 2 core for Intern) on the server by truncating.
- If the model cannot determine a field, it must return `null` for that field — we never invent values.

### 2. `src/components/requisition/AIGeneratePositionDescription.tsx` and the `onApply` callback in `src/pages/JobRequisitionForm.tsx`
- Extend the `onApply` handler so that, in addition to the existing keys, it sets the new fields via `form.setValue(...)` with `shouldValidate: true`:
  - `position_title`, `nature_of_position`, `grade`, `duty_station`
  - `division`, then `unit_section_division` (in that order — division must be set first so the unit dropdown's options resolve)
  - `core_competencies`, `management_competencies`, `leadership_competencies`
- "fillEmpty" mode (the default after a JD upload) only writes a field if the current form value is empty / unselected. "Overwrite" replaces.
- Keep the existing auto-trigger from the previous turn (upload JD → generation kicks off as soon as it has any text), but no longer require the user to have typed a Position Title first — title is now an output, not a prerequisite. The button stays available for manual re-runs.

### 3. No DB / RLS / schema changes
All affected fields already exist on the form and on the requisition row. No migration is needed.

## Verification
1. Reload `/requisitions/new`, attach the same JD you've been testing with, no toast errors.
2. Within ~10s the form should populate: title, nature, grade, division+unit, duty station, purpose, duties, experience, education, languages, and the relevant competency checkboxes.
3. Manually changing any field before generation finishes is preserved (fillEmpty won't overwrite).
4. Re-uploading a different JD on the same draft triggers another generation; only still-empty fields get filled.

## Out of scope
- OCR fallback for image-only / scanned PDFs (current pdf.js extraction is text-layer only — if a JD has no text layer the model will still get little context). Happy to add Vision-based OCR as a follow-up if you hit a scanned JD.
- Changing the underlying model (`google/gemini-2.5-flash`) or any scoring / rubric logic.
- The Job Wizard's separate `CompetenciesList` catalogue — only the requisition form's inline catalogue is targeted.
