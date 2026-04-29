I’ll revise the Organization Chart changes so the chart is no longer segmented into separate division cards, and division filtering only shows records that truly belong to the selected division.

Implementation plan:

1. Remove division segmentation from the page
   - Stop rendering one chart card per division when the Division filter is set to “All”.
   - Render a single org chart again for both “All” and selected divisions.
   - Remove the `segmentedTrees` logic from `src/pages/OrganizationChart.tsx`.
   - Remove the unused `getDivisionSegmentTree` import and helper if it is no longer needed.

2. Fix incorrect records appearing in division filters
   - Change the division filter behavior so selecting a division does not include people from other divisions merely because they are ancestors/managers of matching records.
   - For example, if Milena GRECUCCIO is marked as DO in `users_clean`, she will not appear when CS is selected.
   - Keep Sameer Chauhan as the required top/root node only when needed to anchor the filtered chart, but avoid showing unrelated non-matching personnel in the filtered result.

3. Preserve readable hierarchy without cross-division leakage
   - For a selected division, build the chart from the same Userbase source (`users_clean`) but restrict displayed personnel to:
     - Sameer Chauhan as the top anchor, and
     - personnel whose `division` exactly matches the selected division, and
     - only valid reporting relationships among those displayed records.
   - If a selected-division employee reports through a manager from another division, that non-matching manager will not be displayed as a normal record. The employee will remain under the closest valid displayed manager if available, otherwise under Sameer as the division anchor.
   - This keeps filtering accurate by division while still producing a usable chart.

4. Keep previous accepted improvements
   - Continue excluding personnel without valid reporting lines, except Sameer Chauhan.
   - Continue including affiliates, with grade hidden for affiliate records.
   - Keep the improved node readability and collapsible boxes.
   - Keep the existing Division dropdown as a filter, not as a segmentation control.

Technical files to update after approval:
- `src/pages/OrganizationChart.tsx`
  - Remove segmented rendering and compute a single filtered tree.
  - Make stats and breakdown reflect the currently displayed tree.

- `src/lib/orgChartUtils.ts`
  - Replace the current division filtering logic with a strict division-filter strategy that prevents non-matching personnel from appearing.
  - Remove or leave unused segmentation helper only if no longer referenced.

- `src/components/org-chart/OrgChartControls.tsx` if needed
  - Keep labels simple: Division remains a filter, not a segmentation mode.