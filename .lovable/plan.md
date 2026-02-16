

## Add "Suggest New Skill" to Skill Assessment Dialog + Insert "Supabase" as OSS Skill

### Overview
Currently the Skill Assessment Dialog only allows selecting from existing skills in `skill_definitions`. This change adds a "Suggest New Skill" option so users can propose skills that don't exist yet. Additionally, we'll seed "Supabase" into the database as an active OSS skill.

### Changes

#### 1. Seed "Supabase" into `skill_definitions`
Insert a new skill definition via data operation:
- **Name**: Supabase
- **Category**: Technical & Domain
- **Skill type**: proficiency
- **Status**: established
- **is_open_source**: true
- **is_active**: true

Also add it to the `open_source_products` table with license "Apache 2.0" and website "https://supabase.com".

#### 2. Add "Suggest New Skill" feature to `SkillAssessmentDialog.tsx`

Add a small link/button below the skill dropdown: **"Can't find your skill? Suggest one"**

When clicked, it reveals an inline form with:
- **Skill name** (text input, required)
- **Category** (select from the 4 standard categories)
- **Is Open Source** (toggle switch)

On submit, this inserts a new row into `skill_definitions` with:
- `status = 'new'`
- `ai_review_pending = true`
- `is_active = true`
- The chosen category, name, and `is_open_source` flag

The newly created skill is then auto-selected in the dropdown so the user can continue with their assessment without leaving the dialog.

A toast confirms: "Skill suggested and selected. An admin will review it."

#### 3. File changes

**Files to modify:**
- `src/components/skills-analysis/SkillAssessmentDialog.tsx` -- add suggest-skill UI and insert logic below the skill Select component

**Data operations (no migration needed):**
- INSERT "Supabase" into `skill_definitions`
- INSERT "Supabase" into `open_source_products`
- INSERT mapping into `product_skill_mappings`

### Technical Details

The suggest flow inserts directly into `skill_definitions` using the Supabase client. Since RLS on `skill_definitions` may restrict inserts to admin roles, we'll need to check the existing policy. If restricted, the insert will go through an edge function or we adjust the policy to allow authenticated users to insert with `status = 'new'` (pending review). This keeps the admin review workflow intact -- suggested skills appear with `ai_review_pending = true` and `status = 'new'` on the Admin Skills Review page where admins already manage skill statuses.

