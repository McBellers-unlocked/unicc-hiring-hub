

## Add "Go to Email Hub" Button for Timesheet Reminder Item

### Overview
Add a "Go to Email Hub" button next to the "Timesheet reminder to consultant" checklist item in the Lifecycle Management screen. Clicking it navigates to `/admin/email-hub`.

### Changes (single file: `src/components/affiliate/AffiliateLifecycleChecklist.tsx`)

1. **Import** `Link` from `react-router-dom` and the `Mail` icon from `lucide-react`.

2. **Add a conditional button** inside each checklist item row: when `item.item_key === 'timesheet_reminder'`, render a small outline `Button` wrapped in a `Link` to `/admin/email-hub`, labeled "Go to Email Hub" with a `Mail` icon. It will sit between the item label and the existing notes toggle button.

### No other file changes needed
The checklist item key (`timesheet_reminder`) is already defined in `affiliateLifecycleConfig.ts` and stored in the database records. The Email Hub page and route already exist.

