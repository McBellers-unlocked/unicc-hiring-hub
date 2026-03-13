

## Collapsible Row Layout for Strategy Tracker

### What changes

**File**: `src/pages/StrategyTracker.tsx`

Restructure each row into two parts:

1. **Main row** (always visible): Action Item (as a multi-line textarea, 3-4 rows tall), Year, Status, Priority, Owner, and a chevron toggle button
2. **Expandable detail row** (hidden by default): Updates, Prioritisation Updates, 2025 Pillar, Participants, Delete button — shown when the chevron is clicked

### How

- Add `expandedRows` state (`Set<string>`) to track which rows are expanded
- Replace the `Input` for Action Item with a `textarea` element (3-4 rows, ~80px height) so full text is visible
- Reduce the table headers to: Action Item, Year, Status, Priority, Owner, and a toggle column
- Use Radix `Collapsible` (already installed) or simply conditionally render a second `TableRow` beneath each main row containing the detail fields in a grid/flex layout
- The chevron rotates when expanded (ChevronDown icon from lucide)
- Detail row spans all columns with a subtle background, containing labeled fields for Updates, Prioritisation Updates, Pillar, Participants, and the delete button

