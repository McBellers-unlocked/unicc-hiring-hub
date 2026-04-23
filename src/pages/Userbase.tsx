import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { EditableCell } from '@/components/userbase/EditableCell';
import { MissingValuesPanel, REQUIRED_FIELDS } from '@/components/userbase/MissingValuesPanel';
import * as XLSX from 'xlsx';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Download,
  Upload as UploadIcon,
  Search,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Filter,
  Columns3,
  X,
  Trash2,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { MAPPED_COLUMNS } from '@/lib/userbaseChangeSet';

// --- Column metadata ---

interface ColDef {
  key: string;
  label: string;
  filter?: 'division' | 'unit' | 'worker_type' | 'category' | 'source' | 'office_location';
}

const FILTER_KEYS: Record<string, ColDef['filter']> = {
  division: 'division',
  unit: 'unit',
  worker_type: 'worker_type',
  category: 'category',
  office_location: 'office_location',
};

const COLUMNS: ColDef[] = [
  ...MAPPED_COLUMNS.map((c) => ({
    key: c.db,
    label: c.label,
    filter: FILTER_KEYS[c.db],
  })),
  { key: 'source', label: 'Source', filter: 'source' },
];

const DEFAULT_VISIBLE_ORDER = [
  'samsaran_email_address', 'gsm_email_address', 'gsm_staff_number',
  'full_name', 'first_name', 'last_name', 'gsm_gender',
  'worker_type', 'unit', 'division',
  'official_duty_station', 'office_location',
  'position_name', 'job_title',
  'reporting_lines', 'line_manager',
  'current_grade', 'nationality',
];
const DEFAULT_VISIBLE = new Set(DEFAULT_VISIBLE_ORDER);

const SOURCE_BY_DB: Record<string, 'gsm' | 'samsaran'> = {
  full_name: 'gsm', first_name: 'gsm', last_name: 'gsm',
  gsm_staff_number: 'gsm', gsm_email_address: 'gsm', gsm_gender: 'gsm',
  nationality: 'gsm', date_of_birth: 'gsm', service_time_current_org: 'gsm',
  official_duty_station: 'gsm', apa_start_date: 'gsm', job_name: 'gsm',
  position_name: 'gsm', first_incumbency_start_date: 'gsm', entry_on_duty_date_who: 'gsm',
  appointment_type: 'gsm', contract_start_date: 'gsm', contract_end_date: 'gsm',
  current_grade: 'gsm', current_step: 'gsm', reporting_lines: 'gsm',
  category: 'gsm', search_name: 'gsm',
  samsaran_staff_number: 'samsaran', samsaran_email_address: 'samsaran',
  worker_type: 'samsaran', intern: 'samsaran', unit: 'samsaran',
  job_title: 'samsaran', line_manager: 'samsaran', office_location: 'samsaran',
  division: 'samsaran',
};

const VISIBLE_COLS_KEY = 'userbase:visible-columns:v3';
const PAGE_SIZE_KEY = 'userbase:page-size';

const SEARCH_COLS = [
  'full_name', 'gsm_email_address', 'samsaran_email_address',
  'gsm_staff_number', 'samsaran_staff_number', 'unit', 'job_title',
];

type SortDir = 'asc' | 'desc' | null;

interface Filters {
  division: string[];
  unit: string[];
  worker_type: string[];
  category: string[];
  source: string[];
  office_location: string[];
}

const emptyFilters: Filters = {
  division: [], unit: [], worker_type: [], category: [], source: [], office_location: [],
};

// --- Helpers ---

const useDebounced = <T,>(value: T, ms: number): T => {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
};

const fetchDistinct = async (col: keyof Filters): Promise<string[]> => {
  const { data, error } = await supabase
    .from('users_clean')
    .select(col)
    .not(col, 'is', null)
    .limit(5000);
  if (error) throw error;
  const set = new Set<string>();
  (data ?? []).forEach((r: any) => {
    const v = r[col];
    if (v && String(v).trim()) set.add(String(v));
  });
  return Array.from(set).sort();
};

