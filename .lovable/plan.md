

## Convert Participants to Tag/Pill Input

### What changes

**File**: `src/pages/StrategyTracker.tsx`

Convert the `participants` field from a plain text `Input` to a tag-style input where you type text, press Enter, and it becomes a removable pill/badge — matching the skills search pattern in `TalentSearchFilters.tsx`.

### Data model change
- `participants`: change from `string` to `string[]` (default `[]`)
- Add migration: if existing localStorage value is a string, split by comma into array (or wrap as single entry if no commas)

### UI (in the expandable detail row)
- An `Input` with placeholder "Type a participant and press Enter..."
- On Enter keydown: trim text, add to array if not duplicate, clear input
- Below the input: render each participant as a `Badge` with an `X` icon to remove
- Pattern copied directly from `TalentSearchFilters.tsx` lines 156-172

### Files modified
- `src/pages/StrategyTracker.tsx` only

