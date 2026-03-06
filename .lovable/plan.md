## Rebrand: UNICConnect → UNIQTalent

This is a comprehensive rebrand touching the logo, app name references, and brand colors across the entire codebase.

### Brand Color Analysis

The uploaded logo shows "UNIQ" in a bold cyan/blue (#009CDE approximate) and "Talent" in black, with "Powered by UNICC" beneath. The primary brand blue needs to shift from the current UNICC blue (#006cb5, hsl 204 100% 35%) to a brighter cyan-blue matching the logo (~#009CDE, hsl 197 100% 44%).

### Scope of Changes

**1. Copy the new logo into the project**

- Copy `user-uploads://uniccsub_UNIQTalent_@2x-8.png` to `public/assets/uniqtalent_logo.png`

**2. Update the Logo component (`src/components/UNICCLogo.tsx`)**

- Rename file content: `UNICCLogo` → `UNIQTalentLogo` (or keep the component name and just swap the image path — renaming the file would require updating 20+ imports, so simpler to keep filename and just update the image reference and alt text)
- Point to the new logo image
- Update alt text to "UNIQTalent Logo"

**3. Update brand colors (`src/index.css`)**

- Change primary from `204 100% 35%` to `197 100% 44%` (matching the logo cyan-blue)
- Update related UNICC color utilities to match
- Keep dark mode adjustments proportional

**4. Update `index.html**`

- Title: "UNIQTalent" instead of "UNICConnect"
- Meta descriptions, OG tags, favicon references

**5. Update UI text references across components (~15 files)**

Key files with visible "UNICConnect" or "UNICC" branding text:

- `src/components/Layout.tsx` — header brand name, footer text, privacy link text
- `src/pages/Auth.tsx` — login page title "UNICConnect"
- `src/pages/VideoInterview.tsx` — header brand name
- `src/pages/ProductSpec.tsx` — title and references
- `src/components/dashboard/DualRoleDashboard.tsx` — storage key
- `src/pages/OrganizationChart.tsx` — download filename
- `src/pages/VideoEmailTemplateSettings.tsx` — default from name

**6. Update Edge Function email templates (~10 functions)**

These contain hardcoded "UNICC" in sender names and logo URLs:

- `send-job-alert` — from name
- `send-director-approval-notification` — from name, logo URL
- `send-vacancy-published-notification` — from name, logo URL
- `send-bulk-talent-email` — from name
- `send-assessment-invite` — logo URL, alt text
- `send-chief-pd-approval-notification` — logo URL
- `send-chief-hr-review-notification` — logo URL
- `send-hm-review-reminder` — logo URL
- `send-requisition-notification` — logo URL
- `notify-local-admin` — logo URL
- `send-video-invite` — privacy notice link text

Note: References to "UNICC" as the *organization name* (e.g., in competency definitions, work experience entries like "United Nations International Computing Centre (UNICC)") should NOT be changed — those refer to the actual organization, not the product name. Only product/platform branding references will be updated.

### Technical Details

- ~86 files contain "UNICC" but many are organizational references (competency text, org names) that should stay
- ~33 files contain "UNICConnect" or "HireFlow" — all should be renamed to "UNIQTalent"
- The logo component is imported in ~20 files but we can avoid renaming the file/export to minimize churn — just update the image path and alt text inside the component
- Edge functions with logo URLs currently point to hosted UNICC logos — these URLs will need to be updated once a new logo is hosted (can use the Supabase storage URL pattern)