

# Delete All Separation Records

## What Will Happen

A database migration will delete all **281 rows** from the `hr_separations` table, giving you a clean slate to manually build the data.

## Technical Details

- Run a single SQL statement: `DELETE FROM hr_separations;`
- No code changes needed -- the Separations page will simply show an empty list
- This only affects the **Test** environment. If you have data in **Live**, you would need to run the same query there separately via Cloud View > Run SQL before publishing.

