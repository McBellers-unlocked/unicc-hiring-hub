

## Fix: Organization Filters Not Affecting Portfolio Metrics

### Problem
The "Total Skills in Portfolio" (679) and all related stats (status breakdown, modernization rate, legacy risk, bar chart) never change when filters are applied. This is because `fetchSkillsData` always fetches **all** active skill definitions from `skill_definitions` without considering user-based filters (division, duty station, grade, worker type).

The filters only affect `fetchActionKPIs` and `fetchDivisionSkillsData`, but the top-level portfolio metrics are computed from the unfiltered `skills` array.

### Root Cause
`fetchSkillsData` (line 130-139) runs `SELECT * FROM skill_definitions WHERE is_active = true` regardless of filter state. The `metrics` computed at line 404 use `effectiveSkills` which is just the full skill list (optionally filtered by OSS only).

### Solution
When user-demographic filters are active, fetch the set of `skill_id` values from `skill_assessments` that belong to filtered users, then intersect the skill definitions with that set.

### Changes (single file: `src/components/skills-analysis/SkillsPortfolioAnalytics.tsx`)

1. **Modify `fetchSkillsData`** to accept filters:
   - If any demographic filter is active, query `users` table with filters to get matching user IDs
   - Query `skill_assessments` for those user IDs to get distinct `skill_id` values
   - Filter the skill definitions to only include skills present in that set
   - If no filters are active, keep current behavior (show all active skills)

2. **No other changes needed** -- `effectiveSkills`, `metrics`, `categories`, and `filteredSkillsForMatrix` are all derived from `skills` state, so they will automatically update once `skills` is filtered correctly

### Technical Detail

```text
Current flow:
  skill_definitions (all 679) → skills → metrics.total = 679

Fixed flow (when filters active):
  users (filtered) → user IDs
  skill_assessments (filtered by user IDs) → distinct skill_ids
  skill_definitions (intersected with skill_ids) → skills → metrics.total = filtered count
```

The `useEffect` on line 121-128 already re-runs when filters change, so the data will refresh automatically.

