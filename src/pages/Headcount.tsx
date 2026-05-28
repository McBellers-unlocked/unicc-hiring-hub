import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { Layout } from '@/components/Layout';
import { NationalityReport } from '@/components/analytics/NationalityReport';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Filter, X, Upload as UploadIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { GRADES } from '@/lib/organizationConstants';

// --- Types ---
type Filters = {
  worker_type: string[];
  division: string[];
  office_location: string[];
};
const emptyFilters: Filters = { worker_type: [], division: [], office_location: [] };

type Row = {
  gsm_gender: string | null;
  samsaran_gender: string | null;
  worker_type: string | null;
  category: string | null;
  division: string | null;
  office_location: string | null;
  current_grade: string | null;
  nationality: string | null;
  appointment_type: string | null;
};

// --- Chart palette (semantic-ish, brand primary first) ---
const PALETTE = [
  'hsl(199 100% 44%)', // brand primary #009CDE-ish
  'hsl(280 65% 55%)',
  'hsl(160 60% 45%)',
  'hsl(35 95% 55%)',
  'hsl(340 75% 55%)',
  'hsl(220 70% 55%)',
  'hsl(0 75% 60%)',
  'hsl(100 55% 45%)',
];

const GENDER_COLORS: Record<string, string> = {
  Man: 'hsl(199 100% 44%)',
  Woman: 'hsl(340 75% 60%)',
  'Other/Unknown': 'hsl(220 10% 60%)',
};

// --- Helpers ---
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

const normalizeGender = (row: Row): 'Man' | 'Woman' | 'Other/Unknown' => {
  const raw = (row.samsaran_gender ?? row.gsm_gender ?? '').toString().trim().toLowerCase();
  if (raw === 'man' || raw === 'm' || raw === 'male') return 'Man';
  if (raw === 'woman' || raw === 'f' || raw === 'female') return 'Woman';
  return 'Other/Unknown';
};

