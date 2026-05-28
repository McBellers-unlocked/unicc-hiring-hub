import { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowUpDown, Download, Globe } from 'lucide-react';

type Row = {
  gsm_gender: string | null;
  samsaran_gender: string | null;
  worker_type: string | null;
  nationality: string | null;
};

const PALETTE = [
  'hsl(199 100% 44%)',
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

const normalizeGender = (r: Row): 'Man' | 'Woman' | 'Other/Unknown' => {
  const raw = (r.samsaran_gender ?? r.gsm_gender ?? '').toString().trim().toLowerCase();
  if (raw === 'man' || raw === 'm' || raw === 'male') return 'Man';
  if (raw === 'woman' || raw === 'f' || raw === 'female') return 'Woman';
  return 'Other/Unknown';
};

type NatAgg = {
  name: string;
  count: number;
  men: number;
  women: number;
  other: number;
  workerTypes: Record<string, number>;
};

type SortKey = 'name' | 'count' | 'share' | 'womenPct' | 'menPct';

export function NationalityReport({ rows, isLoading }: { rows: Row[]; isLoading: boolean }) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('count');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const { full, total, workerTypeKeys } = useMemo(() => {
    const m = new Map<string, NatAgg>();
    const wtSet = new Set<string>();
    let t = 0;
    rows.forEach((r) => {
      const nat = (r.nationality ?? '').trim();
      if (!nat) return;
      t += 1;
      const wt = (r.worker_type ?? '').trim() || 'Unknown';
      wtSet.add(wt);
      const g = normalizeGender(r);
      const cur = m.get(nat) ?? { name: nat, count: 0, men: 0, women: 0, other: 0, workerTypes: {} };
      cur.count += 1;
      if (g === 'Man') cur.men += 1;
      else if (g === 'Woman') cur.women += 1;
      else cur.other += 1;
      cur.workerTypes[wt] = (cur.workerTypes[wt] ?? 0) + 1;
      m.set(nat, cur);
    });
    return {
      full: Array.from(m.values()).sort((a, b) => b.count - a.count),
      total: t,
      workerTypeKeys: Array.from(wtSet).sort(),
    };
  }, [rows]);

  const top15 = full.slice(0, 15).map((n) => ({
    name: n.name,
    value: n.count,
    label: total ? `${((n.count / total) * 100).toFixed(1)}%` : '',
  }));

  const topGender = full.slice(0, 10).map((n) => ({
    name: n.name, Man: n.men, Woman: n.women, 'Other/Unknown': n.other,
  }));

  const topWorker = full.slice(0, 10).map((n) => {
    const obj: any = { name: n.name };
    workerTypeKeys.forEach((wt) => { obj[wt] = n.workerTypes[wt] ?? 0; });
    return obj;
  });

  const top5Share = total
    ? (full.slice(0, 5).reduce((s, n) => s + n.count, 0) / total) * 100
    : 0;

  const tableRows = useMemo(() => {
    const filtered = full.filter((n) => n.name.toLowerCase().includes(search.toLowerCase()));
    const withDerived = filtered.map((n) => ({
      ...n,
      share: total ? n.count / total : 0,
      womenPct: n.count ? n.women / n.count : 0,
      menPct: n.count ? n.men / n.count : 0,
    }));
    withDerived.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortKey === 'name') return a.name.localeCompare(b.name) * dir;
      return ((a as any)[sortKey] - (b as any)[sortKey]) * dir;
    });
    return withDerived;
  }, [full, search, sortKey, sortDir, total]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(k); setSortDir(k === 'name' ? 'asc' : 'desc'); }
  };

  const downloadCsv = () => {
    const header = ['Nationality', 'Headcount', 'Share %', 'Women', 'Women %', 'Men', 'Men %', 'Other/Unknown'];
    const lines = [header.join(',')];
    tableRows.forEach((r) => {
      lines.push([
        `"${r.name.replace(/"/g, '""')}"`,
        r.count,
        (r.share * 100).toFixed(2),
        r.women,
        (r.womenPct * 100).toFixed(2),
        r.men,
        (r.menPct * 100).toFixed(2),
        r.other,
      ].join(','));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nationality-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const SortHeader = ({ k, label, align = 'left' }: { k: SortKey; label: string; align?: 'left' | 'right' }) => (
    <th className={`px-3 py-2 text-${align} font-medium`}>
      <button
        className="inline-flex items-center gap-1 hover:text-foreground text-muted-foreground"
        onClick={() => toggleSort(k)}
      >
        {label}
        <ArrowUpDown className="w-3 h-3" />
      </button>
    </th>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Globe className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold">Nationality reporting</h2>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {isLoading ? (
          <>
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
          </>
        ) : (
          <>
            <Card>
              <CardContent className="p-4">
                <div className="text-xs uppercase text-muted-foreground">Nationalities represented</div>
                <div className="text-2xl font-semibold mt-1">{full.length.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">across {total.toLocaleString()} people</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-xs uppercase text-muted-foreground">Top nationality</div>
                <div className="text-2xl font-semibold mt-1 truncate" title={full[0]?.name}>
                  {full[0]?.name ?? '—'}
                </div>
                <div className="text-xs text-muted-foreground">
                  {full[0] ? `${full[0].count.toLocaleString()} (${((full[0].count / total) * 100).toFixed(1)}%)` : ''}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-xs uppercase text-muted-foreground">Top 5 concentration</div>
                <div className="text-2xl font-semibold mt-1">{top5Share.toFixed(1)}%</div>
                <div className="text-xs text-muted-foreground">share of workforce</div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Top 15 bar chart */}
      <Card>
        <CardHeader><CardTitle className="text-base">Top 15 Nationalities</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-80 w-full" /> : (
            <ResponsiveContainer width="100%" height={Math.max(320, top15.length * 28)}>
              <BarChart data={top15} layout="vertical" margin={{ left: 80, right: 40 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={140} />
                <Tooltip />
                <Bar dataKey="value" fill={PALETTE[0]} radius={[0, 4, 4, 0]} label={{ position: 'right', formatter: (v: any) => v }} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Nationality × Gender / Worker type */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Top 10 Nationalities × Gender</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-72 w-full" /> : (
              <ResponsiveContainer width="100%" height={Math.max(300, topGender.length * 36)}>
                <BarChart data={topGender} layout="vertical" margin={{ left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={140} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Man" stackId="g" fill={GENDER_COLORS.Man} />
                  <Bar dataKey="Woman" stackId="g" fill={GENDER_COLORS.Woman} />
                  <Bar dataKey="Other/Unknown" stackId="g" fill={GENDER_COLORS['Other/Unknown']} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Top 10 Nationalities × Worker type</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-72 w-full" /> : (
              <ResponsiveContainer width="100%" height={Math.max(300, topWorker.length * 36)}>
                <BarChart data={topWorker} layout="vertical" margin={{ left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={140} />
                  <Tooltip />
                  <Legend />
                  {workerTypeKeys.map((wt, i) => (
                    <Bar key={wt} dataKey={wt} stackId="w" fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Full table */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">All nationalities</CardTitle>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search nationality…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 w-56"
              />
              <Button variant="outline" size="sm" onClick={downloadCsv} disabled={!tableRows.length}>
                <Download className="w-4 h-4 mr-2" />
                CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-64 w-full" /> : (
            <div className="overflow-auto max-h-[480px] border rounded-md">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <SortHeader k="name" label="Nationality" />
                    <SortHeader k="count" label="Headcount" align="right" />
                    <SortHeader k="share" label="% of total" align="right" />
                    <SortHeader k="womenPct" label="Women %" align="right" />
                    <SortHeader k="menPct" label="Men %" align="right" />
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((r) => (
                    <tr key={r.name} className="border-t hover:bg-muted/30">
                      <td className="px-3 py-2">{r.name}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{r.count.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{(r.share * 100).toFixed(1)}%</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {(r.womenPct * 100).toFixed(1)}%
                        <span className="text-muted-foreground ml-1">({r.women})</span>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {(r.menPct * 100).toFixed(1)}%
                        <span className="text-muted-foreground ml-1">({r.men})</span>
                      </td>
                    </tr>
                  ))}
                  {!tableRows.length && (
                    <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">No nationalities match.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
