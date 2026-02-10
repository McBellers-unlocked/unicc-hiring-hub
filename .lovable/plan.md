

# Improve Color Coding on Status Badges

## Problem
The Separation and Appointment status badges rely on generic Badge variants (`outline`, `secondary`) which render as plain grey. The STDA badges already use explicit color classes (blue for in-progress, green for completed, etc.) and look much better.

## Changes

### 1. `src/components/operations/SeparationStatusBadge.tsx` -- `SeparationStatusBadge`

Replace the variant-based approach with explicit color classes matching the STDA style:

| Status | Current Look | New Look |
|--------|-------------|----------|
| Completed | Green (already works) | Green -- `bg-green-100 text-green-800` |
| Cancelled | Grey secondary | Grey outline with muted text |
| Not started | Grey outline | Grey outline (unchanged) |
| In progress | Grey outline | Blue -- `bg-blue-100 text-blue-800` |
| X days remaining | Grey secondary | Amber/orange -- `bg-amber-100 text-amber-800` |
| Overdue | Red destructive | Red with icon -- `bg-red-100 text-red-800` + alert icon |

### 2. `src/components/operations/AppointmentStatusBadge.tsx` -- `AppointmentStatusBadge`

Same color mapping as above to keep all three operations pages visually consistent.

### No other files affected

The STDA badges already look good. The type badges and reason badges in all three pages already have proper colors.

## Technical Detail

Both components will switch from using the `variant` prop to using explicit `className` colors, similar to how `STDAStatusBadge` is built. This avoids the generic grey variants and gives each status a distinct, readable color.

