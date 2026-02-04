

## Plan: Add Save Functionality to Each Tab in Assessment Builder

### Problem Identified
Currently, the assessment builder has a 4-tab wizard (Basics, Emails, Curveball, Preview), but the **Save button only exists on the final Preview tab**. When users make edits in earlier tabs and navigate forward/backward, their changes are only held in memory. If they refresh or navigate away, unsaved changes are lost.

### Solution
Add a **"Save & Continue"** button pattern to each tab that saves the current state before moving to the next step. Also add a standalone "Save" button so users can save without navigating.

---

### Technical Changes

**File: `src/pages/AssessmentBuilder.tsx`**

1. **Create a reusable save-and-continue handler:**
```typescript
const saveAndContinue = async (nextTab: string) => {
  await saveMutation.mutateAsync();
  setActiveTab(nextTab);
};
```

2. **Update Basics Tab footer (line 378-380):**
   - Change from: "Next: Add Emails" button that only switches tabs
   - Change to: "Save & Continue" button that saves first, then switches

3. **Update Emails Tab footer (line 497-502):**
   - Add "Save" button alongside navigation
   - Change "Next" to "Save & Continue"

4. **Update Curveball Tab footer (line 652-657):**
   - Add "Save" button alongside navigation  
   - Change "Next" to "Save & Continue"

5. **Add visual feedback for unsaved changes:**
   - Track if form has been modified since last save
   - Show indicator when there are unsaved changes

---

### Updated UI Pattern

Each tab will have this footer pattern:

| Button | Action | Placement |
|--------|--------|-----------|
| Back | Switch to previous tab | Left |
| Save | Save current state (no navigation) | Right (secondary) |
| Save & Continue | Save then go to next tab | Right (primary) |

Example for Basics tab:
```tsx
<div className="flex justify-between">
  <div /> {/* Empty for alignment */}
  <div className="flex gap-2">
    <Button 
      variant="outline" 
      onClick={() => saveMutation.mutate()}
      disabled={saveMutation.isPending || !title}
    >
      <Save className="w-4 h-4 mr-2" />
      Save
    </Button>
    <Button 
      onClick={() => saveAndContinue("emails")}
      disabled={saveMutation.isPending || !title}
    >
      Save & Continue
    </Button>
  </div>
</div>
```

---

### Files to Modify

| File | Change |
|------|--------|
| `src/pages/AssessmentBuilder.tsx` | Add save-and-continue pattern to all tabs |

---

### Expected Behavior After Fix

1. User edits title in Basics tab
2. Clicks "Save & Continue" 
3. Assessment is saved to database (toast: "Assessment updated")
4. User is navigated to Emails tab
5. If user clicks just "Save", changes are saved but they stay on current tab
6. All progress is persisted, even if user refreshes or navigates away

