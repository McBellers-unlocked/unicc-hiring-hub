

## Pre-populate Strategy Tracker with Spreadsheet Data

### Changes to `src/pages/StrategyTracker.tsx`

1. **Add "2025" to YEARS**: Update from `["2026", "2027", "2028"]` to `["2025", "2026", "2027", "2028"]`.

2. **Add default seed data**: Create a `DEFAULT_ITEMS` array with all 35 rows from the images. Each row maps to a `StrategyItem` with:
   - `actionItem`, `year[]`, `status`, `priority` (spreadsheet "Park" → "Pause"), `pillar`, `owner: []`, `participants: []`
   - `updates` and `prioritisationUpdates` as `UpdateEntry[]` entries (author: `"Imported"`) where the spreadsheet has text

3. **Update initialization**: Change the fallback from `[newItem()]` to `DEFAULT_ITEMS` so seed data loads when localStorage is empty.

### Data (35 rows extracted from images)

All rows from images 806–807, rows 1–35, covering all five pillars plus the ROE-related items (rows 32–34) with no pillar. Owners left empty as requested.

### Files modified
- `src/pages/StrategyTracker.tsx` only

