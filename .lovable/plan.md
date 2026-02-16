

## Open Source Filter and Analytics on the Organization Tab

### Overview
Add an "Open Source Only" filter toggle to the Organization tab's filter bar, plus a dedicated OSS analytics section showing coverage metrics, top open source products, and per-division OSS breakdown.

### Changes

#### 1. OrganizationFilters.tsx -- Add OSS toggle

- Add `ossOnly: boolean` to the `FilterState` interface (default `false`)
- Add a `Switch` or `ToggleGroupItem` labeled "OSS Only" with a `Globe` icon in the filter bar, next to the existing view mode toggle
- Include it in the reset logic

#### 2. SkillsPortfolioAnalytics.tsx -- Wire up filter + add analytics section

**Filter logic:**
- When `filters.ossOnly` is `true`, filter the `skills` array to only those with `is_open_source === true`
- This automatically affects all downstream computed values (KPI cards, status bar, category chart, matrix) since they all derive from the `skills` array

**New OSS Analytics section** (inserted between the Emerging Skills Gaps and the Organization Matrix):
- A card titled "Open Source Coverage" with:
  - **KPI row**: Total OSS skills count, % of portfolio that is OSS, number of staff with at least one OSS skill
  - **Division breakdown table**: For each division, show count of OSS skills assessed, staff with OSS skills, and average proficiency -- derived from existing `divisionData` joined with the `is_open_source` flag
  - **Top Open Source Products**: Fetch from `open_source_products` joined with `product_skill_mappings` and `skill_assessments` to show the most-used products with staff counts (top 10)

### Technical Details

**Files to modify:**
1. `src/components/skills-analysis/OrganizationFilters.tsx` -- add `ossOnly` to FilterState, add toggle UI
2. `src/components/skills-analysis/SkillsPortfolioAnalytics.tsx` -- filter skills by OSS flag, add OSS analytics card with division breakdown and product stats

**New queries in SkillsPortfolioAnalytics:**
- `open_source_products` joined with `product_skill_mappings` to get product-to-skill mappings
- Cross-reference with `skill_assessments` to count staff per product

**No database changes needed** -- all tables and columns already exist from the previous migration.

