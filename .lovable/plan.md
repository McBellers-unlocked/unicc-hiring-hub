

## Replace Shadow with White Text Outline on "UNIQ"

**File**: `src/components/Layout.tsx` (line 70)

Replace the `textShadow` glow with a CSS text-stroke outline:

```tsx
<span style={{ WebkitTextStroke: '0.5px rgba(255,255,255,0.8)' }}>UNIQ</span>
```

This gives a thin white contour without the soft glow effect.

