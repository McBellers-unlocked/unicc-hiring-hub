

## Add "Delete Record" Option to Affiliate Personnel Context Menu

### What
Add a "Delete record" option to the dropdown menu for each affiliate in `/admin/affiliate-personnel`. Clicking it opens a confirmation dialog. "Yes" deletes the affiliate from the `users` table (and cascading related records). "No" closes the dialog with no effect.

### Implementation

**File: `src/pages/AffiliatePersonnel.tsx`**

1. **Add imports**: Import `Trash2` from lucide-react, and `AlertDialog`, `AlertDialogAction`, `AlertDialogCancel`, `AlertDialogContent`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogHeader`, `AlertDialogTitle` from the alert-dialog component.

2. **Add state**: `deletingAffiliate` state (`AffiliateUser | null`) to track which affiliate is pending deletion.

3. **Add delete mutation**: A `useMutation` that calls `supabase.from('users').delete().eq('id', affiliate.id)`, invalidates the affiliates query on success, and shows a toast.

4. **Add menu item**: After the "Contract History" `DropdownMenuItem` (line 981), add a `DropdownMenuSeparator` and a new `DropdownMenuItem` with `Trash2` icon and text "Delete record", styled with `text-destructive`. On click, sets `deletingAffiliate`.

5. **Add AlertDialog**: Outside the table, render an `AlertDialog` controlled by `deletingAffiliate`. Shows "Are you sure you want to delete this record?" with Yes/No buttons. "Yes" triggers the delete mutation; "No" closes the dialog.

