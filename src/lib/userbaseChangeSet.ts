import { supabase } from '@/integrations/supabase/client';
import type { RowChange, FieldDiff } from '@/components/userbase/ImportChangePreview';

// Mirror of COLUMN_TO_DB in ImportUserbase.tsx — merged-row label -> DB column.
// Excludes bookkeeping (imported_at, match_key, source, imported_by).
export const MAPPED_COLUMNS: { label: string; db: string }[] = [
  { label: 'Full Name', db: 'full_name' },
  { label: 'Staff Number', db: 'gsm_staff_number' },
  { label: 'Nationality', db: 'nationality' },
  { label: 'Gender', db: 'gsm_gender' },
  { label: 'Date of Birth', db: 'date_of_birth' },
  { label: 'GSM Email Address', db: 'gsm_email_address' },
  { label: 'Service time (Current Organization)', db: 'service_time_current_org' },
  { label: 'Official Duty Station', db: 'official_duty_station' },
  { label: 'APA Start Date', db: 'apa_start_date' },
  { label: 'Job Name', db: 'job_name' },
  { label: 'Position Name', db: 'position_name' },
  { label: 'First Incumbency Start Date', db: 'first_incumbency_start_date' },
  { label: 'Entry on duty date WHO', db: 'entry_on_duty_date_who' },
  { label: 'Appointment Type', db: 'appointment_type' },
  { label: 'Contract Start Date', db: 'contract_start_date' },
  { label: 'Contract End Date', db: 'contract_end_date' },
  { label: 'Current Grade', db: 'current_grade' },
  { label: 'Current Step', db: 'current_step' },
  { label: 'Reporting lines (name of supervisor)', db: 'reporting_lines' },
  { label: 'Category', db: 'category' },
  { label: 'First name', db: 'first_name' },
  { label: 'Last name', db: 'last_name' },
  { label: 'Search name', db: 'search_name' },
  
  
  { label: 'Samsaran Email address', db: 'samsaran_email_address' },
  { label: 'Worker type', db: 'worker_type' },
  { label: 'Intern', db: 'intern' },
  { label: 'Unit', db: 'unit' },
  { label: 'Job title', db: 'job_title' },
  { label: 'Line manager', db: 'line_manager' },
  { label: 'Office location', db: 'office_location' },
  { label: 'Division', db: 'division' },
];

const norm = (v: unknown) => (v == null ? '' : String(v).trim());
const normEmail = (v: unknown) => norm(v).toLowerCase();

export interface MergedRowLike {
  __source?: string;
  __match_key?: string;
  [key: string]: unknown;
}

export interface ExistingRow {
  [key: string]: unknown;
}

const indexExisting = (rows: ExistingRow[]) => {
  const bySn = new Map<string, ExistingRow>();
  const byEmail = new Map<string, ExistingRow>();
  for (const r of rows) {
    const sn = normEmail(r.gsm_staff_number) || normEmail(r.samsaran_staff_number);
    const em = normEmail(r.gsm_email_address) || normEmail(r.samsaran_email_address);
    if (sn) bySn.set(sn, r);
    if (em) byEmail.set(em, r);
  }
  return { bySn, byEmail };
};

const matchExisting = (
  row: MergedRowLike,
  index: { bySn: Map<string, ExistingRow>; byEmail: Map<string, ExistingRow> },
): ExistingRow | undefined => {
  const sn =
    normEmail(row['GSM Staff Number']) || normEmail(row['Samsaran Staff number']);
  const em =
    normEmail(row['GSM Email Address']) || normEmail(row['Samsaran Email address']);
  if (sn && index.bySn.has(sn)) return index.bySn.get(sn);
  if (em && index.byEmail.has(em)) return index.byEmail.get(em);
  return undefined;
};

export async function fetchExistingRows(): Promise<ExistingRow[]> {
  const cols = MAPPED_COLUMNS.map((c) => c.db).join(',');
  const all: ExistingRow[] = [];
  const pageSize = 1000;
  let from = 0;
  // Keep paging until short page
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await supabase
      .from('users_clean')
      .select(cols)
      .range(from, from + pageSize - 1);
    if (error) throw error;
    const batch = (data ?? []) as unknown as ExistingRow[];
    all.push(...batch);
    if (batch.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

export function computeChangeSet(
  merged: MergedRowLike[],
  existing: ExistingRow[],
): RowChange[] {
  const index = indexExisting(existing);
  const out: RowChange[] = [];

  for (const row of merged) {
    const match = matchExisting(row, index);
    const name =
      norm(row['Full Name']) ||
      [norm(row['First name']), norm(row['Last name'])].filter(Boolean).join(' ') ||
      norm(row['Search name']);
    const email =
      norm(row['GSM Email Address']) || norm(row['Samsaran Email address']);
    const staffNumber =
      norm(row['GSM Staff Number']) || norm(row['Samsaran Staff number']);
    const source = String(row.__source ?? 'gsm');
    const matchKey = String(row.__match_key ?? `${staffNumber}|${email}`);

    if (!match) {
      const diffs: FieldDiff[] = [];
      for (const c of MAPPED_COLUMNS) {
        const after = norm(row[c.label]);
        if (after) diffs.push({ column: c.db, label: c.label, before: '', after });
      }
      out.push({
        matchKey,
        status: 'new',
        name,
        email,
        staffNumber,
        source,
        diffs,
        newFieldsCount: diffs.length,
      });
      continue;
    }

    const diffs: FieldDiff[] = [];
    for (const c of MAPPED_COLUMNS) {
      const after = norm(row[c.label]);
      const before = norm(match[c.db]);
      const isEmail = c.db.endsWith('_email_address');
      const same = isEmail
        ? before.toLowerCase() === after.toLowerCase()
        : before === after;
      if (!same) {
        diffs.push({ column: c.db, label: c.label, before, after });
      }
    }
    out.push({
      matchKey,
      status: diffs.length === 0 ? 'unchanged' : 'updated',
      name,
      email,
      staffNumber,
      source,
      diffs,
      newFieldsCount: 0,
    });
  }

  // Sort: updated first, then new, then unchanged; within group by name
  const order = { updated: 0, new: 1, unchanged: 2 } as const;
  out.sort((a, b) => {
    const d = order[a.status] - order[b.status];
    if (d !== 0) return d;
    return a.name.localeCompare(b.name);
  });

  return out;
}
