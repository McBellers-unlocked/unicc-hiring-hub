## Populate Skill Assessments for Frederic LAVAL's Team

### Current State

- **Frederic LAVAL** (e274ffe9): 2 assessments, 20 skills listed
- **Anna AISENBREY** (bfa43acb): 0 assessments, 0 skills listed
- **Anna NEGYESI-MOUYSSET** (da6f4a98): 26 assessments (all self=4, required=4, no manager assessment)
- **Olga LEHTINEN** (f3d7df97): 5 assessments, 36 skills listed

&nbsp;

and his wider hieracrchy (Diego, Esther, Matthew, Amalia, Francesca, Isabel, Lucia etc.)

&nbsp;

### Plan

**1. Update Anna AISENBREY's skills on the users table**
Add a set of HR-relevant skills (subset of team skills) so she appears in skill views.

**2. Insert/upsert skill_assessments for all 4 team members**
For ~15-20 shared HR skills per person, insert approved assessments with `required_level` set consistently (e.g., 3 or 4 per skill), and varied `self_assessment` + `manager_assessment` to create a realistic distribution:


| Gap Pattern    | Distribution | Example (required=4) |
| -------------- | ------------ | -------------------- |
| Exceeding (+2) | ~10%         | self=5, manager=6    |
| Exceeding (+1) | ~20%         | self=5, manager=5    |
| Meeting (0)    | ~35%         | self=4, manager=4    |
| Minor gap (-1) | ~25%         | self=3, manager=3    |
| Gap (-2)       | ~10%         | self=2, manager=2    |


Each person gets a different mix so analytics show variation across the team.

**3. Update existing Anna N assessments** to add `manager_assessment` values (currently all null) with the same varied pattern.

### Technical Details

- Use the Supabase insert/update tool for all data operations (no migrations)
- All assessments set to `status: 'approved'`, `scope: 'team'`
- Skills mapped via existing `skill_definitions` IDs
- Required levels consistent across team (same role expectations)