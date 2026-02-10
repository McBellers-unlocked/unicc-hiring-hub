

# Fix: Replace Old Checklist Items in Database

## Problem
The config file (`affiliateLifecycleConfig.ts`) was updated correctly, but this affiliate already had checklist items initialized in the database with the **old** labels. The UI reads from the database, not the config, so old items still show.

## Solution

Two changes:

1. **Delete the 15 old checklist rows** from the `affiliate_lifecycle_checklists` table for this affiliate (user_id `7952023c-2891-4b2e-a380-d9cdb30f653f`).

2. **After deletion**, the page will show "No checklist items found" with the "Initialize Checklist" button. Clicking it will create the new items from the updated config. Alternatively, we can also add logic so the app **auto-reinitializes** when old items are cleared -- but the simplest path is just clearing the DB rows and clicking the existing "Initialize Checklist" button.

## Technical Steps

- Use a database DELETE to remove all rows from `affiliate_lifecycle_checklists` where `user_id = '7952023c-2891-4b2e-a380-d9cdb30f653f'`
- No code changes needed -- the existing "Initialize Checklist" button + updated config will produce the correct items

