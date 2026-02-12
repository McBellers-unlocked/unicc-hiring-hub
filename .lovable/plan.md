

## Fix: Make the Offer Letter Dialog Actually Scrollable

### Root Cause

The `DialogContent` component has a base CSS class of `grid`, which overrides the `flex flex-col` being applied. In a `grid` layout, `flex-1` and `min-h-0` on the `ScrollArea` child have no effect, so the content just grows unbounded.

### Solution

Replace the `ScrollArea` with a simple `div` that has `overflow-y-auto` and an explicit `max-h-[60vh]`. This is the most reliable approach since it doesn't depend on flex/grid layout negotiations.

### Changes

**File: `src/pages/operations/AppointmentLifecycle.tsx`**

1. Remove `flex flex-col overflow-hidden` from DialogContent (not needed with this approach):
   ```
   <DialogContent className="max-w-2xl max-h-[85vh]">
   ```

2. Replace the `ScrollArea` wrapper (line 588) with a plain scrollable div:
   ```
   <div className="overflow-y-auto max-h-[60vh] pr-4">
   ```
   And close with `</div>` instead of `</ScrollArea>`.

This gives the form content a hard height cap of 60vh with native browser scrolling, which works regardless of the parent's layout mode.
