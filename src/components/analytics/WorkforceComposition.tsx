import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Users, Download, TrendingDown, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { DivisionDrillDownDrawer } from './DivisionDrillDownDrawer';
import { cn } from '@/lib/utils';

export interface DivisionGenderData {
  division: string;
  women: number;
  men: number;
  other: number;
  total: number;
  womenPercent: number;
  parityGap: number;
  womenNeededFor50: number;
}

interface WorkforceCompositionProps {
  data: DivisionGenderData[];
  isLoading: boolean;
  onExport?: () => void;
}

const chartConfig = {
  women: {
    label: 'Women',
    color: 'hsl(var(--chart-1))',
  },
  men: {
    label: 'Men',
    color: 'hsl(var(--chart-2))',
  },
  other: {
    label: 'Other/Unknown',
    color: 'hsl(var(--chart-3))',
  },
};

// Custom tooltip for 100% stacked bar
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold mb-2">{label}</p>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-chart-1" />
            Women
          </span>
          <span className="font-medium">{data.women} ({data.womenPct.toFixed(1)}%)</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-chart-2" />
            Men
          </span>
          <span className="font-medium">{data.men} ({data.menPct.toFixed(1)}%)</span>
        </div>
        {data.other > 0 && (
          <div className="flex justify-between gap-4">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-chart-3" />
              Other
            </span>
            <span className="font-medium">{data.other} ({data.otherPct.toFixed(1)}%)</span>
          </div>
        )}
        <div className="border-t pt-1 mt-1 flex justify-between gap-4">
          <span>Total</span>
          <span className="font-semibold">{data.total}</span>
        </div>
      </div>
    </div>
  );
};

