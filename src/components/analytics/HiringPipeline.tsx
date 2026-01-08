import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Briefcase, Download, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export interface PipelineStage {
  stage: string;
  count: number;
  positions: number;
  color: string;
}

export interface PipelineRequisition {
  id: string;
  reference_number: string;
  division: string;
  position_title: string;
  stage: string;
  positions_available: number;
  created_at: string;
  start_date: string | null;
  hiring_manager: string;
}

interface HiringPipelineProps {
  stageData: PipelineStage[];
  requisitions: PipelineRequisition[];
  isLoading: boolean;
}

const stageColors: Record<string, string> = {
  'Initial Request': 'hsl(var(--chart-1))',
  'PD Review': 'hsl(var(--chart-2))',
  'Selection': 'hsl(var(--chart-3))',
  'Offer': 'hsl(var(--chart-4))',
  'Onboarding': 'hsl(var(--chart-5))',
};

const chartConfig = {
  positions: {
    label: 'Positions',
    color: 'hsl(var(--primary))',
  },
};

export const HiringPipeline: React.FC<HiringPipelineProps> = ({
  stageData,
  requisitions,
  isLoading,
}) => {
  const [isTableOpen, setIsTableOpen] = useState(false);
  const [selectedStage, setSelectedStage] = useState<string | null>(null);

  const filteredRequisitions = selectedStage
    ? requisitions.filter(r => r.stage === selectedStage)
    : requisitions;

  const handleBarClick = (data: any) => {
    if (data && data.activePayload && data.activePayload[0]) {
      const stage = data.activePayload[0].payload.stage;
      setSelectedStage(selectedStage === stage ? null : stage);
      setIsTableOpen(true);
    }
  };

  const exportToCsv = () => {
    const headers = ['Reference', 'Division', 'Role', 'Stage', 'Positions', 'Created', 'Target Start', 'Hiring Manager'];
    const rows = filteredRequisitions.map(r => [
      r.reference_number || r.id.slice(0, 8),
      r.division,
      r.position_title,
      r.stage,
      r.positions_available,
      r.created_at ? format(new Date(r.created_at), 'yyyy-MM-dd') : '',
      r.start_date ? format(new Date(r.start_date), 'yyyy-MM-dd') : '',
      r.hiring_manager
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hiring-pipeline.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStageColor = (stage: string) => {
    return stageColors[stage] || 'hsl(var(--muted))';
  };

  const getStageBadgeVariant = (stage: string): 'default' | 'secondary' | 'outline' => {
    switch (stage) {
      case 'Offer':
      case 'Onboarding':
        return 'default';
      case 'Selection':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (stageData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Hiring Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="font-medium">No active hiring requests</h3>
            <p className="text-sm mt-1">
              Create job requisitions to see the hiring pipeline
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Hiring Pipeline</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Click a bar to filter the table below
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={exportToCsv}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Pipeline Bar Chart */}
        <ChartContainer config={chartConfig} className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={stageData}
              onClick={handleBarClick}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="stage" 
                tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
                tickLine={{ stroke: 'hsl(var(--border))' }}
              />
              <YAxis 
                tick={{ fill: 'hsl(var(--foreground))' }}
                tickLine={{ stroke: 'hsl(var(--border))' }}
              />
              <ChartTooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as PipelineStage;
                    return (
                      <div className="bg-background border rounded-lg shadow-lg p-3">
                        <p className="font-medium">{data.stage}</p>
                        <p className="text-sm text-muted-foreground">
                          {data.count} requests • {data.positions} positions
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar 
                dataKey="positions" 
                cursor="pointer"
                radius={[4, 4, 0, 0]}
              >
                {stageData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={getStageColor(entry.stage)}
                    opacity={selectedStage && selectedStage !== entry.stage ? 0.4 : 1}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* Stage Summary Pills */}
        <div className="flex flex-wrap gap-2">
          {stageData.map((stage) => (
            <Button
              key={stage.stage}
              variant={selectedStage === stage.stage ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setSelectedStage(selectedStage === stage.stage ? null : stage.stage);
                setIsTableOpen(true);
              }}
            >
              {stage.stage}: {stage.count} ({stage.positions} pos)
            </Button>
          ))}
          {selectedStage && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedStage(null)}
            >
              Clear filter
            </Button>
          )}
        </div>

        {/* Collapsible Requisitions Table */}
        <Collapsible open={isTableOpen} onOpenChange={setIsTableOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between">
              <span>
                {selectedStage ? `${selectedStage} Requisitions` : 'All Requisitions'} 
                ({filteredRequisitions.length})
              </span>
              {isTableOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="rounded-md border mt-2 max-h-[400px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Division</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead className="text-right">Positions</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Target Start</TableHead>
                    <TableHead>Hiring Manager</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequisitions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        No requisitions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRequisitions.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell className="font-mono text-sm">
                          {req.reference_number || req.id.slice(0, 8)}
                        </TableCell>
                        <TableCell>{req.division}</TableCell>
                        <TableCell className="max-w-[200px] truncate" title={req.position_title}>
                          {req.position_title}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStageBadgeVariant(req.stage)}>
                            {req.stage}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{req.positions_available}</TableCell>
                        <TableCell>
                          {req.created_at ? format(new Date(req.created_at), 'MMM d, yyyy') : '—'}
                        </TableCell>
                        <TableCell>
                          {req.start_date ? format(new Date(req.start_date), 'MMM d, yyyy') : '—'}
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate" title={req.hiring_manager}>
                          {req.hiring_manager}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};
