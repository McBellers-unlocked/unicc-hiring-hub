# Fix AI Generate errors + UX tweaks

## 1. Fix edge function error
The likely cause is the `npm:mammoth` and `npm:unpdf` imports failing to bundle/run in Supabase Edge Functions. Replace server-side document parsing with client-side text extraction so the edge function only needs to receive plain text.

**Edge function (`supabase/functions/generate-position-description/index.ts`):**
- Remove all `npm:mammoth` / `npm:unpdf` / base64-decoding logic.
- Change `attachments` payload shape to `{ filename: string; text: string }[]`.
- Just truncate and inject the provided text into the prompt (same 15k/40k caps).
- Keep auth check, AI gateway call, JSON parsing, error responses.

**Client (`src/components/requisition/AIGeneratePositionDescription.tsx`):**
- Extract text from each attached file in the browser before invoking the function:
  - `.txt` → `file.text()`
  - `.pdf` → use `react-pdf`/`pdfjs` (already a project dep) to load and extract text from all pages
  - `.docx` → add `mammoth` as a client dep (works in browser) and call `mammoth.extractRawText({ arrayBuffer })`
  - `.doc` (legacy) → not supported; show a toast asking to upload .docx/.pdf/.txt
- Send the extracted text strings to the edge function.
- If a file fails to parse, toast a warning and skip it (don't block other files).

This also makes the edge function smaller and faster and avoids any Deno/npm interop issues.

## 2. Gate the "Generate with AI" button
Disable until **position title**, **grade/level**, AND **unit/section/division** are all filled. Update the component:
- `getContext` already returns those; check them inside the click handler and reflect via a `disabled` prop computed from the same form values.
- Update tooltip / helper text to read: "Fill position title, grade, and division to enable AI generation."

Implementation: pass a `canGenerate: boolean` prop (or derive inside via the context getter on each render through `form.watch` in `JobRequisitionForm.tsx`), and disable the button accordingly.

## 3. Move "Attach existing JD" to the top
Reorder the toolbar in `AIGeneratePositionDescription.tsx`:
1. Attach existing JD button + attached file chips
2. Generate with AI button
3. Helper text underneath

## Files to edit
- `supabase/functions/generate-position-description/index.ts` — strip parsing, accept pre-extracted text
- `src/components/requisition/AIGeneratePositionDescription.tsx` — add client-side PDF/DOCX/TXT parsing, reorder UI, add disabled state
- `src/pages/JobRequisitionForm.tsx` — pass `canGenerate` derived from `position_title`, `level`, `unit_section_division`
- `package.json` — add `mammoth` (browser-compatible) dependency

## Non-goals
- No retry logic for failed AI calls.
- No persistence of attached JDs.
- No .doc (legacy Word 97) support.
