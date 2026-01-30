
Goal
- Fix “duplicate key value violates unique constraint job_requisitions_slug_key” when creating a new full Position Description (Job Requisition) with a title that already exists (e.g., “Senior Software Developer”), including cases where titles will legitimately repeat.

What’s happening (root cause)
- We already added unique-slug generation to InitialRequestForm (initial request drafts/submissions).
- The same unique-slug logic is NOT implemented in the “full Position Description” creation flow.
- In `src/pages/JobRequisitionForm.tsx`, the “Create new requisition” branch inserts `slug: baseSlug` without checking if it already exists, so duplicates fail immediately when the same title was used before.

Where the bug is
- `src/pages/JobRequisitionForm.tsx`, in the “Create new requisition with slug” section:
  - It computes `baseSlug` and inserts it directly:
    - `.insert({ ..., slug: baseSlug, ... })`
  - No collision detection / suffixing.

Plan (code changes)
1) Update JobRequisitionForm to generate a unique slug before insert
- File: `src/pages/JobRequisitionForm.tsx`
- Changes:
  - Import `generateUniqueSlug` from `@/lib/utils` (similar to InitialRequestForm).
  - Before inserting:
    - Generate `baseSlug` from `position_title`.
    - Query existing slugs matching the pattern:
      - `select('slug').like('slug', \`\${baseSlug}%\`)`
    - Build `slugList` from results.
    - Compute `finalSlug`:
      - If `slugList` already contains `baseSlug`, call `generateUniqueSlug(baseSlug, slugList)`
      - Else use `baseSlug`
  - Insert with `slug: finalSlug`.

2) Add a small safety net for race conditions (optional but recommended)
- Still in `src/pages/JobRequisitionForm.tsx`
- If the insert fails with the unique constraint error anyway (e.g., two people submit at the same time):
  - Catch the error and:
    - Re-fetch matching slugs
    - Regenerate a fresh `finalSlug`
    - Retry insert once
  - If it still fails, surface a clearer message (e.g., “A requisition with this title was just created by someone else; please try again.”)

3) (Optional hardening) Improve InitialRequestForm’s slug lookup error handling
- File: `src/pages/InitialRequestForm.tsx`
- Right now it ignores the `error` returned from the “matching slugs” query.
- Add:
  - If slug lookup query returns an error, throw it (or fall back to the same “retry on unique constraint” pattern).
- This won’t change normal behavior, but it prevents silent failures if permissions ever change.

Verification / how we’ll confirm it’s fixed
1) Reproduce in Test (staging/preview)
- Log in as `valente@unicc.org`
- Go to Requisitions → create a new full PD
- Use a title that already exists, like “Senior Software Developer”
- Expected result:
  - Save/Submit succeeds
  - The created requisition has a slug like:
    - `senior-software-developer` (if none exists)
    - `senior-software-developer-2` (if already used)
    - `senior-software-developer-3`, etc.

2) Confirm via UI navigation
- After creation, ensure the app navigates to `/requisitions/<slug>` successfully and the record loads.

3) Regression check
- Create an initial request with a duplicate title (InitialRequestForm) to confirm that flow still works (it should).

Notes / constraints
- This is a frontend fix using the current Supabase client with RLS.
- RLS currently allows Hiring Managers (and HR roles) to SELECT job requisitions, so the slug-collision lookup should work for `valente@unicc.org`.
- The safety-net retry prevents edge-case failures due to near-simultaneous submissions.

Files expected to change
- `src/pages/JobRequisitionForm.tsx` (required)
- `src/pages/InitialRequestForm.tsx` (optional hardening)

After approval
- I will implement the changes, then you can retry submitting “Senior Software Developer” on staging to verify the error is gone.
