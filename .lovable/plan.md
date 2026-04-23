

## Reorder & color-code Userbase columns by source

### Changes — `src/pages/Userbase.tsx`

**1. Default visible columns + display order**

Replace `DEFAULT_VISIBLE` (currently "all columns") with this exact ordered list, and bump the localStorage key to `userbase:visible-columns:v3` so existing users get the new default:

```
samsaran_email_address, gsm_email_address, gsm_staff_number,
full_name, first_name, last_name, gsm_gender,
worker_type, unit, division,
official_duty_station, office_location,
position_name, job_title,
reporting_lines, line_manager,
current_grade, nationality
```

Build `visibleCols` by mapping over this ordered list (instead of filtering `COLUMNS`), so the table renders columns in the requested order regardless of `MAPPED_COLUMNS` order. Columns not in the default list remain togglable via the existing **Columns** dropdown (which still lists all `MAPPED_COLUMNS`).

**2. Header color by source**

Add a `SOURCE_BY_DB` map keyed by db column name → `'gsm' | 'samsaran'`:

- **GSM (green header)**: `full_name`, `first_name`, `last_name`, `gsm_staff_number`, `gsm_email_address`, `gsm_gender`, `nationality`, `date_of_birth`, `service_time_current_org`, `official_duty_station`, `apa_start_date`, `job_name`, `position_name`, `first_incumbency_start_date`, `entry_on_duty_date_who`, `appointment_type`, `contract_start_date`, `contract_end_date`, `current_grade`, `current_step`, `reporting_lines`, `category`, `search_name`
- **Samsaran (blue header)**: `samsaran_staff_number`, `samsaran_email_address`, `worker_type`, `intern`, `unit`, `job_title`, `line_manager`, `office_location`, `division`
- `source` column: neutral (no tint)

In the `<TableHead>` render, apply a class based on source:
- GSM → `bg-green-100 text-green-900 dark:bg-green-950/40 dark:text-green-200`
- Samsaran → `bg-blue-100 text-blue-900 dark:bg-blue-950/40 dark:text-blue-200`

The sticky header background already exists; the per-cell tint sits on top of it.

### Out of scope
- Changing column source assignments at runtime.
- Tinting body cells (only headers are colored).
- Removing the now-hidden columns from the DB or from `MAPPED_COLUMNS` — they remain available via the Columns toggle.

