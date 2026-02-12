

## Fix: Make the Offer Letter Dialog Scrollable

The dialog already uses a `ScrollArea` component, but the scroll area has no bounded height because the flex layout isn't fully constrained. The fix is to add `overflow-hidden` to the `DialogContent` and ensure the `ScrollArea` gets a concrete `min-h-0` so flex shrinking works properly.

### Changes

**File: `src/pages/operations/AppointmentLifecycle.tsx`**

- On the `ScrollArea` (line 588), add `min-h-0` and a reasonable `max-h` fallback so the content actually scrolls within the dialog's `max-h-[85vh]` constraint. Specifically, change:
  ```
  <ScrollArea className="flex-1 pr-4">
  ```
  to:
  ```
  <ScrollArea className="flex-1 min-h-0 pr-4">
  ```
- On the `DialogContent` (line 567), add `overflow-hidden` to prevent content from breaking out of the flex container:
  ```
  <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
  ```

These two small CSS changes will allow the flex layout to properly constrain the scroll area, making the form scrollable within the dialog.

