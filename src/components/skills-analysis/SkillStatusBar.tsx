import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus, CheckCircle2, Sparkles, Clock } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface StatusCount {
  established: number;
  emerging: number;
  new: number;
  legacy: number;
}

interface Props {
  statusCounts: StatusCount;
  total: number;
}

const STATUS_CONFIG = {
  established: { label: "Established", color: "hsl(var(--chart-1))", icon: CheckCircle2 },
  emerging: { label: "Emerging", color: "hsl(var(--chart-2))", icon: TrendingUp },
  new: { label: "New", color: "hsl(var(--chart-3))", icon: Sparkles },
  legacy: { label: "Legacy", color: "hsl(var(--chart-4))", icon: Clock },
};

// Mock trend data - in production this would come from historical data
const MOCK_TRENDS = {
  established: { change: 2, direction: "up" as const },
  emerging: { change: 12, direction: "up" as const },
  new: { change: 8, direction: "up" as const },
  legacy: { change: -5, direction: "down" as const },
};

export default function SkillStatusBar({ statusCounts, total }: Props) {
  const segments = useMemo(() => {
    const categorized = statusCounts.established + statusCounts.emerging + statusCounts.new + statusCounts.legacy;
    if (categorized === 0) return [];

    return Object.entries(statusCounts)
      .filter(([_, count]) => count > 0)
      .map(([status, count]) => ({
        status: status as keyof typeof STATUS_CONFIG,
        count,
        percentage: Math.round((count / categorized) * 100),
        config: STATUS_CONFIG[status as keyof typeof STATUS_CONFIG],
        trend: MOCK_TRENDS[status as keyof typeof MOCK_TRENDS],
      }));
  }, [statusCounts]);

  const modernizationRate = useMemo(() => {
    const categorized = statusCounts.established + statusCounts.emerging + statusCounts.new + statusCounts.legacy;
    if (categorized === 0) return 0;
    return Math.round(((statusCounts.new + statusCounts.emerging) / categorized) * 100);
  }, [statusCounts]);

  if (segments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Skills Distribution</CardTitle>
          <CardDescription>No categorized skills yet</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Skills Distribution</CardTitle>
            <CardDescription>Lifecycle stage breakdown with trends</CardDescription>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">{modernizationRate}%</p>
            <p className="text-xs text-muted-foreground">Modernization</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 100% Stacked Bar */}
        <TooltipProvider>
          <div className="flex h-10 rounded-lg overflow-hidden">
            {segments.map((segment) => (
              <Tooltip key={segment.status}>
                <TooltipTrigger asChild>
                  <div
                    className="h-full flex items-center justify-center cursor-pointer transition-opacity hover:opacity-90"
                    style={{
                      width: `${segment.percentage}%`,
                      backgroundColor: segment.config.color,
                      minWidth: segment.percentage > 0 ? "24px" : 0,
                    }}
                  >
                    {segment.percentage >= 10 && (
                      <span className="text-xs font-semibold text-white drop-shadow-sm">
                        {segment.percentage}%
                      </span>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-sm">
                    <p className="font-medium">{segment.config.label}</p>
                    <p className="text-muted-foreground">{segment.count} skills ({segment.percentage}%)</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>

        {/* Legend with Trends */}
        <div className="grid grid-cols-2 gap-3">
          {segments.map((segment) => {
            const Icon = segment.config.icon;
            const TrendIcon = segment.trend.direction === "up" ? TrendingUp : 
                             segment.trend.direction === "down" ? TrendingDown : Minus;
            const trendColor = segment.status === "legacy" 
              ? (segment.trend.direction === "down" ? "text-green-600" : "text-destructive")
              : (segment.trend.direction === "up" ? "text-green-600" : "text-destructive");

            return (
              <div
                key={segment.status}
                className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-sm"
                    style={{ backgroundColor: segment.config.color }}
                  />
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm font-medium">{segment.config.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{segment.count}</span>
                  <div className={`flex items-center gap-0.5 text-xs ${trendColor}`}>
                    <TrendIcon className="h-3 w-3" />
                    <span>{Math.abs(segment.trend.change)}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}