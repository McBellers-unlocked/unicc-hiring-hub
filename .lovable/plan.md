

## Add Skill Column Selector to Comparison Matrix

### Current State
The Skills Comparison Matrix uses a hardcoded `SKILLS` array of 10 skill names. The station data also has hardcoded counts per skill. There's no connection to the database's `skill_definitions` table.

### Plan

**File: `src/components/skills-analysis/GeographicSkillsView.tsx`**

1. **Fetch all skills from the database**: Use a `useQuery` hook to load all active skill definitions from `skill_definitions` table (`id`, `name`, `category`), ordered by category then name.

2. **Add selectable column state**: Replace the static `SKILLS` array with a `selectedSkills` state initialized to the first 10 skills from the database (or the current hardcoded defaults if they exist in the DB).

3. **Replace each column header with a dropdown**: Each `<TableHead>` becomes a `<Select>` (from `@radix-ui/react-select` / shadcn) showing the current skill name. The dropdown lists all available skills from the database, grouped by category. Selecting a different skill swaps that column. Already-selected skills are visually marked/disabled to prevent duplicates.

4. **Adapt station skill data**: Since station data is dummy/hardcoded, generate random `count/required` values for any skill not in the original hardcoded set. Use a seeded approach (based on station name + skill name) so values stay consistent across re-renders.

5. **Styling**: Keep the dropdown compact (small text, minimal padding) to fit the table header. Use the existing shadcn `Select` component with a `z-50` popover to avoid transparency issues.

### Technical Details

- Query: `supabase.from('skill_definitions').select('id, name, category').eq('is_active', true).order('category').order('name')`
- State: `const [selectedSkills, setSelectedSkills] = useState<string[]>([])` — initialized once data loads
- Each column header renders a `<Select>` with `onValueChange` that swaps the skill at that column index
- For dummy data generation when a skill isn't in the hardcoded map: use a simple hash of `stationName + skillName` to produce deterministic count/required values proportional to the station's staff size

