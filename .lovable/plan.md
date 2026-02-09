

# Replace Soft Skills Textarea with Competency Picker

## What Changes

The current "Required Soft Skills" field in the Procurement TOR form is a free-text textarea. This will be replaced with a structured competency picker that shows the same **Core** and **Mandatory** competencies used in the hiring/selection workflow, allowing the user to select up to **6** competencies.

## Competency Lists (from existing selection workflow)

**Core Competencies:**
- Communication
- Teamwork and Collaboration
- Planning and Organizing
- Accountability
- Creativity
- Client Orientation
- Commitment to Continuous Learning
- Technological Awareness

**Management Competencies:**
- Leadership
- Vision
- Empowering Others
- Building Trust
- Managing Performance
- Judgement/Decision Making

**Leadership Competencies:**
- Strategic Direction
- Managing Change
- Building Coalitions
- Influencing
- Results Focus
- Innovation

## User Experience

- All competencies from all three categories (Core, Management, Leadership) are displayed as toggle buttons in a single section
- Users click to select/deselect competencies
- A counter shows "X / 6 selected"
- Once 6 are selected, remaining unselected buttons become disabled
- Selected competencies are visually highlighted

## Technical Details

### Form Data Change
- `required_soft_skills` changes from a `string` to a `string[]` (array of competency names)
- Stored in the database as a JSON string (same `text` column, no schema change needed)
- On load, parse from JSON; on save, serialize to JSON

### File Changes

**`src/pages/ProcurementTORForm.tsx`**
- Replace the "Required Soft Skills" `<Textarea>` with a competency picker UI
- Import the competency constants from `CompetenciesList.tsx` (or define inline to keep it simple)
- Update `formData.required_soft_skills` from `string` to `string[]`
- Update the save logic to `JSON.stringify()` the array
- Update the load logic to `JSON.parse()` the stored value
- Add a max-6 selection enforcement with visual counter

No database migration needed -- the column remains `text` and will store a JSON array string.

