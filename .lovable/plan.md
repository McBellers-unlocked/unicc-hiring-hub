

## Fix: Prevent Early Form Submission on Contract Tab

### Problem
When filling fields on the "Contract" tab, pressing Enter in any input triggers the native form submit. Since the email field is now optional, the form validation passes with just name and affiliate_type, causing the form to submit prematurely without the user ever seeing the Assignment tab.

### Solution

**File: `src/components/affiliate/AffiliateForm.tsx`**

1. Wrap the `handleFormSubmit` to only allow submission when `activeTab === 'assignment'`. If the user somehow triggers submit on an earlier tab, auto-advance to the next tab instead of submitting.

Change the form's `onSubmit` handler:
```tsx
const guardedSubmit = (data: AffiliateFormData) => {
  if (activeTab !== 'assignment') {
    setActiveTab(activeTab === 'personal' ? 'contract' : 'assignment');
    return;
  }
  return handleFormSubmit(data);
};
```

And update the form tag:
```tsx
<form onSubmit={handleSubmit(guardedSubmit)} ...>
```

This ensures the form only actually submits when the user is on the final (Assignment) tab, regardless of how submission is triggered.

