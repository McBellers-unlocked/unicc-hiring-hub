

## Remove Dividing Line in Video Interview/Written Assessment Box

The Video Interview/Written Assessment section currently has a two-column grid layout (lines 163-188) with "Format" and "Tips for Success" side by side, which creates a visual divider between them.

### Change

In `src/pages/HiringProcessGuide.tsx`, replace the two-column grid (`grid md:grid-cols-2`) with a single-column stack layout, so the "Format" and "Tips for Success" sub-sections appear one below the other without a line/gap between them. This gives the card a cleaner, unified look.

