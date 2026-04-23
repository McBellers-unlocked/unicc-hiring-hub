

## Import Userbase — "Parse Data" Button

### Change — `src/pages/ImportUserbase.tsx`

Currently each `DropZone` manages its own file state internally and exposes its own per-zone "Upload" button. To gate a single bottom-level "Parse Data" action on both files being present, file state must be lifted into the parent `ImportUserbase` component.

**1. Lift file state to parent**
- In `ImportUserbase`, add two state slots: `gsmFile: File | null` and `samsaranFile: File | null`.
- Convert `DropZone` to a controlled component: accept `file`, `onFileChange(file: File | null)` props instead of managing its own state.
- Remove the per-zone "Upload" button and `uploading` state from `DropZone` (the per-zone upload was a placeholder; it's superseded by the unified Parse Data action). The drop area, validation toast, and selected-file row with the remove (X) button stay.

**2. Add "Parse Data" button**
- Below the two-column grid, render a centered full-width-on-mobile / `max-w-sm` centered button:
  - Label: `Parse Data` (becomes `Parsing…` while running)
  - `disabled={!gsmFile || !samsaranFile || parsing}`
  - On click: set `parsing = true`, simulate work with a short `await` (placeholder, matching the existing pattern), then `toast.success` `"Both extracts received. Parsing pipeline will be wired up next."` and reset `parsing`.
- Helper text under the button when disabled: `Upload both GSM and Samsaran extracts to enable parsing.` Hidden once both files are present.

**3. Imports**
- No new shadcn imports. Keep existing `Button`, `useToast`, icons. Add `Sparkles` (or reuse an existing icon) as the leading icon on the Parse Data button — optional, low-priority.

### Notes
- Purely client-side; no backend wiring (placeholder parse stays as a `setTimeout`).
- File-type validation, drag/drop UX, and the remove (X) affordance are unchanged.
- Layout: button sits inside the existing `container … max-w-6xl` wrapper, directly below the two-column grid, with `mt-6` spacing.

