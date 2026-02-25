

## Populate Organization Skills Matrix with Dummy Data

### Problem
The Organization Skills Matrix shows empty cells because the database has no real `skill_assessments` data for division-level aggregation. The `fetchDivisionSkillsData` function queries the DB and returns empty results.

### Approach
After the real data fetch completes, if `divisionData` is empty (no real assessments), generate deterministic dummy data for every combination of division × skill. This keeps the real data path intact — if real data exists, it will display; otherwise dummy data fills in.

### Changes (single file: `src/components/skills-analysis/SkillsPortfolioAnalytics.tsx`)

1. **Generate dummy staff counts per division** — At the end of `fetchDivisionSkillsData`, if the real `divisionAggregations` array is empty (or staff counts are all zero), populate with dummy values:
   - CS: 45, DD: 32, DO: 28, DS: 51, MS: 38, OP: 24

2. **Generate dummy division skill data** — For each division × skill combination, use a simple deterministic hash (from division name + skill ID) to produce:
   - `staffWithSkill`: 30-90% of division staff count
   - `averageLevel`: between 1.5 and 4.8
   - `credentialCount`: for credential-type skills, 20-70% of staff

3. **Implementation**: Add a helper function `generateDummyMatrixData(skills, divisions, staffCounts)` that returns a `DivisionSkillAggregation[]` array. Call it as a fallback at the end of `fetchDivisionSkillsData` when real data is empty.

4. **Hash function**: Reuse a simple string hash (`(division + skillId)` → deterministic number) so values stay stable across re-renders and category filter changes.

### Result
Every cell in the matrix will show a colored dot with a staff count, coverage percentages will be non-zero, and the Insights Strip above the matrix will also populate since it reads from the same `divisionData` state.

