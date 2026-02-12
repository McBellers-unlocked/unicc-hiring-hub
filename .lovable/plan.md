

# Auto-Fill Template Fields from Staff Data

## Overview
When using "Use Template" on a document template, add a staff search bar at the top of the fill dialog. Selecting a staff member automatically populates matching template fields (e.g., `{{name}}`, `{{duty_station}}`, `{{grade}}`) from their profile. Users can still edit any field after auto-fill.

## How It Works
1. Click "Use Template" on any template -- the fill dialog opens as before
2. A new **staff search combobox** appears at the top of the dialog
3. Search and select a staff member
4. All matching fields are auto-populated from the staff record
5. Users can manually override any auto-filled value before generating

## Field Mapping
The following template placeholder names will auto-map to staff profile data:

| Template Placeholder | Staff Data Source |
|---|---|
| `name`, `staff_name`, `full_name` | Staff name |
| `first_name` | Parsed first name |
| `last_name`, `surname` | Parsed last name |
| `email` | Email |
| `grade`, `level` | Grade |
| `job_title`, `title`, `position` | Job title |
| `duty_station`, `location` | Duty station |
| `section`, `unit`, `section_unit` | Section/Unit |
| `supervisor`, `line_manager`, `manager` | Line manager |
| `staff_number` | Staff number |

Unmatched fields remain empty for manual entry.

## Technical Details

### File Modified: `src/components/operations/DocumentTemplatesTab.tsx`

**Changes to the Fill Template Dialog:**
- Import `StaffSearchCombobox` and `parseName` from `StaffSearchCombobox.tsx`
- Add state for selected staff member
- Add the combobox above the field inputs in the dialog
- On staff selection, iterate through template fields and match against the mapping table above (case-insensitive, underscore-normalized)
- Update `fieldValues` state with matched values, preserving any manually entered values for unmatched fields

No database changes, no new components, no new edge functions -- this is a pure frontend enhancement reusing the existing `StaffSearchCombobox`.

