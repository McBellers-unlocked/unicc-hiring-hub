

# Move Affiliate Personnel to HR Operations Dropdown

## Changes in `src/components/Layout.tsx`

1. **Remove** the Affiliate Personnel menu item from the "Manage" dropdown (lines 181-186)
2. **Add** a `DropdownMenuSeparator` and the Affiliate Personnel item at the end of the "HR Operations" dropdown, after the Document Repository item (before line 313)

This creates a small subsection at the bottom of HR Operations containing the Affiliate Personnel link, visually separated from the other items.

