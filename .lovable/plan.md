

## OSS Skill Notification Email to OSPO

### Overview
When a user adds an open source skill to their profile (via the Skill Assessment Dialog), automatically send a branded notification email to ospo@unicc.org (CC: martinezm@unicc.org, bennette@unicc.org) informing the OSPO that a staff member has added an OSS skill, with a "View Profile" button.

### Changes

#### 1. New Edge Function: `supabase/functions/notify-oss-skill-added/index.ts`

A dedicated edge function that sends a branded HTML email matching the assessment invite template style:

- **To**: ospo@unicc.org
- **CC**: martinezm@unicc.org, bennette@unicc.org
- **From**: UNICC Talent `<recruitment@unicconnect.org>` (matches existing pattern)
- **Subject**: "OSS Skill Added: [Skill Name] -- [Staff Name]"
- **Body** (branded HTML matching assessment invite template):
  - UNICC logo header (from staging.unicconnect.org per branding standards)
  - Navy heading (#1a365d): "Open Source Skill Added"
  - Text: "[Staff Name] has added the open source skill **[Skill Name]** ([Category]) to their profile."
  - Info box (blue left-border style matching assessment template) with skill details: name, category, date added
  - Blue CTA button (#3182ce): "View Profile" linking to `/candidate-profile/[userId]`
  - Footer: "Best regards, UNICC Human Resources"
- Uses RESEND_API_KEY (already configured) via the Resend API directly (same pattern as `send-assessment-invite`)

**Request payload:**
```json
{
  "staffName": "Jane Doe",
  "staffEmail": "doej@unicc.org",
  "skillName": "Kubernetes",
  "skillCategory": "Technical & Domain",
  "userId": "uuid-here"
}
```

#### 2. Update `supabase/config.toml`

Add JWT verification bypass for the new function:
```toml
[functions.notify-oss-skill-added]
verify_jwt = false
```

#### 3. Update `src/components/skills-analysis/SkillAssessmentDialog.tsx`

After a successful skill assessment save (around line 237, after the candidates sync block), add a check:
- If `selectedSkill.is_open_source === true`, invoke the new edge function with the staff member's name, email, skill name, skill category, and user ID
- This is a fire-and-forget call (don't block the UI or show errors if notification fails -- just log)
- Only triggers on new assessments (not updates to existing ones) to avoid duplicate notifications

### Technical Details

**Files to create:**
1. `supabase/functions/notify-oss-skill-added/index.ts` -- new edge function

**Files to modify:**
1. `supabase/config.toml` -- add function config
2. `src/components/skills-analysis/SkillAssessmentDialog.tsx` -- trigger notification after saving an OSS skill

**No database changes needed.** The RESEND_API_KEY secret is already configured.

