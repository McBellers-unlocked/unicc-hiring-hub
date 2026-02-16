

## Open Source Skills and Products Mapping

### Overview
Add an "open source" dimension to the skills framework, combining a flag on individual skills with a dedicated product-to-skill mapping table. This will be surfaced across all skills-related views: My Skills, Team Skills, Heatmap, Organization Analytics, Talent Pool, and Profile pages.

### Database Changes

#### 1. Add `is_open_source` column to `skill_definitions`
```sql
ALTER TABLE skill_definitions
ADD COLUMN is_open_source BOOLEAN NOT NULL DEFAULT false;
```

#### 2. Create `open_source_products` table
A lookup table of open source products/tools, each linked to one or more skills.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | TEXT NOT NULL UNIQUE | e.g. "Kubernetes", "PostgreSQL", "React" |
| description | TEXT | Optional short description |
| website_url | TEXT | Optional link to project site |
| license_type | TEXT | e.g. "Apache 2.0", "MIT", "GPL" |
| is_active | BOOLEAN DEFAULT true | Soft-delete |
| created_at / updated_at | TIMESTAMPTZ | Standard timestamps |

#### 3. Create `product_skill_mappings` join table
Maps products to skills (many-to-many).

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| product_id | UUID FK -> open_source_products | |
| skill_id | UUID FK -> skill_definitions | |
| UNIQUE(product_id, skill_id) | | Prevent duplicates |

#### 4. RLS Policies
- `open_source_products`: SELECT for all authenticated users; INSERT/UPDATE/DELETE for Admin/HR roles (same pattern as `skill_definitions`).
- `product_skill_mappings`: Same pattern.

---

### Frontend Changes

#### A. Skill badges and indicators (everywhere skills appear)

Add a small open source icon (a `Globe` or custom OSS icon) next to any skill flagged `is_open_source = true`. This applies to:

- **MySkillsAssessment.tsx** -- skill name cells in the proficiency table and credential badges
- **TeamSkillsTable.tsx** -- skill name column
- **SkillHeatmap.tsx** -- skill name labels on the left
- **SkillsPortfolioAnalytics.tsx** -- division skill matrix rows
- **EnhancedSkillsSection.tsx** (profile view) -- skill badges
- **AssessedSkillBadge.tsx** (internal talent) -- badge label
- **CandidateSearchCard.tsx** (talent pool) -- skill tags

Each will show a small `Globe` icon or an "OSS" micro-badge beside the skill name. Tooltip will say "Open source technology".

#### B. SkillAssessmentDialog.tsx -- show open source indicator

When selecting a skill from the dropdown, show the open source icon next to flagged skills so users are aware of the classification.

#### C. Organization Analytics tab -- Open Source coverage stats

Add a new card/section in `SkillsPortfolioAnalytics.tsx`:
- **Open Source Coverage**: percentage of assessed skills that are open source
- **Top Open Source Products**: list of most-used OSS products across staff, with staff count
- **Division OSS Heatmap row**: a summary row showing how many open source skills each division covers

#### D. Talent Pool filters

In `TalentSearchFilters.tsx`, add a toggle: **"Open source skills only"**. When enabled, filters candidates/staff to those who have at least one skill flagged as open source.

#### E. Admin Skills Review page

In `AdminSkillsReview.tsx`, add ability to:
- Toggle `is_open_source` flag on any skill definition
- Manage open source products (CRUD) and their skill mappings

This will be the primary place where admins maintain the OSS catalog.

---

### Data Flow

```text
skill_definitions (is_open_source flag)
        |
        +--- open_source_products <-> product_skill_mappings
        |
        +--- skill_assessments (existing, joins on skill_id)
                |
                +--- Surfaces in all UI components via the skill_definitions join
```

All existing queries that fetch `skill_definitions` will be updated to include `is_open_source`. The product mapping is fetched separately only where product-level detail is needed (Organization Analytics, Admin review).

### Technical Details

#### Files to modify:
1. **New migration** -- adds column, two tables, RLS policies, indexes
2. **src/components/skills-analysis/MySkillsAssessment.tsx** -- OSS icon in skill names
3. **src/components/skills-analysis/TeamSkillsTable.tsx** -- OSS icon in skill column
4. **src/components/skills-analysis/SkillHeatmap.tsx** -- OSS icon in skill labels
5. **src/components/skills-analysis/SkillAssessmentDialog.tsx** -- OSS icon in dropdown
6. **src/components/skills-analysis/SkillsPortfolioAnalytics.tsx** -- new OSS stats card + product list
7. **src/components/profile/EnhancedSkillsSection.tsx** -- OSS badge on skills
8. **src/components/internal-talent/AssessedSkillBadge.tsx** -- OSS indicator
9. **src/components/talent-pool/TalentSearchFilters.tsx** -- OSS filter toggle
10. **src/pages/AdminSkillsReview.tsx** -- OSS flag toggle + product management UI
11. **src/integrations/supabase/types.ts** -- will auto-update after migration

#### New files:
- None required (all changes fit within existing components)

#### Query changes:
- All `skill_definitions` SELECT queries add `is_open_source` to the column list
- New queries for `open_source_products` and `product_skill_mappings` in analytics and admin views

