import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { TrendingUp, Info } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { addMonths, format } from 'date-fns';

interface ForecastDataPoint {
  month: string;
  baseline: number;
  projected: number;
  projectedOptimistic: number;
  womenBaseline: number;
  womenConservative: number;
  womenOptimistic: number;
  womenTarget: number;
}

interface PipelineForHire {
  stage: string;
  count: number;
  positions: number;
  targetMonth?: string;
}

interface WorkforceForecastsProps {
  currentHeadcount: number;
  currentWomenPercent: number;
  pipelineData: PipelineForHire[];
  isLoading: boolean;
}

// Time-to-hire estimates by stage (in months) - only for approved initial requests onwards
const STAGE_MONTHS_TO_HIRE: Record<string, number> = {
  'PD Preparation': 6,
  'PD Review': 4,
  'Selection': 3,
  'Onboarding': 0,
};

const OPTIMISTIC_STAGE_MONTHS_TO_HIRE: Record<string, number> = {
  'PD Preparation': 5,
  'PD Review': 3,
  'Selection': 2,
  'Onboarding': 0,
};

const headcountChartConfig = {
  baseline: {
    label: 'Current',
    color: 'hsl(var(--muted-foreground))',
  },
  projected: {
    label: 'Conservative',
    color: 'hsl(var(--chart-1))',
  },
  projectedOptimistic: {
    label: 'Optimistic',
    color: 'hsl(var(--chart-3))',
  },
};

const womenChartConfig = {
  womenConservative: {
    label: 'Conservative',
    color: 'hsl(var(--chart-4))',
  },
  womenOptimistic: {
    label: 'Optimistic (65%)',
    color: 'hsl(var(--chart-3))',
  },
  womenTarget: {
    label: 'Target (50%)',
    color: 'hsl(var(--chart-2))',
  },
};