export default function Userbase() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { userRoles } = useAuth();
  const canEdit = userRoles.includes('Admin') || userRoles.includes('HR Assistant');
  const lastToastRef = useRef<number>(0);

  const REQUIRED_KEYS = useMemo(() => new Set(REQUIRED_FIELDS.map((f) => f.key)), []);
  const DATE_KEYS = useMemo(
    () => new Set(['first_incumbency_start_date', 'entry_on_duty_date_who', 'date_of_birth', 'apa_start_date', 'contract_start_date', 'contract_end_date']),
    [],
  );

  const handleCellSave = async (rowId: string, column: string, newValue: string | null): Promise<boolean> => {
    const queryKeys = queryClient.getQueriesData({ queryKey: ['users_clean'] });
    const previousSnapshots: Array<[any, any]> = [];
    queryKeys.forEach(([key, value]: any) => {
      if (!value || !value.rows) return;
      previousSnapshots.push([key, value]);
      const newRows = value.rows.map((r: any) =>
        r.id === rowId ? { ...r, [column]: newValue } : r,
      );
      queryClient.setQueryData(key, { ...value, rows: newRows });
    });

    const { error } = await supabase
      .from('users_clean')
      .update({ [column]: newValue, imported_at: new Date().toISOString() })
      .eq('id', rowId);

    if (error) {
      previousSnapshots.forEach(([key, value]) => queryClient.setQueryData(key, value));
      toast.error(`Failed to save: ${error.message}`);
      return false;
    }

    const now = Date.now();
    if (now - lastToastRef.current > 3000) {
      toast.success('Saved');
      lastToastRef.current = now;
    }

    queryClient.invalidateQueries({ queryKey: ['users_clean:missing'] });
    if (['division', 'unit', 'worker_type', 'category', 'source', 'office_location'].includes(column)) {
      queryClient.invalidateQueries({ queryKey: ['users_clean:distinct', column] });
    }
    return true;
  };

  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteRow = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    const { error } = await supabase.from('users_clean').delete().eq('id', pendingDelete.id);
    setDeleting(false);
    if (error) {
      toast.error(`Failed to delete: ${error.message}`);
      return;
    }
    toast.success('Row deleted');
    setPendingDelete(null);
    queryClient.invalidateQueries({ queryKey: ['users_clean'] });
    queryClient.invalidateQueries({ queryKey: ['users_clean:meta'] });
    queryClient.invalidateQueries({ queryKey: ['users_clean:missing'] });
  };

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(() => {
    const v = Number(localStorage.getItem(PAGE_SIZE_KEY));
    return [20, 50, 100, 250].includes(v) ? v : 20;
  });
  const [sortKey, setSortKey] = useState<string>('imported_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search, 300);
  const [filters, setFilters] = useState<Filters>(emptyFilters);

  const [visible, setVisible] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(VISIBLE_COLS_KEY);
      if (raw) return new Set(JSON.parse(raw));
    } catch {
      // ignore
    }
    return new Set(DEFAULT_VISIBLE);
  });

  useEffect(() => {
    localStorage.setItem(VISIBLE_COLS_KEY, JSON.stringify(Array.from(visible)));
  }, [visible]);

  useEffect(() => {
    localStorage.setItem(PAGE_SIZE_KEY, String(pageSize));
  }, [pageSize]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters, pageSize, sortKey, sortDir]);

  const buildQuery = (forCount = false) => {
    let q = supabase
      .from('users_clean')
      .select('*', { count: forCount ? 'exact' : undefined as any });

    if (debouncedSearch.trim()) {
      const term = debouncedSearch.trim().replace(/[,()]/g, ' ');
      const orStr = SEARCH_COLS.map((c) => `${c}.ilike.%${term}%`).join(',');
      q = q.or(orStr);
    }

    (Object.keys(filters) as (keyof Filters)[]).forEach((k) => {
      const vals = filters[k];
      if (vals.length) q = q.in(k, vals);
    });

    return q;
  };

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['users_clean', { page, pageSize, sortKey, sortDir, debouncedSearch, filters }],
    queryFn: async () => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      let q = buildQuery(true).range(from, to);
      if (sortDir) {
        q = q.order(sortKey, { ascending: sortDir === 'asc', nullsFirst: false });
      } else {
        q = q.order('imported_at', { ascending: false });
      }
      const { data, error, count } = await q;
      if (error) throw error;
      return { rows: (data ?? []) as Record<string, any>[], count: count ?? 0 };
    },
  });

  const { data: tableInfo } = useQuery({
    queryKey: ['users_clean:meta'],
    queryFn: async () => {
      const { count } = await supabase
        .from('users_clean')
        .select('id', { count: 'exact', head: true });
      const { data: latest } = await supabase
        .from('users_clean')
        .select('imported_at, imported_by')
        .order('imported_at', { ascending: false })
        .limit(1);
      return {
        total: count ?? 0,
        latest: latest?.[0] ?? null,
      };
    },
  });

  const filterCols: (keyof Filters)[] = ['division', 'unit', 'worker_type', 'category', 'source', 'office_location'];
  const distinctQueries = filterCols.map((c) =>
    useQuery({
      queryKey: ['users_clean:distinct', c],
      queryFn: () => fetchDistinct(c),
      enabled: (tableInfo?.total ?? 0) > 0,
    })
  );
  const distinct: Record<keyof Filters, string[]> = {
    division: distinctQueries[0].data ?? [],
    unit: distinctQueries[1].data ?? [],
    worker_type: distinctQueries[2].data ?? [],
    category: distinctQueries[3].data ?? [],
    source: distinctQueries[4].data ?? [],
    office_location: distinctQueries[5].data ?? [],
  };

  const visibleCols = useMemo(() => {
    const byKey = new Map(COLUMNS.map((c) => [c.key, c]));
    const ordered: ColDef[] = [];
    const seen = new Set<string>();
    DEFAULT_VISIBLE_ORDER.forEach((k) => {
      if (visible.has(k) && byKey.has(k)) {
        ordered.push(byKey.get(k)!);
        seen.add(k);
      }
    });
    COLUMNS.forEach((c) => {
      if (visible.has(c.key) && !seen.has(c.key)) ordered.push(c);
    });
    return ordered;
  }, [visible]);

  const total = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const fromN = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const toN = Math.min(page * pageSize, total);

  const toggleSort = (key: string) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir('asc');
    } else if (sortDir === 'asc') {
      setSortDir('desc');
    } else if (sortDir === 'desc') {
      setSortDir(null);
      setSortKey('imported_at');
    } else {
      setSortDir('asc');
    }
  };

  const sortIcon = (key: string) => {
    if (sortKey !== key || !sortDir) return <ChevronsUpDown className="w-3 h-3 opacity-40" />;
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  };

  const toggleFilter = (key: keyof Filters, val: string) => {
    setFilters((f) => {
      const cur = new Set(f[key]);
      if (cur.has(val)) cur.delete(val); else cur.add(val);
      return { ...f, [key]: Array.from(cur) };
    });
  };

  const clearFilter = (key: keyof Filters, val?: string) => {
    setFilters((f) => ({ ...f, [key]: val ? f[key].filter((v) => v !== val) : [] }));
  };

  const clearAllFilters = () => setFilters(emptyFilters);

  const activeFilterCount = Object.values(filters).reduce((s, a) => s + a.length, 0);

  const exportRows = (rows: Record<string, any>[]) => {
    const cols = visibleCols.map((c) => c.label);
    const data = rows.map((r) => {
      const out: Record<string, any> = {};
      visibleCols.forEach((c) => { out[c.label] = r[c.key] ?? ''; });
      return out;
    });
    const ws = XLSX.utils.json_to_sheet(data, { header: cols });
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `userbase-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadCurrentPage = () => exportRows(data?.rows ?? []);

  const downloadAll = async () => {
    const all: Record<string, any>[] = [];
    const chunkSize = 1000;
    for (let i = 0; i < total; i += chunkSize) {
      let q = buildQuery(false).range(i, i + chunkSize - 1);
      if (sortDir) q = q.order(sortKey, { ascending: sortDir === 'asc', nullsFirst: false });
      else q = q.order('imported_at', { ascending: false });
      const { data: batch, error } = await q;
      if (error) { console.error(error); break; }
      all.push(...(batch ?? []));
    }
    exportRows(all);
  };

  if (tableInfo && tableInfo.total === 0) {
    return (
      <Layout>
        <div className="container mx-auto py-8 max-w-3xl">
          <Card>
            <CardHeader>
              <CardTitle>Userbase</CardTitle>
              <CardDescription>
                No userbase data in the database yet. Import GSM and Samsaran extracts to populate it.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/admin/import-userbase')}>
                <UploadIcon className="w-4 h-4 mr-2" />
                Go to Import Userbase
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-6 max-w-[95vw]">
        <div className="mb-4">
          <h1 className="text-2xl font-semibold">Userbase</h1>
          <p className="text-sm text-muted-foreground">
            {total.toLocaleString()} rows
            {tableInfo?.latest?.imported_at && (
              <> · last imported {new Date(tableInfo.latest.imported_at).toLocaleString()}</>
            )}
            {canEdit && <> · <span className="text-foreground/70">editable</span> (double-click a cell)</>}
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-3 mb-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search name, email, staff #, unit, job title…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">
                  <Filter className="w-4 h-4 mr-2" />
                  Filters
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="ml-2">{activeFilterCount}</Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-80 max-h-[70vh] overflow-auto">
                <div className="space-y-4">
                  {filterCols.map((fc) => (
                    <FilterGroup
                      key={fc}
                      label={fc.replace('_', ' ')}
                      options={distinct[fc]}
                      selected={filters[fc]}
                      onToggle={(v) => toggleFilter(fc, v)}
                    />
                  ))}
                  {activeFilterCount > 0 && (
                    <Button variant="ghost" size="sm" className="w-full" onClick={clearAllFilters}>
                      Clear all filters
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Columns3 className="w-4 h-4 mr-2" />
                  Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="max-h-[70vh] overflow-auto">
                <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {COLUMNS.map((c) => (
                  <DropdownMenuCheckboxItem
                    key={c.key}
                    checked={visible.has(c.key)}
                    onCheckedChange={(v) => {
                      setVisible((cur) => {
                        const next = new Set(cur);
                        if (v) next.add(c.key); else next.delete(c.key);
                        return next;
                      });
                    }}
                  >
                    {c.label}
                  </DropdownMenuCheckboxItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setVisible(new Set(DEFAULT_VISIBLE))}>
                  Reset to defaults
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Download CSV
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={downloadCurrentPage}>Current page</DropdownMenuItem>
                <DropdownMenuItem onClick={downloadAll}>All matching filters</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {activeFilterCount > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {(Object.keys(filters) as (keyof Filters)[]).flatMap((k) =>
              filters[k].map((v) => (
                <Badge key={`${k}:${v}`} variant="secondary" className="gap-1">
                  <span className="text-xs opacity-70">{k.replace('_', ' ')}:</span>
                  <span>{v}</span>
                  <button
                    onClick={() => clearFilter(k, v)}
                    className="hover:text-destructive"
                    aria-label={`Remove ${k} ${v}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))
            )}
          </div>
        )}

        <div className="border rounded-md overflow-hidden">
          <div className="overflow-x-auto">
            <div className="overflow-y-auto" style={{ maxHeight: '65vh' }}>
              <Table className="min-w-max">
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    {visibleCols.map((c) => {
                      const src = SOURCE_BY_DB[c.key];
                      const tint = src === 'gsm'
                        ? 'bg-green-100 text-green-900 dark:bg-green-950/40 dark:text-green-200'
                        : src === 'samsaran'
                          ? 'bg-blue-100 text-blue-900 dark:bg-blue-950/40 dark:text-blue-200'
                          : '';
                      return (
                        <TableHead key={c.key} className={`whitespace-nowrap ${tint}`}>
                          <button
                            className="inline-flex items-center gap-1 hover:text-foreground"
                            onClick={() => toggleSort(c.key)}
                          >
                            {c.label}
                            {sortIcon(c.key)}
                          </button>
                        </TableHead>
                      );
                    })}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && (
                    <TableRow>
                      <TableCell colSpan={visibleCols.length} className="text-center py-8 text-muted-foreground">
                        Loading…
                      </TableCell>
                    </TableRow>
                  )}
                  {isError && (
                    <TableRow>
                      <TableCell colSpan={visibleCols.length} className="text-center py-8 text-destructive">
                        Error loading data: {error instanceof Error ? error.message : 'unknown'}
                      </TableCell>
                    </TableRow>
                  )}
                  {!isLoading && !isError && (data?.rows.length ?? 0) === 0 && (
                    <TableRow>
                      <TableCell colSpan={visibleCols.length} className="text-center py-8 text-muted-foreground">
                        No matching rows.
                      </TableCell>
                    </TableRow>
                  )}
                  {!isLoading && !isError && data?.rows.map((row) => (
                    <TableRow key={row.id}>
                      {visibleCols.map((c) => (
                        <TableCell key={c.key} className="whitespace-nowrap text-sm p-1">
                          <EditableCell
                            value={row[c.key]}
                            rowId={row.id}
                            column={c.key}
                            isDate={DATE_KEYS.has(c.key)}
                            isRequired={REQUIRED_KEYS.has(c.key)}
                            editable={canEdit}
                            onSave={handleCellSave}
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-3">
          <div className="text-sm text-muted-foreground">
            Showing {fromN.toLocaleString()}–{toN.toLocaleString()} of {total.toLocaleString()}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Rows per page</span>
              <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                <SelectTrigger className="w-[80px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[20, 50, 100, 250].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Pagination className="mx-0 w-auto">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={(e) => { e.preventDefault(); if (page > 1) setPage(page - 1); }}
                    className={page <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
                <PaginationItem>
                  <span className="px-3 text-sm">
                    Page {page} of {totalPages}
                  </span>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    onClick={(e) => { e.preventDefault(); if (page < totalPages) setPage(page + 1); }}
                    className={page >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </div>

        <MissingValuesPanel workerTypeOptions={distinct.worker_type} />
      </div>
    </Layout>
  );
}

interface FilterGroupProps {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
}

function FilterGroup({ label, options, selected, onToggle }: FilterGroupProps) {
  const [q, setQ] = useState('');
  const filtered = q
    ? options.filter((o) => o.toLowerCase().includes(q.toLowerCase()))
    : options;

  return (
    <div>
      <div className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 capitalize">
        {label}
      </div>
      {options.length > 8 && (
        <Input
          placeholder={`Search ${label}…`}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="h-8 text-sm mb-2"
        />
      )}
      <div className="space-y-1 max-h-40 overflow-auto pr-1">
        {filtered.length === 0 && (
          <div className="text-xs text-muted-foreground italic">No options</div>
        )}
        {filtered.map((o) => (
          <label key={o} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/40 rounded px-1 py-0.5">
            <Checkbox checked={selected.includes(o)} onCheckedChange={() => onToggle(o)} />
            <span className="truncate">{o}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
