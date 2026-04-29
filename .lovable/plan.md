I’ll update the Organization Chart so it is cleaner, division-segmented, includes affiliates, and supports collapsible branches.

Implementation plan:

1. Data source and filtering
   - Keep using `users_clean` as the main source, matching the Analytics/Userbase page.
   - Include both Staff and Affiliate records from `users_clean`.
   - Exclude records that do not have a real reporting line, while still keeping Sameer Chauhan as the required top/root record even though his `line_manager` is blank.
   - Treat blank, `-`, and whitespace-only `line_manager` values as missing.
   - For affiliates, display their affiliate/personnel type but suppress the grade badge/grade display.

2. Hierarchy behavior
   - Keep Sameer Chauhan at the top of the complete chart.
   - Build reporting relationships using the existing robust name-matching logic.
   - Stop attaching unrelated/orphaned personnel to Sameer just to keep them visible; disconnected records without a valid path/reporting line will be excluded from the rendered chart.
   - Preserve child sorting alphabetically within each manager.

3. Division segmentation
   - Add a division-segmented presentation mode to the page.
   - Show separate chart sections/cards per division (for example DO, DD, CS, DS, MS, OP), each using the hierarchy filtered to that division and retaining manager ancestors where needed so the reporting path remains understandable.
   - Keep the existing division dropdown usable for focusing on one division, but make the default “All” view render division segments rather than one overwhelming mixed chart.
   - Update stats/breakdown to count only included chart records, not excluded records without reporting lines.

4. Visual cleanup for readability
   - Redesign org chart node cards with wider boxes and more vertical room.
   - Remove aggressive name truncation; use wrapping/line-clamp behavior so names like “KRAVITZ, Ms Meredith Rachel” are readable.
   - Prefer a cleaned display name format for chart labels, e.g. `Meredith Rachel KRAVITZ`, while preserving the full source details in the dialog where useful.
   - Increase font size/contrast for names and simplify badges so the name remains the primary visible element.
   - Increase `react-d3-tree` node spacing to match the larger readable boxes.

5. Collapsible boxes
   - Enable explicit collapse/expand controls on each node with children.
   - Use `react-d3-tree`’s built-in `toggleNode` support in the custom node renderer.
   - Make clicking the expand/collapse control toggle children, while clicking the main card still opens the person detail dialog.
   - Add a small direct-report count indicator so users know which boxes can expand.

Technical files to update:
- `src/lib/orgChartUtils.ts`
  - Add helpers for display-name cleanup, affiliate detection, missing reporting-line detection, strict tree construction, and division-preserving filtering.
  - Remove/replace the current orphan-attachment fallback.

- `src/pages/OrganizationChart.tsx`
  - Include affiliates from `users_clean`, map affiliate records without grade, filter out records without reporting lines except Sameer, and render segmented division chart cards for the default All view.

- `src/components/org-chart/OrganizationChart.tsx`
  - Pass `toggleNode` into the custom node component, enable collapsibility, and adjust tree spacing/zoom defaults for larger readable cards.

- `src/components/org-chart/OrgChartNode.tsx`
  - Redesign node visuals, wrap names, hide grade for affiliates, and add a clear expand/collapse control.

- `src/components/org-chart/OrgChartControls.tsx` if needed
  - Adjust labels/help text to reflect division segmentation and included personnel types.