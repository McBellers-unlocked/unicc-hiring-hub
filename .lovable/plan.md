

## Improve Geographic Map & Replace Nairobi with Rome

### Problems
1. The current SVG continent paths are very crude blobs that don't look like real continents
2. Nairobi should be replaced with Rome

### Changes (single file: `src/components/skills-analysis/GeographicSkillsView.tsx`)

**1. Replace continent paths with realistic Natural Earth-style SVG outlines**
- Use detailed SVG path data for recognizable continent shapes (North America, South America, Europe, Africa, Asia, Australia) using a proper Mercator-like projection
- These will be hand-traced simplified but recognizable outlines -- much more detailed than the current ~5-point blobs, using proper coastline shapes
- Add graticule lines (latitude/longitude grid) as subtle background lines for a professional cartographic look
- Use a proper viewBox (e.g. `0 0 1000 500`) for better path precision

**2. Replace Nairobi with Rome**
- Change station name from "Nairobi" to "Rome"
- Update map coordinates to Rome's position (central Italy, roughly same longitude as Brindisi but slightly west/north)
- Keep the same staff count (15) and coverage (48%)
- Adjust skills/strengths/gaps to be more Italy-office appropriate (keep similar profile but update strengths to include "Data Analytics" and "Policy & Governance" fitting an Italian office)

**3. Adjust all station coordinates** to match the new higher-resolution viewBox so markers land correctly on the realistic map

**4. Visual polish**
- Add ocean background color (light blue tint)
- Add country border styling with slightly more contrast
- Round the SVG container corners

### Station coordinate updates (approximate for new projection)
- Valencia: southwestern Europe (Spain)
- Geneva: central-western Europe (Switzerland)  
- New York: US east coast
- Brindisi: southeastern Italy
- Rome: central Italy (new, replacing Nairobi)

All five stations are now in the Americas/Europe region, so the map can optionally focus more on the Atlantic region while still showing the full world.

### No other files affected
The component is self-contained with all dummy data inline.

