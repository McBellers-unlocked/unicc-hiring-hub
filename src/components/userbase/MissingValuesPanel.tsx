import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Download, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const REQUIRED_FIELDS: { key: string; label: string }[] = [
  { key: 'full_name', label: 'Full Name' },
  { key: 'samsaran_email_address', label: 'Samsaran Email' },
  { key: 'gsm_email_address', label: 'GSM Email' },
  { key: 'division', label: 'Division' },
  { key: 'unit', label: 'Unit' },
  { key: 'job_title', label: 'Job Title' },
  { key: 'worker_type', label: 'Worker Type' },
  { key: 'office_location', label: 'Office Location' },
  { key: 'line_manager', label: 'Line Manager' },
  { key: 'category', label: 'Category' },
];

const GSM_ORIGIN_REQUIRED_FIELDS = new Set(['full_name', 'gsm_email_address']);

type MissingValuesRow = Record<string, unknown> & {
  id: string;
  full_name?: string | null;
  gsm_staff_number?: string | null;
  samsaran_staff_number?: string | null;
  gsm_email_address?: string | null;
  samsaran_email_address?: string | null;
  worker_type?: string | null;
  source?: string | null;
};

const isBlank = (v: unknown) => v == null || String(v).trim() === '';

const getMissingFields = (row: MissingValuesRow) =>
  REQUIRED_FIELDS.filter((field) => isBlank(row[field.key]));

const isAffiliateWorker = (row: MissingValuesRow) =>
  String(row.worker_type ?? '').trim().toLowerCase() === 'affiliate';

const isMissingOnlyGsmOriginFields = (row: MissingValuesRow) => {
  const missing = getMissingFields(row);
  return (
    missing.length > 0 &&
    missing.every((field) => GSM_ORIGIN_REQUIRED_FIELDS.has(field.key))
  );
};

interface Props {
  workerTypeOptions: string[];
}

export function MissingValuesPanel({ workerTypeOptions }: Props) {
  const [workerType, setWorkerType] = useState<string>('all');
  const [pageSize, setPageSize] = useState<string>('50');

  const { data, isLoading } = useQuery({
    queryKey: ['users_clean:missing', { workerType, pageSize }],
    queryFn: async () => {
      const selectCols = [
        'id',
        'full_name',
        'gsm_staff_number',
        'samsaran_staff_number',
        'gsm_email_address',
        'samsaran_email_address',
        'worker_type',
        'source',
        ...REQUIRED_FIELDS.map((f) => f.key),
      ];
      const uniqueCols = Array.from(new Set(selectCols)).join(',');

      // Server-side narrow: any required column is null
      const orPredicate = REQUIRED_FIELDS.map((f) => `${f.key}.is.null`).join(',');

      let q = supabase.from('users_clean').select(uniqueCols).or(orPredicate);
      if (workerType !== 'all') q = q.eq('worker_type', workerType);

      const limit = pageSize === 'all' ? 5000 : Number(pageSize);
      q = q.limit(limit);

      const { data, error } = await q;
      if (error) throw error;
      
      let rows = (data ?? []) as unknown as MissingValuesRow[];

      // Second pass: rows where any required field is '' (not null) — fetch a broader page
      // and merge. Bounded to 5000 rows total.
      if (rows.length < limit) {
        let q2 = supabase
          .from('users_clean')
          .select(uniqueCols)
          .limit(limit);
        if (workerType !== 'all') q2 = q2.eq('worker_type', workerType);
        const { data: data2 } = await q2;
        const existing = new Set(rows.map((r) => r.id));
        ((data2 ?? []) as unknown as MissingValuesRow[]).forEach((r) => {
          if (!existing.has(r.id) && getMissingFields(r).length > 0) {
            rows.push(r);
            existing.add(r.id);
          }
        });
      }

      // Final client-side filter to be sure
      rows = rows.filter(
        (r) => getMissingFields(r).length > 0 && !(isAffiliateWorker(r) && isMissingOnlyGsmOriginFields(r)),
      );
      return rows;
    },
  });

  const rows = data ?? [];

  const exportCsv = () => {
    const exportData = rows.map((r) => ({
      id: r.id,
      name: r.full_name ?? r.samsaran_email_address ?? r.gsm_email_address ?? '',
      email: r.samsaran_email_address ?? r.gsm_email_address ?? '',
      worker_type: r.worker_type ?? '',
      missing_fields: getMissingFields(r)
        .map((f) => f.label)
        .join('; '),
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `userbase-missing-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="mt-6">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <CardTitle className="text-base">Rows with missing values</CardTitle>
            <Badge variant="destructive" className="ml-1">
              {rows.length} {rows.length === 1 ? 'row' : 'rows'}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Worker type</span>
              <Select value={workerType} onValueChange={setWorkerType}>
                <SelectTrigger className="w-[180px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {workerTypeOptions.map((wt) => (
                    <SelectItem key={wt} value={wt}>
                      {wt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Select value={pageSize} onValueChange={setPageSize}>
              <SelectTrigger className="w-[100px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="50">Show 50</SelectItem>
                <SelectItem value="100">Show 100</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={rows.length === 0}>
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-md overflow-auto" style={{ maxHeight: '40vh' }}>
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Worker Type</TableHead>
                <TableHead>Missing Fields</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                    No rows with missing values 🎉
                  </TableCell>
                </TableRow>
              )}
              {!isLoading &&
                rows.map((r) => {
                  const missing = getMissingFields(r);
                  const displayName =
                    r.full_name ||
                    r.samsaran_email_address ||
                    r.gsm_email_address ||
                    r.samsaran_staff_number ||
                    r.gsm_staff_number ||
                    '(unknown)';
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm font-medium whitespace-nowrap">
                        {displayName}
                      </TableCell>
                      <TableCell>
                        {r.source && (
                          <Badge variant="secondary" className="capitalize">
                            {r.source}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {r.worker_type ?? '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {missing.map((f) => (
                            <Badge
                              key={f.key}
                              variant="outline"
                              className="text-destructive border-destructive/40 bg-destructive/5 text-xs"
                            >
                              {f.label}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

export { REQUIRED_FIELDS };