const FilterGroup = ({
  label, options, selected, onToggle,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) => (
  <div>
    <div className="text-xs font-medium uppercase text-muted-foreground mb-2">{label}</div>
    <div className="space-y-1.5 max-h-48 overflow-auto pr-1">
      {options.length === 0 && <div className="text-xs text-muted-foreground">No values</div>}
      {options.map((o) => (
        <label key={o} className="flex items-center gap-2 text-sm cursor-pointer">
          <Checkbox checked={selected.includes(o)} onCheckedChange={() => onToggle(o)} />
          <span className="truncate">{o}</span>
        </label>
      ))}
    </div>
  </div>
);

// --- Page ---
export default function Headcount() {
  const navigate = useNavigate();
  const { userRoles } = useAuth();
  const hasAccess =
    userRoles.includes('Admin') ||
    userRoles.includes('HR Assistant') ||
    userRoles.includes('Chief of HR');

  const [filters, setFilters] = useState<Filters>(emptyFilters);

  // Distinct values for filter dropdowns (shared cache key with Userbase)
  const distinctWorker = useQuery({
    queryKey: ['users_clean:distinct', 'worker_type'],
    queryFn: () => fetchDistinct('worker_type'),
    enabled: hasAccess,
  });
  const distinctDivision = useQuery({
    queryKey: ['users_clean:distinct', 'division'],
    queryFn: () => fetchDistinct('division'),
    enabled: hasAccess,
  });
  const distinctLocation = useQuery({
    queryKey: ['users_clean:distinct', 'office_location'],
    queryFn: () => fetchDistinct('office_location'),
    enabled: hasAccess,
  });

  // Last imported_at
  const meta = useQuery({
    queryKey: ['users_clean:headcount-meta'],
    queryFn: async () => {
      const { count } = await supabase
        .from('users_clean')
        .select('id', { count: 'exact', head: true });
      const { data } = await supabase
        .from('users_clean')
        .select('imported_at')
        .order('imported_at', { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();
      return { total: count ?? 0, imported_at: data?.imported_at ?? null };
    },
    enabled: hasAccess,
  });

  // Main rows query — pulls all matching rows in chunks for client-side aggregation
  const rowsQuery = useQuery({
    queryKey: ['users_clean:headcount', filters],
    enabled: hasAccess,
    queryFn: async () => {
      const all: Row[] = [];
      const CHUNK = 1000;
      let from = 0;
      // safety cap to avoid runaway loops
      for (let i = 0; i < 50; i++) {
        let q = supabase
          .from('users_clean')
          .select('gsm_gender, samsaran_gender, worker_type, category, division, office_location, current_grade, nationality, appointment_type')
          .range(from, from + CHUNK - 1);

        if (filters.worker_type.length) q = q.in('worker_type', filters.worker_type);
        if (filters.division.length) q = q.in('division', filters.division);
        if (filters.office_location.length) q = q.in('office_location', filters.office_location);

        const { data, error } = await q;
        if (error) throw error;
        const batch = (data ?? []) as Row[];
        all.push(...batch);
        if (batch.length < CHUNK) break;
        from += CHUNK;
      }
      return all;
    },
  });

  const rows = rowsQuery.data ?? [];

  // --- Aggregations ---
  const agg = useMemo(() => {
    const total = rows.length;

    const genderMap = new Map<string, number>();
    const workerMap = new Map<string, number>();
    const categoryMap = new Map<string, number>();
    const divisionMap = new Map<string, number>();
    const gradeMap = new Map<string, number>();
    const locationMap = new Map<string, number>();
    const nationalityMap = new Map<string, number>();
    const divGenderMap = new Map<string, { Man: number; Woman: number }>();
    const workerByDivision = new Map<string, Map<string, number>>(); // division -> worker_type -> count

    rows.forEach((r) => {
      const g = normalizeGender(r);
      genderMap.set(g, (genderMap.get(g) ?? 0) + 1);

      const wt = (r.worker_type ?? '').trim() || 'Unknown';
      workerMap.set(wt, (workerMap.get(wt) ?? 0) + 1);

      const cat = (r.category ?? '').trim() || 'Unspecified';
      categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + 1);

      const div = (r.division ?? '').trim() || 'Unassigned';
      divisionMap.set(div, (divisionMap.get(div) ?? 0) + 1);

      const grade = (r.current_grade ?? '').trim();
      if (grade) gradeMap.set(grade, (gradeMap.get(grade) ?? 0) + 1);

      const loc = (r.office_location ?? '').trim() || 'Unspecified';
      locationMap.set(loc, (locationMap.get(loc) ?? 0) + 1);

      const nat = (r.nationality ?? '').trim();
      if (nat) nationalityMap.set(nat, (nationalityMap.get(nat) ?? 0) + 1);

      if (g === 'Man' || g === 'Woman') {
        const cur = divGenderMap.get(div) ?? { Man: 0, Woman: 0 };
        cur[g] += 1;
        divGenderMap.set(div, cur);
      }

      const inner = workerByDivision.get(div) ?? new Map<string, number>();
      inner.set(wt, (inner.get(wt) ?? 0) + 1);
      workerByDivision.set(div, inner);
    });

    const gender = Array.from(genderMap.entries()).map(([name, value]) => ({ name, value }));
    const workerPie = Array.from(workerMap.entries()).map(([name, value]) => ({ name, value }));
    const category = Array.from(categoryMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const divisions = Array.from(divisionMap.entries())
      .map(([name, value]) => ({ name, value, share: total ? value / total : 0 }))
      .sort((a, b) => b.value - a.value);

    // Grade ordered canonically; include any unknown grades at the end
    const knownGrades = GRADES.filter((g) => gradeMap.has(g));
    const extraGrades = Array.from(gradeMap.keys()).filter((g) => !GRADES.includes(g)).sort();
    const grade = [...knownGrades, ...extraGrades].map((name) => {
      const cat = name.startsWith('G') ? 'G' : name.startsWith('P') ? 'P' : name.startsWith('D') ? 'D' : 'Other';
      const color = cat === 'G' ? PALETTE[0] : cat === 'P' ? PALETTE[1] : cat === 'D' ? PALETTE[3] : PALETTE[5];
      return { name, value: gradeMap.get(name) ?? 0, color };
    });

    const sortedLocations = Array.from(locationMap.entries()).sort((a, b) => b[1] - a[1]);
    const topLoc = sortedLocations.slice(0, 10);
    const otherLocCount = sortedLocations.slice(10).reduce((s, [, v]) => s + v, 0);
    const location = topLoc.map(([name, value]) => ({ name, value }));
    if (otherLocCount > 0) location.push({ name: 'Other', value: otherLocCount });

    const sortedNats = Array.from(nationalityMap.entries()).sort((a, b) => b[1] - a[1]);
    const topNats = sortedNats.slice(0, 10).map(([name, value]) => ({ name, value }));
    const otherNatCount = sortedNats.slice(10).reduce((s, [, v]) => s + v, 0);
    const nationality = topNats.slice();
    if (otherNatCount > 0) nationality.push({ name: 'Other', value: otherNatCount });

    const divisionGender = Array.from(divGenderMap.entries())
      .map(([name, v]) => ({ name, Man: v.Man, Woman: v.Woman }))
      .sort((a, b) => (b.Man + b.Woman) - (a.Man + a.Woman));

    // Stacked: division on X, worker_type as series
    const allWorkerTypes = Array.from(new Set(rows.map((r) => (r.worker_type ?? '').trim() || 'Unknown'))).sort();
    const workerStacked = Array.from(workerByDivision.entries())
      .map(([div, inner]) => {
        const obj: any = { name: div };
        allWorkerTypes.forEach((wt) => { obj[wt] = inner.get(wt) ?? 0; });
        return obj;
      })
      .sort((a, b) => {
        const sa = allWorkerTypes.reduce((s, wt) => s + (a[wt] ?? 0), 0);
        const sb = allWorkerTypes.reduce((s, wt) => s + (b[wt] ?? 0), 0);
        return sb - sa;
      });

    return {
      total, gender, workerPie, category, divisions, grade, location, nationality, divisionGender,
      workerStacked, allWorkerTypes,
    };
  }, [rows]);

  if (!hasAccess) return <Navigate to="/" />;

  const isLoading = rowsQuery.isLoading;
  const isEmpty = !isLoading && rows.length === 0 && (meta.data?.total ?? 0) === 0;

  // Filter helpers
  const toggleFilter = (k: keyof Filters, v: string) => {
    setFilters((f) => ({
      ...f,
      [k]: f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v],
    }));
  };
  const clearFilter = (k: keyof Filters, v: string) => {
    setFilters((f) => ({ ...f, [k]: f[k].filter((x) => x !== v) }));
  };
  const clearAll = () => setFilters(emptyFilters);
  const activeCount =
    filters.worker_type.length + filters.division.length + filters.office_location.length;

  if (isEmpty) {
    return (
      <Layout>
        <div className="container mx-auto py-8 max-w-3xl">
          <Card>
            <CardHeader>
              <CardTitle>Headcount</CardTitle>
              <CardDescription>
                No userbase data yet. Import GSM and Samsaran extracts to populate analytics.
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
      <div className="container mx-auto py-6 max-w-[95vw] space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold">Headcount</h1>
          <p className="text-sm text-muted-foreground">
            {agg.total.toLocaleString()} people
            {meta.data?.imported_at && (
              <> · last imported {new Date(meta.data.imported_at).toLocaleString()}</>
            )}
          </p>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap gap-2 items-center">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Worker type
                {filters.worker_type.length > 0 && (
                  <Badge variant="secondary" className="ml-2">{filters.worker_type.length}</Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-72">
              <FilterGroup
                label="Worker type"
                options={distinctWorker.data ?? []}
                selected={filters.worker_type}
                onToggle={(v) => toggleFilter('worker_type', v)}
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Division
                {filters.division.length > 0 && (
                  <Badge variant="secondary" className="ml-2">{filters.division.length}</Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-72">
              <FilterGroup
                label="Division"
                options={distinctDivision.data ?? []}
                selected={filters.division}
                onToggle={(v) => toggleFilter('division', v)}
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Location
                {filters.office_location.length > 0 && (
                  <Badge variant="secondary" className="ml-2">{filters.office_location.length}</Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-72">
              <FilterGroup
                label="Office location"
                options={distinctLocation.data ?? []}
                selected={filters.office_location}
                onToggle={(v) => toggleFilter('office_location', v)}
              />
            </PopoverContent>
          </Popover>

          {activeCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAll}>Reset all</Button>
          )}
        </div>

        {/* Active chips */}
        {activeCount > 0 && (
          <div className="flex flex-wrap gap-1.5">
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
              )),
            )}
          </div>
        )}

        {/* KPI strip — Divisions */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)
            : agg.divisions.map((d) => (
                <Card key={d.name}>
                  <CardContent className="p-4">
                    <div className="text-xs uppercase text-muted-foreground truncate" title={d.name}>{d.name}</div>
                    <div className="text-2xl font-semibold mt-1">{d.value.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">{(d.share * 100).toFixed(1)}%</div>
                  </CardContent>
                </Card>
              ))}
        </div>

        {/* Pie row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Gender distribution</CardTitle></CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-72 w-full" /> : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={agg.gender} dataKey="value" nameKey="name" outerRadius={100} label>
                      {agg.gender.map((d) => (
                        <Cell key={d.name} fill={GENDER_COLORS[d.name] ?? PALETTE[0]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Staff vs Affiliate (Worker type)</CardTitle></CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-72 w-full" /> : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={agg.workerPie} dataKey="value" nameKey="name" outerRadius={100} label>
                      {agg.workerPie.map((_, i) => (
                        <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Category & Worker-stacked-by-Division */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Headcount per Category</CardTitle></CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-72 w-full" /> : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={agg.category}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" fill={PALETTE[0]} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Worker type by Division (stacked)</CardTitle></CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-72 w-full" /> : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={agg.workerStacked}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    {agg.allWorkerTypes.map((wt, i) => (
                      <Bar key={wt} dataKey={wt} stackId="a" fill={PALETTE[i % PALETTE.length]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Grade histogram */}
        <Card>
          <CardHeader><CardTitle className="text-base">Distribution by Grade</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-72 w-full" /> : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={agg.grade}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {agg.grade.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Location */}
        <Card>
          <CardHeader><CardTitle className="text-base">Headcount per Office Location (top 10)</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-72 w-full" /> : (
              <ResponsiveContainer width="100%" height={Math.max(280, agg.location.length * 28)}>
                <BarChart data={agg.location} layout="vertical" margin={{ left: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={120} />
                  <Tooltip />
                  <Bar dataKey="value" fill={PALETTE[0]} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Division × Gender */}
        <Card>
          <CardHeader><CardTitle className="text-base">Headcount per Division × Gender</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-72 w-full" /> : (
              <ResponsiveContainer width="100%" height={Math.max(280, agg.divisionGender.length * 36)}>
                <BarChart data={agg.divisionGender} layout="vertical" margin={{ left: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={120} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Man" fill={GENDER_COLORS.Man} />
                  <Bar dataKey="Woman" fill={GENDER_COLORS.Woman} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Nationality reporting */}
        <NationalityReport rows={rows} isLoading={isLoading} />
      </div>
    </Layout>
  );
}
