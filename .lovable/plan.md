

## Add "Analytics" Section to Top Navigation Bar

### What
Create a new "Analytics" dropdown in the top bar, positioned between "HR Operations" and "My Career". Move "Import Staff List" and "Hiring Analytics" out of the "Manage" dropdown into this new section.

### Changes — `src/components/Layout.tsx`

**1. Remove from "Manage" dropdown:**
- Remove the `Import Staff List` item (lines 186–191)
- Remove the `Hiring Analytics` item (lines 192–197)

**2. Add new "Analytics" dropdown after "HR Operations" (after line 315, before "My Career"):**
- Visibility: gated by `hasAdminAccess` (same as current Manage section access)
- Trigger icon: `BarChart3` (already imported, matches "analytics" semantics and is consistent with the existing nav icon style)
- Trigger label: "Analytics" with `ChevronDown`
- Dropdown items (in order):
  - `Hiring Analytics` → `/analytics` with `BarChart3` icon
  - `Import Staff List` → `/admin/import-staff-list` with `Upload` icon
- Styling: identical classes to the surrounding dropdowns (`hover:text-[#009EDB]`, popover styling, etc.)

### Result
- "Manage" dropdown is leaner (no analytics/import items)
- New top-bar entry order: Dashboard · Jobs · Life at UNICC · Pipeline · Manage · Applications · HR Operations · **Analytics** · My Career
- Routes, permissions, and icons preserved — purely a reorganization

