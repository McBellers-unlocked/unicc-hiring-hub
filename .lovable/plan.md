

## Add "Create/Link Job", "Create/Link Worker", and "Create/Link Vendor" Buttons

### What
Add three new buttons to the left of the existing "Launch PR" button in the Affiliate Info Card on the onboarding page. These are placeholder action buttons for now.

### Implementation

**File: `src/pages/AffiliateOnboarding.tsx`**

1. **Add imports**: Import `Briefcase`, `UserPlus`, `Building2` icons from `lucide-react`.

2. **Add buttons before "Launch PR"** (around line 248-257): Wrap the Launch PR button and the three new buttons in a `flex` container with `gap-2`. The three new buttons use `variant="outline"` to visually distinguish them from the primary Launch PR button:
   - **Create/Link Job** — `Briefcase` icon
   - **Create/Link Worker** — `UserPlus` icon
   - **Create/Link Vendor** — `Building2` icon

The buttons will be non-functional placeholders for now (logging to console on click), ready for future dialog/workflow integration.

### Technical detail
Replace the single Launch PR `<Button>` block with:
```tsx
<div className="flex items-center gap-2">
  <Button variant="outline" size="lg" onClick={() => console.log('Create/Link Job')}>
    <Briefcase className="w-5 h-5 mr-2" />
    Create/Link Job
  </Button>
  <Button variant="outline" size="lg" onClick={() => console.log('Create/Link Worker')}>
    <UserPlus className="w-5 h-5 mr-2" />
    Create/Link Worker
  </Button>
  <Button variant="outline" size="lg" onClick={() => console.log('Create/Link Vendor')}>
    <Building2 className="w-5 h-5 mr-2" />
    Create/Link Vendor
  </Button>
  <Button ...existing Launch PR button... />
</div>
```

