

# Fix Competency Picker with Correct PD Competencies and Definitions

## What Changes

Replace the current competency toggle buttons in the TOR form with the exact competencies and definitions from the Position Description form (`JobRequisitionForm.tsx`).

## Competencies with Full Definitions

### Mandatory Competencies (read-only, always included)
- **Teamwork**: Develops and promotes effective relationships with colleagues and team members. Deals constructively with conflicts.
- **Communicating**: Expresses oneself clearly in conversations and interactions with others; listens actively. Produces effective written communications. Ensures that information is shared.
- **Respecting and promoting individual and cultural differences**: Demonstrates the ability to work constructively with people of all backgrounds and orientations. Respects differences and ensures that all can contribute.

### Core Competencies (selectable)
- **Knowing and managing yourself**: Manages ambiguity and pressure in a self-reflective way. Uses criticism as a development opportunity. Seeks opportunities for continuous learning and professional growth.
- **Producing results**: Produces and delivers quality results. Is action oriented and committed to achieving outcomes.
- **Moving forward in a changing environment**: Is open to and proposes new approaches and ideas. Adapts and responds positively to change.
- **Setting an example**: Acts within UNICC's / WHO's professional, ethical and legal boundaries and encourages others to adhere to these. Behaves consistently in accordance with clear personal ethics and values.

### Management Competencies (selectable)
- **Ensuring effective use of resources**: Identifies priorities in accordance with UNICC's strategic directions. Develops and implements action plans, organizes the necessary resources and monitors outcomes.
- **Building and promoting partnerships across the Organization and beyond**: Develops and strengthens internal and external partnerships that can provide information, assistance and support to UNICC. Identifies and uses synergies across the Organization and with external partners.

### Leadership Competencies (selectable)
- **Driving UNICC to a successful future**: Demonstrates a broad-based understanding of the growing complexities of ICT issues and activities. Creates a compelling vision of shared goals, and develops a roadmap for successfully achieving real progress in improving ICT services.
- **Promoting innovation and Organizational learning**: Invigorates the Organization by building a culture which encourages learning and development. Sponsors innovative approaches and solutions.
- **Promoting UNICC's position**: Positions UNICC as a leader in ICT services. Gains support for UNICC's mission. Coordinates plans and communicates in a way that attracts support from intended audiences.

## UI Layout

1. **Mandatory Competencies** -- displayed as a read-only list in a muted background box, each with bold name and definition text. These are always included automatically.

2. **Selectable Competencies** -- grouped under Core, Management, and Leadership headings. Each competency shown as a toggle button/pill displaying the **name**. When hovered or selected, the full **definition** is shown below the name. A counter badge shows "X / 6 selected" with max 6 enforcement across all three groups.

## Technical Details

### File: `src/pages/ProcurementTORForm.tsx`
- Replace the three competency group arrays (lines ~249-252) with the correct competencies and definitions from above
- Add a read-only "Mandatory Competencies" block before the selectable section
- Each toggle button shows the competency name; the definition appears as smaller text beneath the name within the button or as a tooltip
- Keep the existing max-6 selection logic and JSON serialization
- No database changes needed

