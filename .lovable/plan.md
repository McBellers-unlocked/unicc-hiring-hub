
## HR Movement Email Notifications to Duty Station Admins

### What we're building
When a new HR movement is **created** (Arrival, Departure, Transfer, or Contract Break) in the system, an automatic email notification goes to the admin inbox for the relevant duty station. The email follows the established UNICC template format (UNICC logo, dark navy header, blue button, clean layout) used by the assessment invite system.

### Duty station → recipient mapping
| Duty Station | Recipient |
|---|---|
| Valencia | admin_vlc@unicc.org |
| Geneva | admin_gva@unicc.org |
| Brindisi | admin_bsi@unicc.org |
| Rome | admin_ROM@unicc.org |
| New York | admin_ny@unicc.org |

### When notifications are sent — trigger points

All three pages that insert HR movement records will be updated to call the new edge function after a successful create. Updates and deletes do **not** trigger a notification (creation only — to avoid noise).

| Record type | Source page | Created via |
|---|---|---|
| Departure / Contract Break (separation side) | `src/pages/operations/Separations.tsx` | `createMutation.onSuccess` |
| Arrival / Appointment (CB return) | `src/pages/operations/Appointments.tsx` | `createMutation.onSuccess` |
| Transfer | `src/pages/operations/Transfers.tsx` | `createMutation.onSuccess` |

### Email content per event type

The email body adapts based on the movement type. All emails share the same UNICC-branded HTML template structure (white body, UNICC logo top-centre, dark navy `#1a365d` heading, blue `#3182ce` info panel, clean footer).

**Arrival:**
- Subject: `New Arrival — [First Name] [Last Name] | [Duty Station]`
- Body highlights: Name, Grade, Contract Type, Duty Station, Division/Unit, Supervisor, Tentative Start Date

**Departure:**
- Subject: `Departure Notification — [First Name] [Last Name] | [Duty Station]`
- Body highlights: Name, Grade, Contract Type, Duty Station, Division/Unit, Supervisor, Last Day of Contract

**Transfer:**
- Subject: `Transfer / Reassignment — [First Name] [Last Name] | [Duty Station]`
- Body highlights: Name, Grade, From/To Duty Station, From/To Division, Start Date

**Contract Break (Secondment / Loan / Long-term Leave):**
- Subject: `Contract Break — [First Name] [Last Name] | [Duty Station]`
- Body highlights: Name, Break Type (event_type), Grade, Division/Unit, Supervisor, Break From date, Expected Return date

For Contract Breaks specifically, the email is sent only once when the separation(CB) is created (since the appointment(CB) is auto-generated at the same time — no duplicate notification for the system-created appointment).

### Technical implementation

#### 1. New edge function: `supabase/functions/notify-local-admin/index.ts`

A single multi-purpose edge function that accepts a payload and sends the appropriate email:

```typescript
interface NotifyLocalAdminRequest {
  eventType: 'arrival' | 'departure' | 'transfer' | 'contract_break';
  dutyStation: string;           // used to resolve recipient email
  firstName: string;
  lastName: string;
  grade?: string;
  contractType?: string;
  jobTitle?: string;
  divisionUnit?: string;
  supervisor?: string;
  tentativeDate?: string;        // for arrivals and departures
  startDate?: string;            // for transfers
  endDate?: string;              // for transfers
  newDutyStation?: string;       // for transfers
  newDivisionUnit?: string;      // for transfers
  breakType?: string;            // for contract breaks (event_type)
  returnDate?: string;           // for contract breaks
}
```

The function:
1. Maps `dutyStation` → admin email using the hardcoded map (same as the client-side `LOCAL_ADMIN_STATION_MAP`)
2. If no matching duty station, logs and returns 200 without sending (no unknown recipients)
3. Builds the appropriate HTML email from a shared UNICC-branded template
4. Sends via Resend using `recruitment@unicconnect.org` as the sender (consistent with all other notifications)
5. Uses the same logo URL as the assessment invite: `https://staging.unicconnect.org/email-assets/unicc_logo.jpg`

**Duty station → email map (inside the edge function):**
```typescript
const STATION_ADMIN_EMAILS: Record<string, string> = {
  'Valencia': 'admin_vlc@unicc.org',
  'Geneva': 'admin_gva@unicc.org',
  'Brindisi': 'admin_bsi@unicc.org',
  'Rome': 'admin_ROM@unicc.org',
  'New York': 'admin_ny@unicc.org',
};
```

