import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Upload, ArrowLeft, FileSpreadsheet, X, Sparkles } from 'lucide-react';
import { DIVISION_UNITS } from '@/lib/organizationConstants';
import { supabase } from '@/integrations/supabase/client';
import { ImportChangePreview, type RowChange } from '@/components/userbase/ImportChangePreview';
import { computeChangeSet, fetchExistingRows } from '@/lib/userbaseChangeSet';

const ALLOWED_EXTENSIONS = ['.csv', '.xls', '.xlsx'];
const ALLOWED_MIME_TYPES = [
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const isValidFile = (file: File) => {
  const lowerName = file.name.toLowerCase();
  const extOk = ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
  const mimeOk = ALLOWED_MIME_TYPES.includes(file.type) || file.type === '';
  return extOk && mimeOk;
};

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

interface DropZoneProps {
  title: string;
  subtitle: string;
  inputId: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
}

function DropZone({ title, subtitle, inputId, file, onFileChange }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFile = (selected: File | undefined | null) => {
    if (!selected) return;
    if (!isValidFile(selected)) {
      toast({
        title: 'Invalid file type',
        description: 'Only CSV, XLS, or XLSX files are allowed.',
        variant: 'destructive',
      });
      return;
    }
    onFileChange(selected);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{subtitle}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDragging(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            handleFile(e.dataTransfer.files?.[0]);
          }}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50 hover:bg-muted/40'
          }`}
        >
          <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm font-medium">
            Drag & drop your file here, or click to browse
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Accepted formats: .csv, .xls, .xlsx
          </p>
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept=".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={(e) => {
              handleFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </div>

        {file && (
          <div className="flex items-center justify-between rounded-md border bg-muted/30 p-3">
            <div className="flex items-center gap-3 min-w-0">
              <FileSpreadsheet className="w-5 h-5 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onFileChange(null);
              }}
              aria-label="Remove file"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---- Transformation helpers ----

const GSM_COLUMNS = [
  'Full Name', 'Staff Number', 'Nationality', 'Gender', 'Date of Birth', 'Email Address',
  'Service time (Current Organization)', 'Official Duty Station', 'APA Start Date',
  'Job Name', 'Position Name', 'First Incumbency Start Date', 'Entry on duty date WHO',
  'Appointment Type', 'Contract Start Date', 'Contract End Date', 'Current Grade', 'Current Step',
  'Reporting lines (name of supervisor)',
];

const SAMSARAN_COLUMNS = [
  'First name', 'Last name', 'Search name', 'Gender', 'Staff number', 'Email address',
  'Worker type', 'Intern', 'Department', 'Job title', 'Line manager', 'Office location',
];

const extractCode = (fullName: string): string => {
  const match = fullName.match(/\(([^)]+)\)\s*$/);
  return match ? match[1] : '';
};

const buildUnitToDivision = (): Map<string, string> => {
  const map = new Map<string, string>();
  Object.entries(DIVISION_UNITS).forEach(([divCode, units]) => {
    units.forEach((u) => {
      const code = extractCode(u);
      if (code) map.set(code.toLowerCase(), divCode);
      map.set(u.toLowerCase().trim(), divCode);
    });
  });
  return map;
};

const lookupDivision = (unit: string, lookup: Map<string, string>): string => {
  if (!unit) return '';
  const trimmed = unit.toString().trim();
  const code = extractCode(trimmed);
  if (code) {
    const v = lookup.get(code.toLowerCase());
    if (v) return v;
  }
  const direct = lookup.get(trimmed.toLowerCase());
  if (direct) return direct;
  for (const [key, val] of lookup.entries()) {
    if (key.length > 2 && (trimmed.toLowerCase().includes(key) || key.includes(trimmed.toLowerCase()))) {
      return val;
    }
  }
  return '';
};

const toIsoDate = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '';
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? '' : value.toISOString().slice(0, 10);
  }
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return '';
    const d = new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
    return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
  }
  const s = String(value).trim();
  if (!s) return '';
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return '';
};

const normalizeGender = (g: unknown): string => {
  const s = String(g ?? '').trim().toLowerCase();
  if (s === 'female') return 'Woman';
  if (s === 'male') return 'Man';
  return String(g ?? '');
};

const normalizeWorkerType = (w: unknown): string => {
  const s = String(w ?? '').trim().toLowerCase();
  if (s === 'contractor') return 'Affiliate';
  if (s === 'employee') return 'Staff';
  return String(w ?? '');
};

const findHeader = (row: Record<string, unknown>, wanted: string): string | null => {
  const want = wanted.toLowerCase().replace(/\s+/g, ' ').trim();
  for (const key of Object.keys(row)) {
    if (key.toLowerCase().replace(/\s+/g, ' ').trim() === want) return key;
  }
  return null;
};

const readSheet = async (file: File): Promise<Record<string, unknown>[]> => {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array', cellDates: false });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { defval: '', raw: true });
};

const transformGsm = (rows: Record<string, unknown>[]) => {
  return rows.map((row) => {
    const out: Record<string, string> = {};
    for (const col of GSM_COLUMNS) {
      const orig = findHeader(row, col);
      let val: unknown = orig ? row[orig] : '';
      if (col === 'First Incumbency Start Date' || col === 'Entry on duty date WHO') {
        val = toIsoDate(val);
      } else if (col === 'Gender') {
        val = normalizeGender(val);
      }
      out[col] = val == null ? '' : String(val);
    }
    const grade = out['Current Grade'] ?? '';
    out['Category'] = grade.toString().trim().charAt(0).toUpperCase();
    return out;
  });
};

const transformSamsaran = (rows: Record<string, unknown>[]) => {
  const lookup = buildUnitToDivision();
  const result: Record<string, string>[] = [];
  for (const row of rows) {
    const out: Record<string, string> = {};
    for (const col of SAMSARAN_COLUMNS) {
      const orig = findHeader(row, col);
      let val: unknown = orig ? row[orig] : '';
      if (col === 'Gender') val = normalizeGender(val);
      else if (col === 'Worker type') val = normalizeWorkerType(val);
      const outKey = col === 'Department' ? 'Unit' : col;
      out[outKey] = val == null ? '' : String(val);
    }
    if (!out['Email address'] || !out['Email address'].trim()) continue;
    out['Division'] = lookupDivision(out['Unit'] ?? '', lookup);
    result.push(out);
  }
  return result;
};

const GSM_OUT_COLUMNS = [...GSM_COLUMNS, 'Category'];
const SAMSARAN_OUT_COLUMNS = [
  'First name', 'Last name', 'Search name', 'Gender', 'Staff number', 'Email address',
  'Worker type', 'Intern', 'Unit', 'Job title', 'Line manager', 'Office location', 'Division',
];

const OVERLAP_RENAMES: Record<string, { gsm: string; sams: string }> = {
  Email: { gsm: 'GSM Email Address', sams: 'Samsaran Email address' },
};

const buildMergedColumns = (): { columns: string[]; gsmMap: Record<string, string>; samsMap: Record<string, string> } => {
  const gsmMap: Record<string, string> = {};
  const samsMap: Record<string, string> = {};
  for (const c of GSM_OUT_COLUMNS) {
    if (c === 'Staff Number') gsmMap[c] = 'Staff Number';
    else if (c === 'Email Address') gsmMap[c] = OVERLAP_RENAMES.Email.gsm;
    else gsmMap[c] = c;
  }
  for (const c of SAMSARAN_OUT_COLUMNS) {
    if (c === 'Staff number') samsMap[c] = 'Staff Number';
    else if (c === 'Email address') samsMap[c] = OVERLAP_RENAMES.Email.sams;
    else samsMap[c] = c;
  }
  // Build merged column list, deduping the unified 'Gender' column.
  const seen = new Set<string>();
  const columns: string[] = [];
  for (const c of [
    ...GSM_OUT_COLUMNS.map((c) => gsmMap[c]),
    ...SAMSARAN_OUT_COLUMNS.map((c) => samsMap[c]),
  ]) {
    if (!seen.has(c)) {
      seen.add(c);
      columns.push(c);
    }
  }
  return { columns, gsmMap, samsMap };
};

interface MergedRow extends Record<string, string> {
  __source?: 'gsm' | 'samsaran' | 'both';
  __match_key?: string;
}

const outerJoin = (
  gsmRows: Record<string, string>[],
  samsRows: Record<string, string>[],
) => {
  const { columns, gsmMap, samsMap } = buildMergedColumns();
  const empty = (mapVals: Record<string, string>) =>
    Object.fromEntries(Object.values(mapVals).map((c) => [c, '']));

  const merged = new Map<string, MergedRow>();
  let unmatchedIdx = 0;

  const keyOf = (staffNum: string, email: string) => {
    const sn = (staffNum || '').toString().trim().toLowerCase();
    if (sn) return `sn:${sn}`;
    const em = (email || '').toString().trim().toLowerCase();
    if (em) return `em:${em}`;
    return `_idx:${unmatchedIdx++}`;
  };

  for (const g of gsmRows) {
    const k = keyOf(g['Staff Number'], g['Email Address']);
    const row: MergedRow = { ...empty(gsmMap), ...empty(samsMap) };
    for (const [src, dst] of Object.entries(gsmMap)) row[dst] = g[src] ?? '';
    row.__source = 'gsm';
    row.__match_key = k;
    merged.set(k, row);
  }

  for (const s of samsRows) {
    const k = keyOf(s['Staff number'], s['Email address']);
    const existing = merged.get(k);
    if (existing) {
      for (const [src, dst] of Object.entries(samsMap)) {
        const samsVal = s[src] ?? '';
        if (dst === 'Gender' || dst === 'Staff Number') {
          // Precedence: GSM wins; Samsaran only fills when GSM is blank.
          if (!existing[dst] || !String(existing[dst]).trim()) {
            existing[dst] = samsVal;
          }
        } else {
          existing[dst] = samsVal;
        }
      }
      existing.__source = 'both';
    } else {
      const row: MergedRow = { ...empty(gsmMap), ...empty(samsMap) };
      for (const [src, dst] of Object.entries(samsMap)) row[dst] = s[src] ?? '';
      row.__source = 'samsaran';
      row.__match_key = k;
      merged.set(k, row);
    }
  }

  return { columns, rows: Array.from(merged.values()) };
};

// ---- DB row mapping ----

const COLUMN_TO_DB: Record<string, string> = {
  'Full Name': 'full_name',
  'Staff Number': 'gsm_staff_number',
  'Nationality': 'nationality',
  'Gender': 'gsm_gender',
  'Date of Birth': 'date_of_birth',
  'GSM Email Address': 'gsm_email_address',
  'Service time (Current Organization)': 'service_time_current_org',
  'Official Duty Station': 'official_duty_station',
  'APA Start Date': 'apa_start_date',
  'Job Name': 'job_name',
  'Position Name': 'position_name',
  'First Incumbency Start Date': 'first_incumbency_start_date',
  'Entry on duty date WHO': 'entry_on_duty_date_who',
  'Appointment Type': 'appointment_type',
  'Contract Start Date': 'contract_start_date',
  'Contract End Date': 'contract_end_date',
  'Current Grade': 'current_grade',
  'Current Step': 'current_step',
  'Reporting lines (name of supervisor)': 'reporting_lines',
  'Category': 'category',
  'First name': 'first_name',
  'Last name': 'last_name',
  'Search name': 'search_name',
  
  
  'Samsaran Email address': 'samsaran_email_address',
  'Worker type': 'worker_type',
  'Intern': 'intern',
  'Unit': 'unit',
  'Job title': 'job_title',
  'Line manager': 'line_manager',
  'Office location': 'office_location',
  'Division': 'division',
};

const DATE_DB_COLS = new Set(['first_incumbency_start_date', 'entry_on_duty_date_who']);

const toDbRow = (row: MergedRow, importedBy: string | null) => {
  const out: Record<string, unknown> = {};
  for (const [label, dbCol] of Object.entries(COLUMN_TO_DB)) {
    const v = row[label] ?? '';
    if (DATE_DB_COLS.has(dbCol)) {
      out[dbCol] = v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
    } else {
      out[dbCol] = v === '' ? null : v;
    }
  }
  out.samsaran_gender = null;
  out.samsaran_staff_number = null;
  out.source = row.__source ?? 'gsm';
  out.match_key = row.__match_key ?? null;
  out.imported_by = importedBy;
  return out;
};

const chunk = <T,>(arr: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

export default function ImportUserbase() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [gsmFile, setGsmFile] = useState<File | null>(null);
  const [samsaranFile, setSamsaranFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [computing, setComputing] = useState(false);
  const [parsedRows, setParsedRows] = useState<MergedRow[] | null>(null);
  const [parsedColumns, setParsedColumns] = useState<string[] | null>(null);
  const [changes, setChanges] = useState<RowChange[] | null>(null);
  const [parseSummary, setParseSummary] = useState<{ gsm: number; sams: number } | null>(null);

  const bothFilesReady = !!gsmFile && !!samsaranFile;

  const handleParse = async () => {
    if (!bothFilesReady) return;
    setParsing(true);
    try {
      const [gsmRaw, samsRaw] = await Promise.all([
        readSheet(gsmFile!),
        readSheet(samsaranFile!),
      ]);
      const gsm = transformGsm(gsmRaw);
      const sams = transformSamsaran(samsRaw);
      const { columns, rows } = outerJoin(gsm, sams);

      sessionStorage.setItem(
        'userbase:merged',
        JSON.stringify({ columns, rows, generatedAt: new Date().toISOString() }),
      );

      setParsedRows(rows);
      setParsedColumns(columns);
      setParseSummary({ gsm: gsm.length, sams: sams.length });

      // Fetch existing and compute diff
      setComputing(true);
      setChanges([]);
      const existing = await fetchExistingRows();
      const diff = computeChangeSet(rows, existing);
      setChanges(diff);
      setComputing(false);

      toast({
        title: 'Parsed successfully',
        description: `${rows.length} merged records ready for review.`,
      });
    } catch (err) {
      console.error('Parse error', err);
      toast({
        title: 'Parse failed',
        description: err instanceof Error ? err.message : 'Unable to parse the files.',
        variant: 'destructive',
      });
      setComputing(false);
    } finally {
      setParsing(false);
    }
  };

  const handleCancelPreview = () => {
    setParsedRows(null);
    setParsedColumns(null);
    setChanges(null);
    setParseSummary(null);
  };

  const handleConfirmSave = async () => {
    if (!parsedRows || !changes) return;
    setSaving(true);
    try {
      toast({ title: 'Saving to database…', description: `Persisting ${parsedRows.length} records.` });

      const { data: authData } = await supabase.auth.getUser();
      const importedBy = authData.user?.id ?? null;

      const { error: delErr } = await supabase
        .from('users_clean')
        .delete()
        .not('id', 'is', null);
      if (delErr) throw delErr;

      const dbRows = parsedRows.map((r) => toDbRow(r, importedBy));
      for (const batch of chunk(dbRows, 500)) {
        const { error: insErr } = await supabase
          .from('users_clean')
          .insert(batch as any);
        if (insErr) throw insErr;
      }

      const newCount = changes.filter((c) => c.status === 'new').length;
      const updatedCount = changes.filter((c) => c.status === 'updated').length;
      toast({
        title: 'Userbase saved',
        description: `${parsedRows.length} records saved (${newCount} new, ${updatedCount} updated).`,
      });
      navigate('/admin/userbase');
    } catch (err) {
      console.error('Save error', err);
      toast({
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Unable to persist the merged userbase.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const showPreview = parsedRows !== null;

  return (
    <Layout>
      <div className="container mx-auto py-8 max-w-6xl">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Import Userbase</CardTitle>
            <CardDescription>
              Upload GSM and Samsaran extracts to refresh the user base data.
            </CardDescription>
          </CardHeader>
        </Card>

        {!showPreview && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <DropZone
                title="Import GSM Extract"
                subtitle="Upload a CSV or Excel file containing GSM Assignment details data"
                inputId="gsm-extract-input"
                file={gsmFile}
                onFileChange={setGsmFile}
              />
              <DropZone
                title="Import Samsaran Extract"
                subtitle="Upload a Samsaran worker extract"
                inputId="samsaran-extract-input"
                file={samsaranFile}
                onFileChange={setSamsaranFile}
              />
            </div>

            <div className="mt-6 flex flex-col items-center gap-2">
              <Button
                onClick={handleParse}
                disabled={!bothFilesReady || parsing}
                className="w-full max-w-sm"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {parsing ? 'Parsing…' : 'Parse Data'}
              </Button>
              {!bothFilesReady && (
                <p className="text-xs text-muted-foreground">
                  Upload both GSM and Samsaran extracts to enable parsing.
                </p>
              )}
            </div>
          </>
        )}

        {showPreview && (
          <>
            {parseSummary && (
              <p className="text-sm text-muted-foreground mb-4">
                Parsed {parsedRows!.length} merged records (GSM: {parseSummary.gsm}, Samsaran: {parseSummary.sams}).
              </p>
            )}
            <ImportChangePreview
              changes={changes ?? []}
              loading={computing}
              onCancel={handleCancelPreview}
              onConfirm={handleConfirmSave}
              saving={saving}
            />
          </>
        )}
      </div>
    </Layout>
  );
}
