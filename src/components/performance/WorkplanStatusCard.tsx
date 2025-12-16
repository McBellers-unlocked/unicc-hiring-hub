import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Target, User, UserCheck, Calendar, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

interface WorkplanStatusCardProps {
  workplan: any;
  objectivesCount?: { total: number; completed: number };
}

export const WorkplanStatusCard = ({ workplan, objectivesCount }: WorkplanStatusCardProps) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="outline">Draft</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">In Progress</Badge>;
      case 'pending_supervisor':
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Pending Review</Badge>;
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Approved</Badge>;
      case 'completed':
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Completed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const completionPercentage = objectivesCount?.total 
    ? Math.round((objectivesCount.completed / objectivesCount.total) * 100)
    : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Workplan Overview</CardTitle>
          {getStatusBadge(workplan.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Objectives Progress */}
        {objectivesCount && objectivesCount.total > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Objectives Progress
              </span>
              <span className="font-medium">
                {objectivesCount.completed}/{objectivesCount.total} completed
              </span>
            </div>
            <Progress value={completionPercentage} className="h-2" />
          </div>
        )}

        {/* Supervisor Info */}
        <div className="grid gap-3 md:grid-cols-2">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div className="p-2 rounded-full bg-primary/10">
              <UserCheck className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">1st Supervisor</p>
              <p className="font-medium text-sm truncate">
                {workplan.supervisor1?.name || 'Not assigned'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div className="p-2 rounded-full bg-secondary/50">
              <User className="h-4 w-4 text-secondary-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">2nd Supervisor</p>
              <p className="font-medium text-sm truncate">
                {workplan.supervisor2?.name || 'Not assigned'}
              </p>
            </div>
          </div>
        </div>

        {/* Key Dates */}
        <div className="pt-3 border-t">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Calendar className="h-4 w-4" />
            Key Dates
          </div>
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <span>Created</span>
              <span className="font-medium">
                {format(new Date(workplan.created_at), 'MMM d, yyyy')}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Last Updated</span>
              <span className="font-medium">
                {format(new Date(workplan.updated_at), 'MMM d, yyyy')}
              </span>
            </div>
          </div>
        </div>

        {/* Signature Status Summary */}
        {workplan.current_phase !== 'draft' && (
          <div className="pt-3 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <CheckCircle2 className="h-4 w-4" />
              Current Phase Signatures
            </div>
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${
                  workplan[`${workplan.current_phase}_staff_signed_at`] 
                    ? 'bg-green-500' 
                    : 'bg-gray-300'
                }`} />
                <span>Staff</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${
                  workplan[`${workplan.current_phase}_supervisor1_signed_at`] 
                    ? 'bg-green-500' 
                    : 'bg-gray-300'
                }`} />
                <span>Supervisor</span>
              </div>
            </div>
          </div>
        )}

        {/* Supervisor Role Badge */}
        {workplan.is_supervisor_role && (
          <div className="pt-3 border-t">
            <Badge variant="secondary" className="bg-indigo-100 text-indigo-800">
              Supervisory Role
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
