## Problem

On `/requisitions/new`, the "Attach existing JD" button in the Position Description card does technically accept the file, but nothing visibly happens. Reproduction is fully explained by the existing code:

- `src/components/requisition/AIGeneratePositionDescription.tsx` (lines 107–126): after a file is picked, auto-generation only runs when `canGenerate` is true **and** `ctx.positionTitle?.trim()` is non-empty. Otherwise it silently does nothing — no toast, no badge guidance, no opening of an upload state.
- `src/pages/JobRequisitionForm.tsx` (lines 1645–1667): `canGenerate` requires `position_title`, `grade`, and `unit_section_division` all to be filled. On a fresh requisition these are empty, so the auto-trigger short-circuits.
- The "Generate with AI" button is also `disabled={!canGenerate}`, so clicking it after attaching the JD also appears to do nothing.

Result: user attaches a JD on a new requisition, sees no toast, no error, no spinner, no extracted content. Exactly the reported symptom.

## Fix (scoped, no refactor)

Only edit `src/components/requisition/AIGeneratePositionDescription.tsx`. No backend/edge-function changes — the upload+generate path itself works once fields are present.

1. **Surface the missing prerequisites when a JD is attached** — in `handlePickFiles`, after `setFiles(next)`:
   - If `accepted.length > 0` and either `!canGenerate` or `!ctx.positionTitle?.trim()`, fire an informational toast (not destructive) showing the file is attached but generation is blocked, naming the missing fields (reuse `missingFieldsLabel` already passed in from the parent, with a sensible default).
   - Keep the existing auto-run path when everything is ready.

2. **Confirm the attachment visually even when auto-run is blocked** — the badge list at lines 252–268 already renders once `files.length > 0`, so the toast plus the badge gives clear feedback that the file was accepted and what's needed next.

3. **Re-trigger when prerequisites become ready** — add a small `useEffect` that watches `canGenerate` + the result of `getContext().positionTitle`: when both flip to truthy while `files.length > 0` and the component is not already loading, run `runGeneration("fillEmpty")` automatically. This makes "attach JD first, then type the title" Just Work.

4. **No change** to: `getContext`, `runGeneration` body, the edge-function payload, file parsing (pdfjs/mammoth), accepted MIME types, size limits, the AlertDialog overwrite flow, or `JobRequisitionForm.tsx`. The `rubric_breakdown`/scoring engine is untouched.

## Verification

- Load `/requisitions/new`, attach a JD with the form empty → expect a non-destructive toast naming the missing fields (e.g. "Fill position title, grade, division to enable AI generation"), and the file badge to appear.
- Then type the position title, pick a grade and division → generation should kick off automatically (effect from step 3), spinner appears on the Generate button, fields populate from the JD.
- Existing flow on an in-progress requisition where title/grade/division are already filled → unchanged: attach JD → auto-runs immediately, same as today.

## Out of scope

- Auto-inferring `position_title`/`grade`/`division` from the JD text (could be a follow-up — would require parent-side `onApply` extension).
- Any change to the `generate-position-description` edge function, scoring engine, or rubric contract.
