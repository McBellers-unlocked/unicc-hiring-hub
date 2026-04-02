

## Replace KPI Cards with Bar Chart

### What
Remove the 9 stats cards at the top of `/admin/affiliate-personnel` and replace them with a single bar chart showing the count of ICs, UNVs, and Interns.

### Implementation

**File: `src/pages/AffiliatePersonnel.tsx`**

1. **Add imports**: Import `BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell` from `recharts`.

2. **Replace the stats cards block** (lines 732-788) with a single `Card` containing a horizontal `BarChart` with 3 bars (IC, UNV, Intern), using the existing `stats.ics`, `stats.unvs`, and `stats.interns` values. Each bar will have a distinct color (blue for IC, purple for UNV, green for Intern). The chart will be compact (~200px height) to keep the page concise.

3. **Keep the `stats` object** as-is since it's still used for the chart data and potentially elsewhere.

