

## Enhanced "Act" Dropdown on Emerging Skills Gaps

### Overview
Expand the existing "Act" dropdown menu on each row of the Emerging Skills Gaps table with four new actionable options, and add a "Recruitment Priorities" KPI card at the top of the Organization tab that updates dynamically when skills are flagged.

### Changes

#### 1. EmergingSkillsGaps.tsx — Enhanced dropdown + development plan modal

**New dropdown items** (replacing the current 4 placeholder items):
- **Find Internal Talent** — opens the existing `SkillPeopleDrillDown` panel (already wired) but with a filter hint for "adjacent skills"
- **Create Development Plan** — opens a new modal (`Dialog`) with pre-filled fields: skill name, suggested training resources, target proficiency (from `requiredLevel`), and a 3-month timeline. Includes a "Send to Manager" button that fires a toast notification.
- **Flag for Recruitment** — toggles a recruitment priority flag on the skill row, adds a visual badge, and calls a parent callback to update the recruitment priorities count
- **View by Location** — calls a parent callback to switch to the Geographic tab with the skill name pre-selected

**New state:**
- `flaggedForRecruitment: Set<string>` — tracks which skill IDs are flagged
- `devPlanSkill: SkillGapData | null` — controls the development plan modal

**New props added:**
- `onFlagForRecruitment?: (skillIds: string[]) => void` — notifies parent of flagged skill changes
- `onViewByLocation?: (skillName: string) => void` — triggers tab switch to Geographic view
- `recruitmentFlags?: Set<string>` — receives persisted flags from parent

**New sub-component inline:** A `Dialog` for the Development Plan modal containing:
- Read-only skill name, category, current avg proficiency, target level
- Suggested training text (auto-generated based on skill category)
- Timeline selector (3/6/12 months)
- "Send to Manager" button → toast: "Development plan for [skill] sent to line manager"

#### 2. SkillsPortfolioAnalytics.tsx — Recruitment Priorities KPI + state management

**New state:**
- `recruitmentPriorities: Set<string>` — set of flagged skill IDs, persisted in component state

**New KPI card** inserted into the existing 6-column KPI grid (making it 7, or replacing one row with a highlighted strip above the grid):
- Rendered as a distinct summary strip/card above the KPI grid: "Recruitment Priorities: X skills flagged" with a small list of flagged skill names and a "Clear All" button
- Only shown when count > 0

**Wiring:**
- Pass `recruitmentFlags` and `onFlagForRecruitment` to `EmergingSkillsGaps`
- Pass `onViewByLocation` that calls `setActiveTab('geographic')` — requires lifting `setActiveTab` or using a callback from the parent `SkillsAnalysis.tsx`

#### 3. SkillsAnalysis.tsx — Tab switching callback

- Pass `setActiveTab` down to `SkillsPortfolioAnalytics` as an `onSwitchTab` prop so "View by Location" can navigate to the Geographic tab

### Technical Details

- The recruitment flags are stored in React state (session-only). No database persistence needed for now.
- The Development Plan modal uses shadcn `Dialog` with form fields.
- "Find Internal Talent" reuses the existing `SkillPeopleDrillDown` sheet — same as clicking the skill name, but opens it directly from the dropdown.
- "View by Location" chains two actions: switches to Geographic tab and could pre-filter the comparison matrix to show that skill (if it exists in the dropdown selectors).
- The flagged skills badge appears as a small `Flag` icon next to the skill name in the table row.
- The Recruitment Priorities strip uses a `Card` with `border-primary/50 bg-primary/5` styling, similar to the existing uncategorized warning pattern.

### Files Modified
1. `src/components/skills-analysis/EmergingSkillsGaps.tsx` — enhanced dropdown, dev plan modal, flag logic
2. `src/components/skills-analysis/SkillsPortfolioAnalytics.tsx` — recruitment priorities state, KPI strip, prop wiring
3. `src/pages/SkillsAnalysis.tsx` — pass `setActiveTab` callback to SkillsPortfolioAnalytics

