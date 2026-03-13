

## Strategy Tracker Page

### Overview
Create a new `/strategy-tracker` page with a table displaying action items with filterable columns matching the uploaded screenshot layout.

### Columns (from image)
1. **Action Item** — Text input/display (checkbox icon in header)
2. **Year** — Select: 2026, 2027, 2028
3. **Status** — Select with colored badges: Achieved (pastel green), In progress (amber), Paused (light pastel red), Not started (grey)
4. **Owner** — Select: Frederic LAVAL, Anna NEGYESI-MOUYSSET, Olga L, Diego Arsita, Matt VALENTE
5. **Priority** — Select: Critical, Important, Low, Pause
6. **Updates** — Text field
7. **Prioritisation update...** — Text field (likely "Prioritisation updates")
8. **2025 Pillar** — Select with 5 pillar options
9. **Participants** — Text/multi-select field

### Implementation

**New file: `src/pages/StrategyTracker.tsx`**
- Local state array of strategy items (no Supabase for now — client-side CRUD)
- Table using existing `Table` UI components
- Inline editing: click a cell to edit via select dropdowns or text inputs
- Status badges with colored backgrounds matching the spec
- Add/delete row functionality
- Data persisted in `localStorage`

**Route: `src/App.tsx`**
- Add `/strategy-tracker` route

### Technical Details
- Status color mapping: `achieved → bg-green-100 text-green-800`, `in_progress → bg-amber-100 text-amber-800`, `paused → bg-red-100 text-red-800`, `not_started → bg-gray-100 text-gray-800`
- Uses existing shadcn Table, Select, Badge, Button components
- Each row is editable inline with dropdowns for enum fields and text inputs for free-text fields

