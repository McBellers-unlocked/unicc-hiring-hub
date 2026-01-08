import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Building2, TrendingUp, Briefcase } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

interface DivisionCount {
  division: string;
  count: number;
}

interface WorkforceSnapshotProps {
  totalHeadcount: number;
  divisionBreakdown: DivisionCount[];
  womenPercent: number;
  openRequisitions: number;
  plannedHires: number;
  isLoading: boolean;
}

export const WorkforceSnapshot: React.FC<WorkforceSnapshotProps> = ({
  totalHeadcount,
  divisionBreakdown,
  womenPercent,
  openRequisitions,
  plannedHires,
  isLoading,
}) => {
  const parityGap = 50 - womenPercent;
  const isAtParity = womenPercent >= 50;

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Headcount */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Headcount</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalHeadcount}</div>
          <p className="text-xs text-muted-foreground">Active employees</p>
        </CardContent>
      </Card>

      {/* Headcount by Division */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">By Division</CardTitle>
          <Building2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {divisionBreakdown.slice(0, 6).map((d) => (
              <div
                key={d.division}
                className="text-xs bg-muted px-2 py-1 rounded-md"
              >
                <span className="font-medium">{d.division}</span>
                <span className="text-muted-foreground ml-1">{d.count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Women % and Parity */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Gender Parity</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{womenPercent.toFixed(1)}%</div>
          <div className="mt-2">
            <Progress value={womenPercent} className="h-2" />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {isAtParity ? (
              <span className="text-green-600">At or above 50% target</span>
            ) : (
              <span>Gap: {parityGap.toFixed(1)}% to parity</span>
            )}
          </p>
        </CardContent>
      </Card>

      {/* Open Hiring Requests */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Hiring Pipeline</CardTitle>
          <Briefcase className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{openRequisitions}</div>
          <p className="text-xs text-muted-foreground">
            Open requests ({plannedHires} positions)
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
