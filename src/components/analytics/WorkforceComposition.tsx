import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Users, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export interface DivisionGenderData {
  division: string;
  women: number;
  men: number;
  other: number;
  total: number;
  womenPercent: number;
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

export const WorkforceComposition: React.FC<WorkforceCompositionProps> = ({
  data,
  isLoading,
  onExport,
}) => {
  const [selectedDivision, setSelectedDivision] = useState<string | null>(null);

  const handleBarClick = (data: any) => {
    if (data && data.activePayload && data.activePayload[0]) {
      const division = data.activePayload[0].payload.division;
      setSelectedDivision(selectedDivision === division ? null : division);
    }
  };

  const exportToCsv = () => {
    const headers = ['Division', 'Total', 'Women', 'Men', 'Other/Unknown', 'Women %'];
    const rows = data.map(d => [
      d.division,
      d.total,
      d.women,
      d.men,
      d.other,
      d.womenPercent.toFixed(1) + '%'
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'workforce-composition.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
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
            <p className="text-sm mt-1">
              Import staff data to see workforce composition analytics
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Workforce Composition by Division</CardTitle>
        <Button variant="outline" size="sm" onClick={exportToCsv}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stacked Bar Chart */}
        <ChartContainer config={chartConfig} className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              onClick={handleBarClick}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="division" 
                tick={{ fill: 'hsl(var(--foreground))' }}
                tickLine={{ stroke: 'hsl(var(--border))' }}
              />
              <YAxis 
                tick={{ fill: 'hsl(var(--foreground))' }}
                tickLine={{ stroke: 'hsl(var(--border))' }}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend />
              <Bar 
                dataKey="women" 
                stackId="a" 
                fill="hsl(var(--chart-1))" 
                name="Women"
                cursor="pointer"
              />
              <Bar 
                dataKey="men" 
                stackId="a" 
                fill="hsl(var(--chart-2))" 
                name="Men"
                cursor="pointer"
              />
              <Bar 
                dataKey="other" 
                stackId="a" 
                fill="hsl(var(--chart-3))" 
                name="Other/Unknown"
                cursor="pointer"
              />
            </BarChart>
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
                <TableHead className="text-right">Other/Unknown</TableHead>
                <TableHead className="text-right">Women %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow 
                  key={row.division}
                  className={selectedDivision === row.division ? 'bg-muted' : ''}
                >
                  <TableCell className="font-medium">{row.division}</TableCell>
                  <TableCell className="text-right">{row.total}</TableCell>
                  <TableCell className="text-right">{row.women}</TableCell>
                  <TableCell className="text-right">{row.men}</TableCell>
                  <TableCell className="text-right">{row.other}</TableCell>
                  <TableCell className="text-right">
                    <span className={row.womenPercent >= 50 ? 'text-green-600' : ''}>
                      {row.womenPercent.toFixed(1)}%
                    </span>
                  </TableCell>
                </TableRow>
              ))}
              {/* Totals Row */}
              <TableRow className="font-medium bg-muted/50">
                <TableCell>Total</TableCell>
                <TableCell className="text-right">
                  {data.reduce((sum, d) => sum + d.total, 0)}
                </TableCell>
                <TableCell className="text-right">
                  {data.reduce((sum, d) => sum + d.women, 0)}
                </TableCell>
                <TableCell className="text-right">
                  {data.reduce((sum, d) => sum + d.men, 0)}
                </TableCell>
                <TableCell className="text-right">
                  {data.reduce((sum, d) => sum + d.other, 0)}
                </TableCell>
                <TableCell className="text-right">
                  {(() => {
                    const totalWomen = data.reduce((sum, d) => sum + d.women, 0);
                    const total = data.reduce((sum, d) => sum + d.total, 0);
                    return total > 0 ? ((totalWomen / total) * 100).toFixed(1) : '0.0';
                  })()}%
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
