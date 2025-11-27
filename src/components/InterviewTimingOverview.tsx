import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, User, MessageSquare, CheckCircle } from "lucide-react";

interface InterviewTimingOverviewProps {
  questionCount: number;
  totalQuestionMinutes: number;
  introMinutes?: number;
  wrapUpMinutes?: number;
  targetMinutes?: number;
}

export const InterviewTimingOverview = ({
  questionCount,
  totalQuestionMinutes,
  introMinutes = 5,
  wrapUpMinutes = 5,
  targetMinutes = 45,
}: InterviewTimingOverviewProps) => {
  const totalMinutes = introMinutes + totalQuestionMinutes + wrapUpMinutes;
  const percentageOfTarget = (totalMinutes / targetMinutes) * 100;

  const getStatusColor = () => {
    if (totalMinutes <= targetMinutes) return "text-green-600";
    if (totalMinutes <= targetMinutes + 5) return "text-amber-600";
    return "text-destructive";
  };

  const getProgressColor = () => {
    if (totalMinutes <= targetMinutes) return "bg-green-500";
    if (totalMinutes <= targetMinutes + 5) return "bg-amber-500";
    return "bg-destructive";
  };

  return (
    <Card className="sticky top-4 z-10 border-primary/20 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="h-5 w-5" />
          Interview Duration Calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className={`text-3xl font-bold ${getStatusColor()}`}>
            {totalMinutes} min
          </div>
          <div className="text-sm text-muted-foreground">
            / {targetMinutes} min target
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span className={getStatusColor()}>
              {Math.round(percentageOfTarget)}%
            </span>
          </div>
          <div className="relative w-full h-3 bg-muted rounded-full overflow-hidden">
            <div 
              className={
                totalMinutes <= targetMinutes 
                  ? 'h-full bg-green-500 transition-all' 
                  : totalMinutes <= targetMinutes + 5 
                    ? 'h-full bg-amber-500 transition-all' 
                    : 'h-full bg-red-500 transition-all'
              }
              style={{
                width: `${Math.min(percentageOfTarget, 100)}%`
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 pt-2 border-t">
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-1 text-blue-600">
              <User className="h-4 w-4" />
              <span className="text-xs font-medium">Intro</span>
            </div>
            <div className="text-lg font-semibold">{introMinutes}m</div>
          </div>
          
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-1 text-primary">
              <MessageSquare className="h-4 w-4" />
              <span className="text-xs font-medium">Questions</span>
            </div>
            <div className="text-lg font-semibold">
              {totalQuestionMinutes}m
              <span className="text-xs text-muted-foreground ml-1">
                ({questionCount})
              </span>
            </div>
          </div>
          
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-1 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-xs font-medium">Wrap-up</span>
            </div>
            <div className="text-lg font-semibold">{wrapUpMinutes}m</div>
          </div>
        </div>

        {totalMinutes > targetMinutes && (
          <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
            ⚠️ Interview exceeds target duration by {totalMinutes - targetMinutes} minutes
          </div>
        )}
      </CardContent>
    </Card>
  );
};
