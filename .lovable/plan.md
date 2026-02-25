

## Set Default Map View to Atlantic/Europe Focus

### Problem
The map currently defaults to a fully zoomed-out world view. The user wants the default to be the zoomed-in Atlantic/Europe view shown in their screenshot, which better frames all 5 duty stations (New York, Valencia, Geneva, Brindisi, Rome).

### Change (single file: `src/components/skills-analysis/GeographicSkillsView.tsx`)

Update the initial `position` state from:
```typescript
{ coordinates: [0, 0], zoom: 1 }
```
to approximately:
```typescript
{ coordinates: [10, 40], zoom: 2.5 }
```

This centers the map on the mid-Atlantic at ~40°N latitude, with a zoom level that frames all stations from New York to Brindisi/Rome, matching the screenshot's framing.

Also update the `handleReset` function to reset to this same default view instead of `[0, 0], zoom: 1`.

### One-line change, one file affected.