export const WorkforceForecasts: React.FC<WorkforceForecastsProps> = ({
  currentHeadcount,
  currentWomenPercent,
  pipelineData,
  isLoading,
}) => {
  const [horizon, setHorizon] = useState<'3' | '6' | '12'>('12');
  const [showWeights, setShowWeights] = useState(false);

  const forecastData = useMemo(() => {
    const months = parseInt(horizon);
    const data: ForecastDataPoint[] = [];
    
    // Build hires by month based on time-to-hire estimates
    const conservativeHiresByMonth: Record<number, number> = {};
    const optimisticHiresByMonth: Record<number, number> = {};
    
    pipelineData.forEach((stage) => {
      const conservativeMonths = STAGE_MONTHS_TO_HIRE[stage.stage] ?? 4;
      const optimisticMonths = OPTIMISTIC_STAGE_MONTHS_TO_HIRE[stage.stage] ?? 3;
      
      // Round to nearest month for conservative
      const conservativeMonth = Math.round(conservativeMonths);
      conservativeHiresByMonth[conservativeMonth] = (conservativeHiresByMonth[conservativeMonth] || 0) + stage.positions;
      
      // Round to nearest month for optimistic
      const optimisticMonth = Math.round(optimisticMonths);
      optimisticHiresByMonth[optimisticMonth] = (optimisticHiresByMonth[optimisticMonth] || 0) + stage.positions;
    });
    
    let cumulativeConservativeHires = 0;
    let cumulativeOptimisticHires = 0;
    const currentWomen = Math.round((currentWomenPercent / 100) * currentHeadcount);

    for (let i = 0; i <= months; i++) {
      const date = addMonths(new Date(), i);
      const monthLabel = format(date, 'MMM yyyy');
      
      // Add hires scheduled for this month
      cumulativeConservativeHires += conservativeHiresByMonth[i] || 0;
      cumulativeOptimisticHires += optimisticHiresByMonth[i] || 0;

      const projectedHeadcount = currentHeadcount + cumulativeConservativeHires;
      const optimisticHeadcount = currentHeadcount + cumulativeOptimisticHires;
      
      // Conservative: assume new hires match current gender ratio
      const conservativeWomen = currentWomen + Math.round(cumulativeConservativeHires * (currentWomenPercent / 100));
      const conservativePercent = projectedHeadcount > 0 
        ? (conservativeWomen / projectedHeadcount) * 100 
        : currentWomenPercent;

      // Target: assume 50% of new hires are women
      const targetWomen = currentWomen + Math.round(cumulativeConservativeHires * 0.5);
      const targetPercent = projectedHeadcount > 0 
        ? (targetWomen / projectedHeadcount) * 100 
        : currentWomenPercent;

      // Optimistic: assume 65% of new hires are women
      const optimisticWomen = currentWomen + Math.round(cumulativeOptimisticHires * 0.65);
      const optimisticPercent = optimisticHeadcount > 0 
        ? (optimisticWomen / optimisticHeadcount) * 100 
        : currentWomenPercent;

      data.push({
        month: monthLabel,
        baseline: currentHeadcount,
        projected: projectedHeadcount,
        projectedOptimistic: optimisticHeadcount,
        womenBaseline: currentWomenPercent,
        womenConservative: Math.round(conservativePercent * 10) / 10,
        womenOptimistic: Math.round(optimisticPercent * 10) / 10,
        womenTarget: Math.round(targetPercent * 10) / 10,
      });
    }

    return data;
  }, [currentHeadcount, currentWomenPercent, pipelineData, horizon]);

  if (isLoading) {
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (pipelineData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Workforce Forecasts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="font-medium">No pipeline data for forecasting</h3>
            <p className="text-sm mt-1">
              Active hiring requests are needed to generate forecasts
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Forecast Settings</CardTitle>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Info className="h-4 w-4 mr-1" />
                  How it works
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-96">
                <div className="space-y-4">
                  <h4 className="font-medium">Forecast Methodology</h4>
                  <p className="text-sm text-muted-foreground">
                    Projections based on expected time-to-hire for each pipeline stage:
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium mb-2">Conservative</p>
                      <ul className="text-sm space-y-1">
                        {Object.entries(STAGE_MONTHS_TO_HIRE).map(([stage, months]) => (
                          <li key={stage} className="flex justify-between text-xs">
                            <span className="text-muted-foreground">{stage}</span>
                            <span className="font-mono">+{months}mo</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">Optimistic</p>
                      <ul className="text-sm space-y-1">
                        {Object.entries(OPTIMISTIC_STAGE_MONTHS_TO_HIRE).map(([stage, months]) => (
                          <li key={stage} className="flex justify-between text-xs">
                            <span className="text-muted-foreground">{stage}</span>
                            <span className="font-mono">+{months}mo</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground border-t pt-2">
                    Women % projections: Conservative maintains current ratio, Optimistic assumes 65% women hires, Target assumes 50%.
                  </p>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <Label htmlFor="horizon">Forecast Horizon</Label>
              <Select value={horizon} onValueChange={(v) => setHorizon(v as '3' | '6' | '12')}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 months</SelectItem>
                  <SelectItem value="6">6 months</SelectItem>
                  <SelectItem value="12">12 months</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="show-weights"
                checked={showWeights}
                onCheckedChange={setShowWeights}
              />
              <Label htmlFor="show-weights">Show time-to-hire</Label>
            </div>
          </div>
          
          {showWeights && (
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium mb-2">Conservative Time-to-Hire</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(STAGE_MONTHS_TO_HIRE).map(([stage, months]) => (
                      <div key={stage} className="text-xs bg-background px-2 py-1 rounded">
                        <span className="text-muted-foreground">{stage}:</span>
                        <span className="font-mono ml-1">+{months}mo</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Optimistic Time-to-Hire</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(OPTIMISTIC_STAGE_MONTHS_TO_HIRE).map(([stage, months]) => (
                      <div key={stage} className="text-xs bg-background px-2 py-1 rounded">
                        <span className="text-muted-foreground">{stage}:</span>
                        <span className="font-mono ml-1">+{months}mo</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Headcount Projection Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Projected Headcount</CardTitle>
            <CardDescription>
              Based on {pipelineData.reduce((sum, s) => sum + s.positions, 0)} positions in pipeline
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={headcountChartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={forecastData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }}
                    tickLine={{ stroke: 'hsl(var(--border))' }}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    tick={{ fill: 'hsl(var(--foreground))' }}
                    tickLine={{ stroke: 'hsl(var(--border))' }}
                    domain={['dataMin - 10', 'dataMax + 10']}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="baseline" 
                    stroke="hsl(var(--muted-foreground))" 
                    strokeDasharray="5 5"
                    name="Current"
                    dot={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="projected" 
                    stroke="hsl(var(--chart-1))" 
                    strokeWidth={2}
                    name="Conservative"
                    dot={{ fill: 'hsl(var(--chart-1))' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="projectedOptimistic" 
                    stroke="hsl(var(--chart-3))" 
                    strokeWidth={2}
                    name="Optimistic"
                    dot={{ fill: 'hsl(var(--chart-3))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Gender Parity Projection Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Projected Women %</CardTitle>
            <CardDescription>
              Current: {currentWomenPercent.toFixed(1)}% • Target: 50%
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={womenChartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={forecastData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }}
                    tickLine={{ stroke: 'hsl(var(--border))' }}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    tick={{ fill: 'hsl(var(--foreground))' }}
                    tickLine={{ stroke: 'hsl(var(--border))' }}
                    domain={[0, 100]}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <ReferenceLine 
                    y={50} 
                    stroke="hsl(var(--chart-2))" 
                    strokeDasharray="3 3" 
                    label={{ value: '50% target', fill: 'hsl(var(--chart-2))', fontSize: 11 }}
                  />
                  <ChartTooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-background border rounded-lg shadow-lg p-3">
                            <p className="font-medium">{label}</p>
                            {payload.map((entry: any) => (
                              <p key={entry.dataKey} className="text-sm" style={{ color: entry.color }}>
                                {entry.name}: {entry.value}%
                              </p>
                            ))}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="womenConservative" 
                    stroke="hsl(var(--chart-4))" 
                    strokeWidth={2}
                    name="Conservative"
                    dot={{ fill: 'hsl(var(--chart-4))' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="womenOptimistic" 
                    stroke="hsl(var(--chart-3))" 
                    strokeWidth={2}
                    name="Optimistic (65%)"
                    dot={{ fill: 'hsl(var(--chart-3))' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="womenTarget" 
                    stroke="hsl(var(--chart-2))" 
                    strokeWidth={2}
                    name="Target (50%)"
                    dot={{ fill: 'hsl(var(--chart-2))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
