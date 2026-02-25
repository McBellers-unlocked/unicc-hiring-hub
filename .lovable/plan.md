

## Add Zoom Controls to the Map

### Problem
Currently there's no way to zoom into the map — browser zoom affects the whole page.

### Approach
Add pan-and-zoom functionality using `react-simple-maps`' `ZoomableGroup` component, which is built-in and wraps the map content to enable mouse wheel zoom and drag panning. Add +/- zoom buttons overlaid on the map corner and a reset button.

### Changes (single file: `src/components/skills-analysis/GeographicSkillsView.tsx`)

1. **Import `ZoomableGroup`** from `react-simple-maps`
2. **Add zoom state**: `position` state tracking `{ coordinates: [0, 0], zoom: 1 }`
3. **Wrap map content** (`Geographies` + `Marker`s) inside `<ZoomableGroup>` with:
   - `zoom={position.zoom}` and `center={position.coordinates}`
   - `onMoveEnd` handler to update position state
   - Min zoom: 1, max zoom: 8
4. **Add overlay zoom controls**: A small button group (absolute-positioned in the bottom-right corner of the map container) with:
   - **+** button: increment zoom
   - **−** button: decrement zoom  
   - **Reset** button: reset to default view
5. **Scale marker radius** inversely with zoom so markers don't become huge when zoomed in (divide radius by `sqrt(zoom)`)

### No other files affected

