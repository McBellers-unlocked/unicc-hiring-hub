

## Populate Future Readiness Card with Dummy Data

### Problem
The FutureReadinessCard currently relies on real database queries that return empty/zero results, so it shows 0% with no useful content. Need to populate it with realistic dummy data including a 67% score, trend sparkline, and skill-area breakdown.

### Changes (single file: `src/components/skills-analysis/FutureReadinessCard.tsx`)

**Replace the database-driven logic with hardcoded dummy data** that always renders a working state:

1. **Score display**: 67% with amber/warning styling — adjust `getReadinessLevel` thresholds so 60-74 maps to an amber "Good Progress" level instead of green "Excellent"
2. **Staff count**: "87 of 130 assessed"
3. **Trend sparkline**: A small inline SVG polyline showing 6-month improvement: 45% → 52% → 55% → 61% → 64% → 67%, with month labels underneath
4. **Skill-area breakdown** replacing the current "Emerging Skills / New Skills" grid:
   - AI & Machine Learning: 42% ready
   - Cloud Infrastructure: 71% ready
   - Data Analytics: 78% ready
   - Cybersecurity: 65% ready
   - DevOps & Automation: 58% ready
   - Each row: skill name on the left, percentage on the right, horizontal `Progress` bar below

5. **Remove** the `useEffect`/`fetchReadinessData` database calls and the `emergingSkillIds` memo — replace with simple constants
6. **Keep** the card header, `Rocket` icon, and overall card structure

### Styling Details
- The 67% score gets amber treatment: `text-yellow-600` label saying "Good Progress" with `TrendingUp` icon
- The main progress bar uses a yellow/amber indicator class
- The sparkline is a simple SVG (~120×40px) with a green-to-amber gradient stroke
- Each breakdown row is compact: flex row with name, percentage, and a thin `Progress` bar (h-2)

### No other files affected.

