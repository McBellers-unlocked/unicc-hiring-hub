

## Geographic Skills Heatmap

### Overview
Add a new "Geographic" tab to the Skills Analysis page with an interactive map showing duty station skill health, plus a comparison matrix below.

### New Files

**`src/components/skills-analysis/GeographicSkillsView.tsx`**
Main component containing:

1. **SVG World Map** -- A custom lightweight SVG (no external library needed) showing a simplified world outline with 5 duty station markers positioned at approximate coordinates:
   - Valencia (HQ) -- 120 staff
   - Geneva -- 45 staff
   - New York -- 30 staff
   - Brindisi -- 25 staff
   - Nairobi -- 15 staff

2. **Station circles**: Size proportional to staff count. Color based on coverage health:
   - Green (>70%): Valencia, Geneva
   - Amber (40-70%): New York, Nairobi
   - Red (<40%): Brindisi

3. **Popover on click** (using existing Popover component): Station name, total staff, top 3 strongest skills, top 3 critical gaps, coverage percentage

4. **Comparison table below the map**:
   - Rows = 5 duty stations
   - Columns = top 10 most critical skills (mix of technical, behavioral, emerging)
   - Cells = staff count with color coding (green = adequate, amber = partial, red = gap)

**Dummy data approach:**
- Hardcoded station profiles with staff counts and skill distributions
- Valencia strong on technical (cloud, DevOps, cybersecurity) but weak on behavioral (leadership, communication)
- Brindisi weak on cloud/AI skills
- Nairobi moderate gaps across the board
- Geneva strong on governance/policy skills
- New York strong on strategic/diplomatic skills
- 10 representative skills selected across categories for the matrix

### Changes to Existing Files

**`src/pages/SkillsAnalysis.tsx`**
- Import `GeographicSkillsView` and `Globe` icon from lucide-react
- Add a new tab trigger "Geographic" (value `"geographic"`) with Globe icon, visible to managers
- Add corresponding `TabsContent` rendering `GeographicSkillsView`

### Technical Detail

```text
GeographicSkillsView
├── Card: "Geographic Skills Dashboard"
│   ├── SVG Map (~400px tall)
│   │   ├── World outline paths (simplified continents)
│   │   └── 5 interactive circles with Popover triggers
│   │       └── Popover: station summary card
│   └── Comparison Matrix (Table)
│       ├── Header: Station | Skill1 | Skill2 | ... | Skill10
│       └── 5 rows with color-coded cells
└── No external dependencies (pure SVG + existing UI components)
```

The map will use inline SVG continent outlines (simplified paths for Europe, Africa, Americas) rather than adding a new dependency. Each duty station is a `<circle>` wrapped in a Popover trigger. This keeps the bundle lean and avoids `react-simple-maps` dependency overhead.

