

# Fixed HR Focal Points List + @Mention Action Assignment in Comments

## Overview
This implementation covers two related features:
1. **Fixed HR Focal Points**: Replace free-text input with a standardized dropdown of 8 HR team members across all HR Operations pages
2. **@Mention in Comments**: Enable assigning actions to people via "@" mentions in comments, with autocomplete suggestions

---

## Part 1: Fixed HR Focal Points List

### HR Team Members (Fixed List)
```
Lucia RODENAS
Esther HERRERO
Isabel GUARDENO
Raffaella COPPOLA
Diego ARISTA
Anna NEGYESI
Francesca ROMANO
Matthew VALENTE
```

### Changes Required

#### 1. Create Shared Constants File
Create a new file with the HR focal points list that can be imported everywhere:

**New File: `src/lib/hrFocalPoints.ts`**
```typescript
export const HR_FOCAL_POINTS = [
  'Lucia RODENAS',
  'Esther HERRERO',
  'Isabel GUARDENO',
  'Raffaella COPPOLA',
  'Diego ARISTA',
  'Anna NEGYESI',
  'Francesca ROMANO',
  'Matthew VALENTE',
] as const;

export type HRFocalPoint = typeof HR_FOCAL_POINTS[number];
```

#### 2. Update Form Components
Replace the free-text Input with a Select dropdown in:

| Component | Field Location |
|-----------|----------------|
| `AppointmentForm.tsx` | Tracking tab, line ~501-513 |
| `SeparationForm.tsx` | Tracking tab (need to add - currently missing) |
| `STDAForm.tsx` | Tracking tab |

**Before:**
```tsx
<FormField
  name="main_hr_focal_point"
  render={({ field }) => (
    <FormItem>
      <FormLabel>HR Focal Point</FormLabel>
      <FormControl>
        <Input {...field} placeholder="ROMANO Francesca" />
      </FormControl>
    </FormItem>
  )}
/>
```

**After:**
```tsx
<FormField
  name="main_hr_focal_point"
  render={({ field }) => (
    <FormItem>
      <FormLabel>HR Focal Point</FormLabel>
      <Select onValueChange={field.onChange} value={field.value || ''}>
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder="Select HR focal point" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          {HR_FOCAL_POINTS.map((name) => (
            <SelectItem key={name} value={name}>{name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormItem>
  )}
/>
```

#### 3. Update Filter Dropdowns
Replace dynamic filtering (from existing data) with the fixed list in:

| Component | Current Implementation |
|-----------|----------------------|
| `AppointmentFilters.tsx` | Gets unique values from `appointments` data |
| `SeparationFilters.tsx` | Gets unique values from `separations` data |
| `STDAFilters.tsx` | Gets unique values from `stdas` data |

**Change:** Import `HR_FOCAL_POINTS` and use it directly in the filter dropdown instead of passing `hrFocalPoints` prop.

---

## Part 2: @Mention Action Assignment in Comments

### Design Approach
Create a mentionable textarea component that:
1. Detects "@" character while typing
2. Shows a dropdown of HR focal points to mention
3. Highlights mentioned names in the displayed comment
4. Optionally stores mentions separately for action tracking

### Database Schema Enhancement
Add a new table to track mentioned actions:

```sql
CREATE TABLE hr_comment_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL, -- References the parent comment
  comment_type TEXT NOT NULL, -- 'appointment', 'separation', 'stda'
  mentioned_name TEXT NOT NULL, -- The HR focal point name
  is_action_item BOOLEAN DEFAULT true,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### New Component: MentionableTextarea

**New File: `src/components/operations/MentionableTextarea.tsx`**

Features:
- Wraps standard Textarea
- Listens for "@" character
- Shows Popover with HR_FOCAL_POINTS filtered by search
- Inserts selected name at cursor position
- Renders mentions with visual highlighting

```tsx
interface MentionableTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  mentionOptions: string[]; // HR_FOCAL_POINTS
}
```

### Update Comment Components
Replace Textarea with MentionableTextarea in:
- `AppointmentComments.tsx`
- `SeparationComments.tsx`
- `STDAComments.tsx`

### Comment Display Enhancement
Parse and highlight @mentions when displaying comments:

```tsx
const renderCommentWithMentions = (text: string) => {
  const parts = text.split(/(@[\w\s]+)/g);
  return parts.map((part, i) => {
    if (part.startsWith('@') && HR_FOCAL_POINTS.some(fp => part.includes(fp.split(' ')[0]))) {
      return <Badge key={i} variant="secondary" className="text-xs">{part}</Badge>;
    }
    return part;
  });
};
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/lib/hrFocalPoints.ts` | Shared constants for HR team members |
| `src/components/operations/MentionableTextarea.tsx` | Textarea with @mention support |

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/operations/AppointmentForm.tsx` | HR focal point dropdown |
| `src/components/operations/SeparationForm.tsx` | Add HR focal point dropdown (currently text input) |
| `src/components/operations/STDAForm.tsx` | HR focal point dropdown |
| `src/components/operations/AppointmentFilters.tsx` | Use fixed HR_FOCAL_POINTS list |
| `src/components/operations/SeparationFilters.tsx` | Use fixed HR_FOCAL_POINTS list |
| `src/components/operations/STDAFilters.tsx` | Use fixed HR_FOCAL_POINTS list |
| `src/components/operations/AppointmentComments.tsx` | Use MentionableTextarea, render mentions |
| `src/components/operations/SeparationComments.tsx` | Use MentionableTextarea, render mentions |
| `src/components/operations/STDAComments.tsx` | Use MentionableTextarea, render mentions |
| `src/pages/operations/Appointments.tsx` | Remove hrFocalPoints prop dependency |
| `src/pages/operations/Separations.tsx` | Remove hrFocalPoints prop dependency |
| `src/pages/operations/STDAs.tsx` | Remove hrFocalPoints prop dependency |

---

## Implementation Order

1. Create `hrFocalPoints.ts` constants file
2. Update all three form components (Appointment, Separation, STDA) to use dropdown
3. Update all three filter components to use fixed list
4. Create `MentionableTextarea` component
5. Update all three comment components to use mentionable textarea
6. Add mention highlighting in comment display
7. (Optional) Add database table for tracking action items from mentions

---

## User Experience

### Assigning Main HR Focal Point
- Clean dropdown with 8 fixed names
- Consistent across all operations pages
- Filter dropdowns show same list

### Assigning Actions via Comments
1. User types "@" in comment box
2. Popover appears with searchable list of HR focal points
3. User clicks or presses Enter to insert name
4. Comment displays with highlighted mentions: `"@Lucia RODENAS please check the clearance status"`
5. Mentioned names stand out visually in the comment history

