

## Create Email Hub Page

### Overview
A new page at `/admin/email-hub` with three vertical sections: **Selection**, **Staff Recruitment**, and **Affiliate Recruitment**. The Affiliate Recruitment section will contain a list of three email types, each with a "Draft Email" button on the right side.

### Page Structure

```text
+--------------------------------------------------+
|  Email Hub (page title)                           |
+--------------------------------------------------+
|  SELECTION                                        |
|  (empty section placeholder for future use)       |
+--------------------------------------------------+
|  STAFF RECRUITMENT                                |
|  (empty section placeholder for future use)       |
+--------------------------------------------------+
|  AFFILIATE RECRUITMENT                            |
|  - Rate confirmation to IC        [Draft Email]   |
|  - General documentation to IC    [Draft Email]   |
|  - One HR conformity              [Draft Email]   |
+--------------------------------------------------+
```

### Technical Details

#### 1. New file: `src/pages/EmailHub.tsx`
- Uses the existing `Layout` component wrapper (consistent with all other pages).
- Three sections rendered as `Card` components, each with a `CardHeader` (section title) and `CardContent`.
- Selection and Staff Recruitment sections will show a muted placeholder text ("No items configured yet" or similar) so they are visually present but clearly empty.
- Affiliate Recruitment section renders a list of three items. Each item is a flex row with the label on the left and a `Button` (variant `outline`, with a `Mail` icon) labeled "Draft Email" on the right. The buttons will be non-functional for now (placeholder `onClick` with a toast notification).

#### 2. Route registration: `src/App.tsx`
- Import `EmailHub` and add `<Route path="/admin/email-hub" element={<EmailHub />} />` alongside the other admin routes.

#### 3. Navigation link: `src/components/Layout.tsx`
- Add an "Email Hub" menu item with a `Mail` icon inside the existing "Manage" dropdown menu (visible to admin/HR roles).

