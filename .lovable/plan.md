

## Order Strategy Tracker Items by Pillar

### Change
Add a `PILLAR_ORDER` constant and sort the `items` array before rendering, grouping them by pillar in the requested order:

1. Establish a best in class approach to talent acquisition
2. Cultivate an engaging and positive employee experience
3. Drive skills growth and elevate leadership skills
4. Foster a culture of excellence, inclusion and wellbeing
5. Leverage data driven decision making
6. (empty pillar — items without a pillar go last)

### Implementation

**File: `src/pages/StrategyTracker.tsx`**

1. Add a `PILLAR_ORDER` array with the 5 pillars in the specified order.
2. Before the `items.map(...)` call (~line 308), sort items by their pillar's index in `PILLAR_ORDER`. Items with no pillar go to the end. Within the same pillar, preserve existing order.
3. Optionally add pillar group header rows in the table to visually separate sections.

