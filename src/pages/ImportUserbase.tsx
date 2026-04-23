import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Upload, ArrowLeft, FileSpreadsheet, X, Sparkles } from 'lucide-react';
import { DIVISION_UNITS } from '@/lib/organizationConstants';

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
  // Fallback: substring match
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

// Find original header in a row matching the wanted column (case/whitespace-insensitive)
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

// Columns that overlap logically — prefix with provenance
const OVERLAP_RENAMES: Record<string, { gsm: string; sams: string }> = {
  StaffNumber: { gsm: 'GSM Staff Number', sams: 'Samsaran Staff number' },
  Gender: { gsm: 'GSM Gender', sams: 'Samsaran Gender' },
  Email: { gsm: 'GSM Email Address', sams: 'Samsaran Email address' },
};

const buildMergedColumns = (): { columns: string[]; gsmMap: Record<string, string>; samsMap: Record<string, string> } => {
  const gsmMap: Record<string, string> = {};
  const samsMap: Record<string, string> = {};
  for (const c of GSM_OUT_COLUMNS) {
    if (c === 'Staff Number') gsmMap[c] = OVERLAP_RENAMES.StaffNumber.gsm;
    else if (c === 'Gender') gsmMap[c] = OVERLAP_RENAMES.Gender.gsm;
    else if (c === 'Email Address') gsmMap[c] = OVERLAP_RENAMES.Email.gsm;
    else gsmMap[c] = c;
  }
  for (const c of SAMSARAN_OUT_COLUMNS) {
    if (c === 'Staff number') samsMap[c] = OVERLAP_RENAMES.StaffNumber.sams;
    else if (c === 'Gender') samsMap[c] = OVERLAP_RENAMES.Gender.sams;
    else if (c === 'Email address') samsMap[c] = OVERLAP_RENAMES.Email.sams;
    else samsMap[c] = c;
  }
  const columns = [
    ...GSM_OUT_COLUMNS.map((c) => gsmMap[c]),
    ...SAMSARAN_OUT_COLUMNS.map((c) => samsMap[c]),
  ];
  return { columns, gsmMap, samsMap };
};

const outerJoin = (
  gsmRows: Record<string, string>[],
  samsRows: Record<string, string>[],
) => {
  const { columns, gsmMap, samsMap } = buildMergedColumns();
  const empty = (mapVals: Record<string, string>) =>
    Object.fromEntries(Object.values(mapVals).map((c) => [c, '']));

  const merged = new Map<string, Record<string, string>>();
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
    const row: Record<string, string> = { ...empty(gsmMap), ...empty(samsMap) };
    for (const [src, dst] of Object.entries(gsmMap)) row[dst] = g[src] ?? '';
    merged.set(k, row);
  }

  for (const s of samsRows) {
    const k = keyOf(s['Staff number'], s['Email address']);
    const existing = merged.get(k) ?? { ...empty(gsmMap), ...empty(samsMap) };
    for (const [src, dst] of Object.entries(samsMap)) existing[dst] = s[src] ?? '';
    merged.set(k, existing);
  }

  return { columns, rows: Array.from(merged.values()) };
};

export default function ImportUserbase() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [gsmFile, setGsmFile] = useState<File | null>(null);
  const [samsaranFile, setSamsaranFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);

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
      toast({
        title: 'Parsing complete',
        description: `Merged ${rows.length} records (GSM: ${gsm.length}, Samsaran: ${sams.length}).`,
      });
      navigate('/admin/userbase');
    } catch (err) {
      console.error('Parse error', err);
      toast({
        title: 'Parsing failed',
        description: err instanceof Error ? err.message : 'Unable to read one of the files.',
        variant: 'destructive',
      });
    } finally {
      setParsing(false);
    }
  };

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
      </div>
    </Layout>
  );
}
