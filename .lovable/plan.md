

## Add "Go to Email Hub" Button for Additional Checklist Items

### What changes
In `src/components/affiliate/AffiliateLifecycleChecklist.tsx`, the "Go to Email Hub" button currently only appears next to the "Timesheet reminder to consultant" checklist item (line 120).

We will expand the condition so the same button also appears next to:
- **Evaluation form receival** (`evaluation_form_receival`)
- **Contract break ticket email** (`contract_break_ticket_email`)

### Technical detail
Change the condition on line 120 from:

```tsx
{item.item_key === 'timesheet_reminder' && (
```

to:

```tsx
{['timesheet_reminder', 'evaluation_form_receival', 'contract_break_ticket_email'].includes(item.item_key) && (
```

This is a single-line change in one file. The button markup, styling, and link destination (`/admin/email-hub`) remain identical.

