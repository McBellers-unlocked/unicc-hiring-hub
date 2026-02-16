

## Fix: Handle Duplicate Skill Name in "Suggest New Skill"

### Problem
The "Suggest a new skill" form fails with a unique constraint error (`skill_definitions_name_key`) when the user tries to add a skill that already exists in the database (e.g., "Supabase" was already seeded).

### Solution
Update the `handleSuggestSkill` function in `SkillAssessmentDialog.tsx` to check for an existing skill with the same name (case-insensitive) before inserting. If found, auto-select it instead of inserting a duplicate.

### Technical Details

**File to modify:** `src/components/skills-analysis/SkillAssessmentDialog.tsx`

In `handleSuggestSkill`:
1. Before inserting, query `skill_definitions` for a matching name (case-insensitive using `.ilike('name', suggestName.trim())`)
2. If a match is found:
   - Add it to the local `skills` array if not already present
   - Auto-select it via `setSkillId`
   - Show a toast: "Skill already exists -- selected it for you."
   - Close the suggest form
3. If no match, proceed with the existing insert logic

This is a small change (~10 lines) in a single function.
