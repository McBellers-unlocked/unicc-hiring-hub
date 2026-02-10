

# Update Affiliate Lifecycle Checklist Items

## What Changes

Replace all default checklist items in `src/lib/affiliateLifecycleConfig.ts` with the exact items specified, removing any that are not in the new list.

## New Checklist Items by Stage

**Contract Break Preparations:**
- Timesheet reminder to consultant
- Evaluation form receival
- Contract break ticket email

**Purchase Request:**
- Confirm appointment duration
- Validate account codes
- Create rate determination spreadsheet
- Raise PR
- Wait for PR Approval

**Documentation:**
- Draft Selection Report
- Wait for manager signature on SR
- Wait for Division Chief signature on SR
- Wait for Director signature on SR
- Issue contract for HR signature
- Issue contract for incumbent signature
- Receive signed contract

**Purchase Order:**
- Draft GSM PO
- Add PO attachments
- Wait PO approval
- Insert reference in Dynamics
- Countersign contract

**Stakeholders Update:**
- Share record for WHO Insurance
- Ask manager to restore account
- Inform accounts payable
- Update userbase

## Technical Details

### File: `src/lib/affiliateLifecycleConfig.ts`

Replace the entire `DEFAULT_CHECKLIST_ITEMS` object with the new items listed above. Each item gets a snake_case `key` and the exact label text provided. No other files need changes -- the checklist component and lifecycle page already read from this config dynamically.

**Note:** Existing checklists already initialized in the database for current affiliates will not be affected. Only newly initialized checklists will use the updated defaults. If you want existing records updated, that would require a separate database migration.

