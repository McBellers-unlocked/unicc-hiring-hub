

## Fix Header Still Cut Off on Right Side

The header background stops before the right edge because content somewhere in the page is wider than the viewport, causing horizontal overflow. The header is set to its natural width but doesn't stretch to cover the scrollable overflow area.

**Fix**: Add `overflow-x: hidden` to the root container to prevent any content from causing horizontal scroll, and ensure the header stretches full width.

**Changes in `src/components/Layout.tsx`** (line 62):
```
<div className="min-h-screen bg-background overflow-x-hidden">
```

This prevents any child content from creating horizontal overflow that would leave the header background short of the right edge.