export const WorkforceComposition: React.FC<WorkforceCompositionProps> = ({
  data,
  isLoading,
  onExport,
}) => {
  const [viewMode, setViewMode] = useState<'composition' | 'headcount'>('composition');
  const [selectedDivision, setSelectedDivision] = useState<DivisionGenderData | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Sort data by Women % ascending (worst gaps first)
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => a.womenPercent - b.womenPercent);
  }, [data]);

  // Transform data for 100% stacked bar chart
  const chartData = useMemo(() => {
    return sortedData.map((d) => ({
      division: d.division,
      women: d.women,
      men: d.men,
      other: d.other,
      total: d.total,
      womenPct: d.womenPercent,
      menPct: d.total > 0 ? (d.men / d.total) * 100 : 0,
      otherPct: d.total > 0 ? (d.other / d.total) * 100 : 0,
      parityGap: d.parityGap,
    }));
  }, [sortedData]);

  // Calculate totals for KPI bar
  const totals = useMemo(() => {
    const totalHeadcount = data.reduce((sum, d) => sum + d.total, 0);
    const totalWomen = data.reduce((sum, d) => sum + d.women, 0);
    const womenPercent = totalHeadcount > 0 ? (totalWomen / totalHeadcount) * 100 : 0;
    const divisionsBelowParity = data.filter((d) => d.womenPercent < 50).length;
    return { totalHeadcount, totalWomen, womenPercent, divisionsBelowParity, totalDivisions: data.length };
  }, [data]);

  const handleBarClick = (data: any) => {
    if (data && data.activePayload && data.activePayload[0]) {
      const divisionName = data.activePayload[0].payload.division;
      const divisionData = sortedData.find((d) => d.division === divisionName);
      if (divisionData) {
        setSelectedDivision(divisionData);
        setDrawerOpen(true);
      }
    }
  };

  const handleRowClick = (row: DivisionGenderData) => {
    setSelectedDivision(row);
    setDrawerOpen(true);
  };

  const exportToCsv = () => {
    const headers = ['Division', 'Total', 'Women', 'Men', 'Other/Unknown', 'Women %', 'Parity Gap', 'Women Needed'];
    const rows = sortedData.map((d) => [
      d.division,
      d.total,
      d.women,
      d.men,
      d.other,
      d.womenPercent.toFixed(1) + '%',
      (d.parityGap >= 0 ? '-' : '+') + Math.abs(d.parityGap).toFixed(1) + 'pp',
      d.womenNeededFor50 > 0 ? d.womenNeededFor50 : 'At parity',
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'workforce-composition.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const getParityColorClass = (womenPercent: number) => {
    if (womenPercent < 30) return 'bg-destructive/10 text-destructive';
    if (womenPercent < 45) return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
    if (womenPercent <= 55) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[380px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Workforce Composition</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="font-medium">No workforce data available</h3>
            <p className="text-sm mt-1">Import staff data to see workforce composition analytics</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>Workforce Composition by Division</CardTitle>
          <div className="flex items-center gap-2">
            <ToggleGroup
              type="single"
              value={viewMode}
              onValueChange={(v) => v && setViewMode(v as 'composition' | 'headcount')}
              size="sm"
            >
              <ToggleGroupItem value="composition" aria-label="Composition view">
                Gender Mix
              </ToggleGroupItem>
              <ToggleGroupItem value="headcount" aria-label="Headcount view">
                Headcount
              </ToggleGroupItem>
            </ToggleGroup>
            <Button variant="outline" size="sm" onClick={exportToCsv}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* KPI Summary Bar */}
          <div className="flex flex-wrap items-center gap-4 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                Total Headcount: <span className="font-semibold">{totals.totalHeadcount}</span>
              </span>
            </div>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-2">
              <span className="text-sm">
                Women: <span className={cn('font-semibold', totals.womenPercent < 45 ? 'text-amber-600' : 'text-green-600')}>
                  {totals.womenPercent.toFixed(1)}%
                </span>
              </span>
            </div>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-2">
              {totals.divisionsBelowParity > 0 ? (
                <>
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span className="text-sm">
                    <span className="font-semibold text-amber-600">{totals.divisionsBelowParity}</span>/{totals.totalDivisions} divisions below parity
                  </span>
                </>
              ) : (
                <span className="text-sm text-green-600 font-medium">All divisions at parity</span>
              )}
            </div>
          </div>

          {/* Chart */}
          <ChartContainer config={chartConfig} className="h-[380px]">
            <ResponsiveContainer width="100%" height="100%">
              {viewMode === 'composition' ? (
                <BarChart
                  data={chartData}
                  onClick={handleBarClick}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  layout="horizontal"
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                  <XAxis
                    dataKey="division"
                    tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
                    tickLine={{ stroke: 'hsl(var(--border))' }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    tick={{ fill: 'hsl(var(--foreground))' }}
                    tickLine={{ stroke: 'hsl(var(--border))' }}
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="top" height={36} />
                  <ReferenceLine
                    y={50}
                    stroke="hsl(var(--foreground))"
                    strokeDasharray="4 4"
                    strokeWidth={2}
                    label={{
                      value: '50% Parity',
                      position: 'right',
                      fill: 'hsl(var(--foreground))',
                      fontSize: 11,
                    }}
                  />
                  <Bar dataKey="womenPct" stackId="a" fill="hsl(var(--chart-1))" name="Women %" cursor="pointer" />
                  <Bar dataKey="menPct" stackId="a" fill="hsl(var(--chart-2))" name="Men %" cursor="pointer" />
                  <Bar dataKey="otherPct" stackId="a" fill="hsl(var(--chart-3))" name="Other %" cursor="pointer" />
                </BarChart>
              ) : (
                <BarChart
                  data={chartData}
                  onClick={handleBarClick}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                  <XAxis
                    dataKey="division"
                    tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
                    tickLine={{ stroke: 'hsl(var(--border))' }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis tick={{ fill: 'hsl(var(--foreground))' }} tickLine={{ stroke: 'hsl(var(--border))' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="top" height={36} />
                  <Bar dataKey="women" stackId="a" fill="hsl(var(--chart-1))" name="Women" cursor="pointer" />
                  <Bar dataKey="men" stackId="a" fill="hsl(var(--chart-2))" name="Men" cursor="pointer" />
                  <Bar dataKey="other" stackId="a" fill="hsl(var(--chart-3))" name="Other" cursor="pointer" />
                </BarChart>
              )}
            </ResponsiveContainer>
          </ChartContainer>

          {/* Data Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Division</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Women</TableHead>
                  <TableHead className="text-right">Men</TableHead>
                  <TableHead className="text-right">Other</TableHead>
                  <TableHead className="text-right">Women %</TableHead>
                  <TableHead className="text-right">Parity Gap</TableHead>
                  <TableHead className="text-right">Women Needed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.map((row) => (
                  <TableRow
                    key={row.division}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleRowClick(row)}
                  >
                    <TableCell className="font-medium">{row.division}</TableCell>
                    <TableCell className="text-right">{row.total}</TableCell>
                    <TableCell className="text-right">{row.women}</TableCell>
                    <TableCell className="text-right">{row.men}</TableCell>
                    <TableCell className="text-right">{row.other}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary" className={cn('font-mono', getParityColorClass(row.womenPercent))}>
                        {row.womenPercent.toFixed(1)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={cn('font-mono text-sm', row.parityGap > 0 ? 'text-destructive' : 'text-green-600')}>
                        {row.parityGap > 0 ? '-' : '+'}
                        {Math.abs(row.parityGap).toFixed(1)}pp
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {row.womenNeededFor50 > 0 ? (
                        <span className="text-muted-foreground">{row.womenNeededFor50}</span>
                      ) : (
                        <Badge variant="outline" className="text-green-600 border-green-300">
                          At parity
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {/* Totals Row */}
                <TableRow className="font-medium bg-muted/50">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right">{totals.totalHeadcount}</TableCell>
                  <TableCell className="text-right">{totals.totalWomen}</TableCell>
                  <TableCell className="text-right">{data.reduce((sum, d) => sum + d.men, 0)}</TableCell>
                  <TableCell className="text-right">{data.reduce((sum, d) => sum + d.other, 0)}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary" className={cn('font-mono', getParityColorClass(totals.womenPercent))}>
                      {totals.womenPercent.toFixed(1)}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={cn('font-mono text-sm', 50 - totals.womenPercent > 0 ? 'text-destructive' : 'text-green-600')}>
                      {50 - totals.womenPercent > 0 ? '-' : '+'}
                      {Math.abs(50 - totals.womenPercent).toFixed(1)}pp
                    </span>
                  </TableCell>
                  <TableCell className="text-right">—</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Drill-down Drawer */}
      <DivisionDrillDownDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        division={selectedDivision?.division || null}
        divisionTotal={selectedDivision?.total || 0}
        divisionWomenPercent={selectedDivision?.womenPercent || 0}
      />
    </>
  );
};
