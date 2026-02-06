

# Visual Hierarchy Refinement for Stats Rows

## Current Issue
All three timeframe rows (This Week, This Month, Next 90 Days) use identical full-sized stats cards with the same visual weight. This creates an overwhelming, repetitive appearance where nothing stands out as primary.

## Solution: Progressive Visual De-emphasis

Create a clear hierarchy where **This Week** is the primary focus (most actionable), while **This Month** and **Next 90 Days** serve as secondary/tertiary planning views with progressively reduced visual prominence.

---

## Visual Design Approach

```text
THIS WEEK (Primary - Full prominence)
+====================+====================+====================+====================+====================+
|  ■ Appointments    |  ■ Separations     |  ■ Transfers       |  ■ STDAs Ending    |  ■ Extensions      |
|     2              |     1              |     0              |     3              |     0              |
|  New hires...      |  Exits & breaks    |  Location changes  |  Within 8 weeks    |  Coming soon       |
+====================+====================+====================+====================+====================+

THIS MONTH (Secondary - Compact, muted background)
┌──────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Appointments: 5  │  Separations: 3  │  Transfers: 2  │  STDAs Ending: 4  │  Extensions: 0          │
└──────────────────────────────────────────────────────────────────────────────────────────────────────┘

NEXT 90 DAYS (Tertiary - Inline, smallest)
┌──────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Appointments: 12  │  Separations: 8  │  Transfers: 4  │  STDAs Ending: 6  │  Extensions: 0         │
└──────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Details

### Approach: Modify StatsCard to Support Variants

Add a `variant` prop to StatsCard:

| Variant | Usage | Characteristics |
|---------|-------|-----------------|
| `default` | This Week | Full card with icon, large text, shadow, padding |
| `compact` | This Month / Next 90 Days | Single-row inline display, smaller text, no icon, minimal padding |

### StatsCard Changes

Add a `variant?: 'default' | 'compact'` prop:

**Default variant** (current behavior):
- Full card with `p-6` padding
- Large `text-3xl` value
- Icon on right side
- Full height

**Compact variant** (new):
- Inline layout with `p-3` padding
- Smaller `text-lg` value
- No icon (cleaner look)
- Single horizontal row
- Subtle background (`bg-muted/50`)

### Dashboard Layout Changes

**This Week:** Keep as-is with full StatsCards (primary focus)

**This Month & Next 90 Days:** 
- Wrap each row in a single muted Card container
- Use compact variant stats displayed inline
- Show as a horizontal bar rather than grid of individual cards

---

## Refined Render Structure

```tsx
{/* This Week - Primary Focus */}
<div className="space-y-2">
  <h3 className="text-sm font-semibold text-foreground">This Week</h3>
  <div className="grid grid-cols-5 gap-4">
    <StatsCard variant="default" ... />
    {/* 5 full cards */}
  </div>
</div>

{/* This Month - Secondary */}
<Card className="bg-muted/30 border-none shadow-none">
  <CardContent className="py-3 px-4">
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium text-muted-foreground">This Month</span>
      <div className="flex items-center gap-6">
        <StatsCard variant="compact" title="Appointments" value={5} />
        <StatsCard variant="compact" title="Separations" value={3} />
        <StatsCard variant="compact" title="Transfers" value={2} />
        <StatsCard variant="compact" title="STDAs Ending" value={4} />
        <StatsCard variant="compact" title="Extensions" value={0} />
      </div>
    </div>
  </CardContent>
</Card>

{/* Next 90 Days - Tertiary (same pattern) */}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/dashboard/StatsCard.tsx` | Add `variant` prop with `default` and `compact` options |
| `src/pages/operations/HROperationsDashboard.tsx` | Keep This Week as full cards, convert This Month and Next 90 Days to compact inline bars |

---

## StatsCard Variant Implementation

```tsx
interface StatsCardProps {
  // ... existing props
  variant?: 'default' | 'compact';
}

export default function StatsCard({ 
  variant = 'default',
  // ... other props
}: StatsCardProps) {
  
  if (variant === 'compact') {
    return (
      <button
        onClick={onClick}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors",
          "hover:bg-background/80",
          onClick && "cursor-pointer",
          alert && "text-destructive"
        )}
      >
        <span className="text-xs text-muted-foreground">{title}:</span>
        <span className={cn(
          "text-sm font-semibold",
          alert ? "text-destructive" : "text-foreground"
        )}>
          {value}
        </span>
      </button>
    );
  }

  // Default variant - existing full card implementation
  return (
    <Card ... >
      {/* existing implementation */}
    </Card>
  );
}
```

---

## Expected Result

- **This Week** remains prominent with full cards, icons, and shadows - the actionable focus
- **This Month** and **Next 90 Days** become subtle horizontal bars with inline stats
- Clear visual hierarchy: primary > secondary > tertiary
- Less visual noise while maintaining all the same data and clickability
- Dashboard feels lighter and more scannable

