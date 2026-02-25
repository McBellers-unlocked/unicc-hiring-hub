

## Make Landmass and Sea More Distinguishable

### Problem
The map's land and ocean colors are too similar, making it hard to distinguish continents from water.

### Change (single file)

**`src/components/skills-analysis/GeographicSkillsView.tsx`**

1. Change the ocean background from `hsl(210 50% 96%)` to a more obviously blue tone like `hsl(210 60% 90%)` — a soft but clearly "water" blue
2. Change the Geography `fill` from `hsl(var(--muted))` to a warmer, clearly "land" tone like `hsl(40 30% 92%)` — a light sandy/cream color
3. Keep stroke color as-is for country borders

These two changes create clear visual contrast: blue ocean vs cream/sandy land.