#### 2. `supabase/config.toml` — add entry

```toml
[functions.notify-local-admin]
verify_jwt = false
```

#### 3. `src/pages/operations/Separations.tsx` — call after creation

In `createMutation.onSuccess`, after `queryClient.invalidateQueries`, fire the edge function. For CB type, the `returnDate` from the result is included. The call is fire-and-forget (non-blocking, failure doesn't affect the user flow).

```typescript
// Fire-and-forget notification
supabase.functions.invoke('notify-local-admin', {
  body: {
    eventType: result.isCB ? 'contract_break' : 'departure',
    dutyStation: data.duty_station,
    firstName: data.first_name,
    lastName: data.last_name,
    grade: data.grade,
    contractType: data.contract_type,
    jobTitle: data.job_title,
    divisionUnit: data.section_unit,
    supervisor: data.supervisor,
    tentativeDate: data.tentative_date,
    breakType: data.event_type,          // for CB only
    returnDate: result.returnDate,        // for CB only
  }
});
```

#### 4. `src/pages/operations/Appointments.tsx` — call after creation

In `createMutation.onSuccess`. However, the auto-created `Appointment (CB)` from `Separations.tsx` is NOT a manual creation — so in `Appointments.tsx`, we only need to notify for manually created appointments (i.e. records with `operation_type` of `'Appointment'` or `'Direct Appointment'`, not `'Appointment (CB)'`). The CB notification already covers both sides.

```typescript
// Only notify for non-CB appointment types
if (data.operation_type !== 'Appointment (CB)') {
  supabase.functions.invoke('notify-local-admin', {
    body: {
      eventType: 'arrival',
      dutyStation: data.duty_station,
      firstName: data.first_name,
      lastName: data.last_name,
      grade: data.grade,
      contractType: data.contract_type,
      jobTitle: data.job_title,
      divisionUnit: data.section_unit,
      supervisor: data.supervisor,
      tentativeDate: data.tentative_date,
    }
  });
}
```

#### 5. `src/pages/operations/Transfers.tsx` — call after creation

```typescript
supabase.functions.invoke('notify-local-admin', {
  body: {
    eventType: 'transfer',
    dutyStation: data.duty_station,
    firstName: data.first_name,
    lastName: data.last_name,
    grade: data.grade,
    contractType: data.contract_type,
    jobTitle: data.job_title,
    divisionUnit: data.section_unit,
    supervisor: data.supervisor,
    startDate: data.start_date,
    endDate: data.end_date,
    newDutyStation: data.new_duty_station,
    newDivisionUnit: data.new_section_unit,
  }
});
```

### Email template format (matching assessment invite style)

```
[UNICC Logo — centred]

HR Movement Notification — [Duty Station]

Dear [Duty Station] Admin Team,

A new [Arrival / Departure / Transfer / Contract Break] has been recorded in the UNICC HR System.

┌─────────────────────────────────────────────┐
│  [Event Type Icon] [First Name] [Last Name] │
│  Grade: P3 | Contract: Fixed Term           │
│  Division/Unit: DDC                         │
│  Supervisor: John Smith                     │
│  [Date label]: 01 Apr 2026                  │
└─────────────────────────────────────────────┘

[For Contract Break only — amber notice box:]
⚠ Break Period: 01 Apr 2026 → 01 May 2026
  Break Type: Secondment

[View in System →]   (links to /operations/admin)

Best regards,
UNICC Human Resources
```

The "View in System" button links to `https://staging.unicconnect.org/operations/admin` — the Local Admin Dashboard where the notification recipient can view the record.

### Files to change

| File | Change |
|---|---|
| `supabase/functions/notify-local-admin/index.ts` | **NEW** — multi-type notification edge function |
| `supabase/config.toml` | Add `[functions.notify-local-admin]` with `verify_jwt = false` |
| `src/pages/operations/Separations.tsx` | Fire notification in `createMutation.onSuccess` |
| `src/pages/operations/Appointments.tsx` | Fire notification in `createMutation.onSuccess` (skip CB type) |
| `src/pages/operations/Transfers.tsx` | Fire notification in `createMutation.onSuccess` |

### No database changes required
All required data fields already exist. The `RESEND_API_KEY` secret is already configured in the project (used by all other notification functions).

### Error handling
- If the duty station has no admin email mapping → log and skip silently (no error thrown)
- If Resend fails → log the error server-side, return a non-200, but the client-side call is fire-and-forget so the user's form save is unaffected
- Unknown `eventType` values → log and return 400
