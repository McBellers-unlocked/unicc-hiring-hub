

## Use a Real World Map with react-simple-maps

### Problem
The current hand-drawn SVG paths are unrecognizable blobs. The user wants a real map with actual country outlines.

### Approach
Install `react-simple-maps` which bundles a proper Natural Earth TopoJSON world map with real country boundaries, coastlines, and projections. This gives a professional, immediately recognizable map with zero manual path drawing.

### Changes

**1. Add dependency: `react-simple-maps`**
- Provides `ComposableMap`, `Geographies`, `Geography`, `Marker` components
- Uses built-in Natural Earth 110m TopoJSON (no extra files needed)
- Supports proper map projections (Mercator, EqualEarth, etc.)

**2. Rewrite `src/components/skills-analysis/GeographicSkillsView.tsx`**

Replace the entire SVG section with:
- `ComposableMap` with a `geoEqualEarth` or `geoMercator` projection
- `Geographies` rendering real country outlines from the bundled TopoJSON URL (`https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json`)
- `Marker` components at real lat/lon coordinates for each station:
  - Valencia: [-0.3763, 39.4699]
  - Geneva: [6.1432, 46.2044]
  - New York: [-74.006, 40.7128]
  - Brindisi: [17.9369, 40.6326]
  - Rome: [12.4964, 41.9028]
- Each marker renders a sized/colored circle (same logic as now)
- Wrap markers in Popover triggers (same popover content as now)
- Labels shown on hover only (remove persistent text labels)
- Ocean background via ComposableMap style
- Countries filled with muted color, stroked with border color

**3. Keep everything else unchanged**
- Station data array (names, staff, coverage, skills, strengths, gaps) stays identical
- Health color logic stays identical
- Comparison matrix table below stays identical
- Only `mapX`/`mapY` fields replaced with `lng`/`lat` fields

### Technical Detail
```text
GeographicSkillsView (rewritten map section)
├── ComposableMap (projection: geoEqualEarth, width: 800, height: 450)
│   ├── Geographies (from world-atlas CDN TopoJSON)
│   │   └── Geography per country (fill: muted, stroke: border)
│   └── Marker per station (at real lat/lon)
│       ├── Popover trigger wrapping <circle>
│       ├── Circle size = sqrt(staff) * 2.5
│       ├── Circle color = health color
│       └── Tooltip/label on hover only
├── Same legend (Healthy/Moderate/Critical)
└── Same comparison matrix table below
```

### Single file affected
`src/components/skills-analysis/GeographicSkillsView.tsx` -- full rewrite of the map section, keep table section intact.

