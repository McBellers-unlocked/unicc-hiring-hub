

# Fix: Initial Request Approval Fails When Using Slug URLs

## Problem

When a Chief of Division navigates to `/requisitions/initial/xx` (where `xx` is a slug, not a UUID), the approve/reject action fails with "invalid input syntax for type uuid" because the mutation code passes the slug directly to `.eq("id", id)` database queries.

The `/chief-of-division` page works because it uses the actual UUID from the fetched data.

## Root Cause

In `src/pages/InitialRequestForm.tsx`, the `approveMutation` (lines 515-545) uses the raw `id` from `useParams()` in two places:

```
.eq("id", id)  // line 518 - fetching existing comments
.eq("id", id)  // line 545 - updating the requisition
```

When the URL contains a slug (e.g., `xx`), this breaks because the `id` column is a UUID.

## Fix

**File: `src/pages/InitialRequestForm.tsx`**

1. Add a `requisitionUUID` state variable that stores the actual database UUID after the record is loaded
2. In `loadRequest`, after fetching the record, save `data.id` to `requisitionUUID`
3. In `approveMutation`, replace both `.eq("id", id)` calls with `.eq("id", requisitionUUID)` so the correct UUID is always used regardless of whether the URL contains a slug or UUID

This is a minimal, targeted fix -- only 3 small changes in one file.
