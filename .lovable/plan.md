

## People Drill-Down from Skills

### Overview
Create a reusable `SkillPeopleDrillDown` component (slide-out Sheet) that shows detailed staff data for any clicked skill. It will use 100 dummy staff profiles with UN-style diverse names. This panel will be triggered from the Risk & Impact Matrix, Emerging Skills Gaps table, and Skills Distribution bar.

### New File: `src/components/skills-analysis/SkillPeopleDrillDown.tsx`

**Props:**
- `open: boolean`, `onOpenChange`, `skillName`, `skillId`, `category`, `lifecycleStage` (Established/Emerging/New/Legacy)

**Sections inside the Sheet:**
1. **Header** -- Skill name, category badge, lifecycle stage badge
2. **Summary row** -- "X staff with this skill" vs "Y required" (3-column stat cards)
3. **People table** (ScrollArea) with columns:
   - Name
   - Division (CS/DD/DO/DS/MS/OP)
   - Duty Station (Valencia/Geneva/New York/Brindisi/Rome)
   - Proficiency Level -- Badge colored by level (Beginner=gray, Intermediate=blue, Advanced=amber, Expert=green)
   - Gap to Required -- "Meets requirement" green, "1 level below" amber, "2+ below" red
   - Last Assessed date
4. **"Near Match" section** -- Staff with related/adjacent skills who could be developed, with a "Recommend for Development" button per person

**Dummy data generator** (inside the file):
- 100 profiles with names like Fatima Al-Hassan, Kenji Tanaka, Priya Sharma, Carlos Gutierrez, Amara Diallo, Olga Petrov, etc.
- Distributed across 5 duty stations and 6 divisions
- Varying proficiency levels (1-4 mapped to Beginner/Intermediate/Advanced/Expert)
- Random "last assessed" dates within the past 12 months
- ~15-25 "near match" candidates shown separately

### Changes to Existing Files

**`src/components/skills-analysis/SkillRiskQuadrant.tsx`**
- Replace existing Sheet drill-down with `SkillPeopleDrillDown`
- Pass skill metadata (name, category from skill definitions, lifecycle stage from `ai_suggested_status`) to the new component
- Remove the inline Sheet JSX (~lines 573-706) and the `StaffGap`/`DivisionImpact` interfaces + `handleDotClick` fetch logic

**`src/components/skills-analysis/EmergingSkillsGaps.tsx`**
- Add state for selected skill drill-down
- Make each skill row clickable (onClick on the skill name)
- Render `SkillPeopleDrillDown` with the selected skill's data

**`src/components/skills-analysis/SkillStatusBar.tsx`**
- Make each lifecycle segment in the bar clickable
- Open `SkillPeopleDrillDown` for a representative skill in that lifecycle stage (or show a list; since clicking a segment represents many skills, we'll open the panel for the top skill in that category)
- Add state + render `SkillPeopleDrillDown`

### Dummy Data Approach
- All 100 profiles are generated deterministically (seeded by skill name) so different skills show different but consistent subsets
- For any given skill, ~20-40 staff are shown as having the skill, with realistic proficiency distributions
- ~8-15 staff shown as "Near Match" candidates

### Technical Detail
```text
SkillPeopleDrillDown (new shared component)
├── Header: skill name + category + lifecycle badge
├── Stats: staff count / required / avg proficiency
├── People Table (filtered from 100 dummy profiles)
│   ├── Name | Division | Duty Station | Proficiency | Gap | Last Assessed
│   └── Scrollable, up to 40 rows
├── Near Match Section
│   ├── Adjacent-skill staff with "Recommend for Development" button
│   └── ~8-15 candidates
└── Used by:
    ├── SkillRiskQuadrant (replaces existing Sheet)
    ├── EmergingSkillsGaps (new click handler on skill names)
    └── SkillStatusBar (new click handler on bar segments)
```

