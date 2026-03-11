

## Clone Lifecycle Page as Onboarding Page

### What to do

1. **Create `src/pages/AffiliateOnboarding.tsx`** — Copy of `AffiliateLifecycle.tsx` with these changes:
   - Title: "Onboarding Management" instead of "Lifecycle Management"
   - Subtitle: "First contract workflow" instead of "Contract onboarding workflow"
   - Route uses `/onboarding/` instead of `/lifecycle/`

2. **Add route in `src/App.tsx`**:
   - Import `AffiliateOnboarding`
   - Add route: `/admin/affiliate-personnel/:id/onboarding/:recordNumber`

Everything else (timeline, checklist, Launch PR, contract info) remains identical.

