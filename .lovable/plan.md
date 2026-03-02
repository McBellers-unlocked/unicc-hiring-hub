

## Fix Profile Photo Display

The issue is that the `AvatarImage` component uses `aspect-square h-full w-full` but lacks `object-cover`, so the photo stretches unnaturally within the circular frame instead of cropping to fill it naturally (like LinkedIn does).

### Changes

**`src/components/ui/avatar.tsx`** — Add `object-cover` to the default `AvatarImage` class so all avatars crop properly:
- Change `"aspect-square h-full w-full"` → `"aspect-square h-full w-full object-cover"`

This single change ensures the photo fills the circle naturally with proper cropping, matching how LinkedIn and other professional platforms display profile photos.

