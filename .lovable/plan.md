

## Remove Email Required Validation for Affiliate Creation

### What
Make the "Email" field optional when creating a new affiliate, while keeping it required when editing.

### Implementation

**File: `src/components/affiliate/AffiliateForm.tsx`**

1. Change the Zod schema to make `email` conditionally required based on mode, or simply make it optional in the schema:
   - Change `email: z.string().email('Invalid email')` to `email: z.string().email('Invalid email').optional().or(z.literal(''))`
2. Remove the red asterisk `*` next to the Email label when `mode === 'create'`.

**File: `supabase/functions/create-affiliate/index.ts`**

3. Remove `email` from the required-field check (line 37) so only `name` and `affiliate_type` are mandatory server-side.

