

## Add UNIQtalent Branded Header to Public Strategy Tracker View

### What
Replace the current simple header in the public management view (`StrategyTrackerPublic.tsx`) with the branded UNIQtalent header that matches the main application's header styling.

### Implementation

**File: `src/pages/StrategyTrackerPublic.tsx`**

1. **Import the UNICCLogo component** at the top of the file.
2. **Replace the current header** (lines 122-126) with a branded header matching `Layout.tsx`:
   - Dark blue background (`#006cb5`)
   - UNICCLogo on the left
   - "UNIQ" text with white stroke outline + "Talent" in white
   - Subtitle showing "HR Strategy Tracker — Read-only view"
3. **Keep the header fixed/simple** — no navigation menu since this is a public read-only view.

### Header Design
```
┌─────────────────────────────────────────────────┐
│  [Logo]  UNIQ Talent        HR Strategy Tracker │
│                             Read-only view      │
└─────────────────────────────────────────────────┘
```

This brings brand consistency between the public view and the main application while keeping the read-only nature clear.

