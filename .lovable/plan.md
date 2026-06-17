## Goal
When the user fills Position Title + Nature + Grade + Division and clicks **Generate with AI** (no JD attached), reliably produce:

- **Purpose of position** (2–4 sentences)
- **Main duties & responsibilities** (6–10 bullets)
- **Essential & desirable experience** — only the "field/area" wording; do NOT overwrite the years-of-experience number auto-set from grade
- **Essential & desirable education** — only the field-of-study wording; do NOT overwrite `essential_education_level` auto-set from grade

All closed-list fields (Duty Station, Unit/Section, Competencies, Languages, Nature, Grade, Division) stay untouched on the no-JD path.

## Root cause
Two issues in `supabase/functions/generate-position-description/index.ts`:

1. Model `google/gemini-2.5-flash` may be deprecated/unavailable on the Lovable AI Gateway, returning a 4xx that the client surfaces as the generic "AI generation failed" toast.
2. The system prompt instructs the model to return `null` for most fields when no JD is attached, so even on success the response is often empty enough to confuse the user.

## Changes

### 1. `supabase/functions/generate-position-description/index.ts`
- Switch model to `google/gemini-3-flash-preview` (the documented default chat model).
- Split the prompt into two modes:
  - **JD-attached mode**: unchanged behavior (extraction).
  - **No-JD mode**: ask only for `purpose_of_position`, `main_duties_responsibilities`, `essential_experience`, `desirable_experience`, `essential_education`, `desirable_education`. Force all other keys to `null` / `[]` server-side. Add explicit instruction: do not state a number of years of experience and do not name a degree level (Bachelor/Master/etc.) — only describe the field/area of experience and field of study.
- Improve error logging: include the gateway response status + body in the JSON returned to the client (truncated) so the toast shows the real reason instead of "AI generation failed".

### 2. `src/components/requisition/AIGeneratePositionDescription.tsx`
No behavior change to the JD path. For the no-JD path, ensure `onApply` is called with `mode: "fillEmpty"` by default (no overwriting of years/level the form pre-populated from grade).

### 3. `src/pages/JobRequisitionForm.tsx` — `onApply` handler
- In `"fillEmpty"` mode, only write `essential_experience` / `desirable_experience` / `essential_education` / `desirable_education` when the current field is empty OR contains only the grade-derived stub (e.g. "X+ years of …" boilerplate with no field/area). Concretely: if the existing value matches `/^\s*\d+\+?\s*years?/i` and has no "in <field>" clause, append the AI's field/area phrase to it rather than replacing.
- Never call `setSelectedCoreCompetencies` / `setSelectedDivision` / `setSelectedUnit` / duty-station setters on the no-JD path (the AI returns null/[] for these so this is already a no-op, but make it explicit by short-circuiting on falsy values).
- Leave `essential_education_level` untouched in fillEmpty mode if the form already has it set from grade.

## Verification
1. On `/requisitions/new` enter only Title / Nature=Fixed term / Grade=P3 / Division=DD.
2. Click **Generate with AI** — within ~10 s the four target fields populate, grade-derived years/level remain intact, no closed-list selections move.
3. If the gateway errors, the toast shows the real status + message (e.g. "AI error 404: model not found") instead of the generic failure string.

## Out of scope
- JD-upload extraction path (working, per user instruction "don't touch this").
- Auto-suggesting closed-list fields without a JD.
- Changing form validation of grade-derived defaults.
