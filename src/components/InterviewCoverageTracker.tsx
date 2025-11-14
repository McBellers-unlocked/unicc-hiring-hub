import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CoverageStats {
  totalQuestions: number;
  essentialCovered: number;
  essentialTotal: number;
  desirableCovered: number;
  desirableTotal: number;
  competenciesCovered: number;
  competenciesTotal: number;
}

interface InterviewCoverageTrackerProps {
  stats: CoverageStats;
}

export function InterviewCoverageTracker({ stats }: InterviewCoverageTrackerProps) {
  // Calculate combined coverage (essential criteria + competencies)
  const totalItems = stats.essentialTotal + stats.competenciesTotal;
  const coveredItems = stats.essentialCovered + stats.competenciesCovered;
  const coveragePercentage = totalItems > 0 ? (coveredItems / totalItems) * 100 : 0;
  
  // Essential criteria percentage
  const essentialPercentage = stats.essentialTotal > 0 
    ? (stats.essentialCovered / stats.essentialTotal) * 100 
    : 0;
  
  // Competencies percentage
  const competenciesPercentage = stats.competenciesTotal > 0 
    ? (stats.competenciesCovered / stats.competenciesTotal) * 100 
    : 0;
  
  // Determine color based on coverage
  const getColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 50) return 'text-orange-500';
    return 'text-red-500';
  };
  
  const getBgColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-100';
    if (percentage >= 50) return 'bg-orange-100';
    return 'bg-red-100';
  };
  
  const getBorderColor = (percentage: number) => {
    if (percentage >= 80) return 'border-green-500';
    if (percentage >= 50) return 'border-orange-500';
    return 'border-red-500';
  };

  // SVG circle parameters
  const size = 160;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (coveragePercentage / 100) * circumference;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Interview Coverage Tracker</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-3 gap-6">
          {/* Circular Progress Indicator */}
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="relative">
              <svg width={size} height={size} className="transform -rotate-90">
                {/* Background circle */}
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke="currentColor"
                  strokeWidth={strokeWidth}
                  fill="none"
                  className="text-muted"
                />
                {/* Progress circle */}
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke="currentColor"
                  strokeWidth={strokeWidth}
                  fill="none"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  strokeLinecap="round"
                  className={cn(
                    "transition-all duration-500 ease-out",
                    getColor(coveragePercentage)
                  )}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className={cn("text-4xl font-bold", getColor(coveragePercentage))}>
                  {Math.round(coveragePercentage)}%
                </div>
                <div className="text-xs text-muted-foreground">Coverage</div>
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium">
                {coveredItems} of {totalItems} items covered
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {coveragePercentage >= 80 ? (
                  <span className="flex items-center gap-1 justify-center text-green-600">
                    <CheckCircle2 className="w-3 h-3" />
                    Excellent coverage!
                  </span>
                ) : (
                  <span className="flex items-center gap-1 justify-center text-orange-600">
                    <AlertCircle className="w-3 h-3" />
                    Target: 80%
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Essential Criteria Breakdown */}
          <Card className={cn("border-2 transition-colors", getBorderColor(essentialPercentage))}>
            <CardHeader className={cn("pb-3", getBgColor(essentialPercentage))}>
              <CardTitle className="text-base">Essential Criteria</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className={cn("text-3xl font-bold", getColor(essentialPercentage))}>
                    {Math.round(essentialPercentage)}%
                  </span>
                  {essentialPercentage >= 80 && (
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Covered</span>
                    <span className="font-medium">
                      {stats.essentialCovered} / {stats.essentialTotal}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        essentialPercentage >= 80 ? "bg-green-600" : 
                        essentialPercentage >= 50 ? "bg-orange-500" : "bg-red-500"
                      )}
                      style={{ width: `${essentialPercentage}%` }}
                    />
                  </div>
                </div>
                {stats.desirableTotal > 0 && (
                  <div className="pt-2 border-t text-xs text-muted-foreground">
                    Desirable: {stats.desirableCovered} / {stats.desirableTotal}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Competencies Breakdown */}
          <Card className={cn("border-2 transition-colors", getBorderColor(competenciesPercentage))}>
            <CardHeader className={cn("pb-3", getBgColor(competenciesPercentage))}>
              <CardTitle className="text-base">Competencies</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className={cn("text-3xl font-bold", getColor(competenciesPercentage))}>
                    {Math.round(competenciesPercentage)}%
                  </span>
                  {competenciesPercentage >= 80 && (
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Covered</span>
                    <span className="font-medium">
                      {stats.competenciesCovered} / {stats.competenciesTotal}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        competenciesPercentage >= 80 ? "bg-green-600" : 
                        competenciesPercentage >= 50 ? "bg-orange-500" : "bg-red-500"
                      )}
                      style={{ width: `${competenciesPercentage}%` }}
                    />
                  </div>
                </div>
                <div className="pt-2 border-t text-xs">
                  <div className="text-muted-foreground">
                    Total Questions: <span className="font-medium text-foreground">{stats.totalQuestions}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}
