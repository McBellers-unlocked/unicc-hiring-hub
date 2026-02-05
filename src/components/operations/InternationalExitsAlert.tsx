import { format, parseISO, differenceInDays } from "date-fns";
import { AlertTriangle, Clock, Globe } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

interface InternationalExit {
  id: string;
  name: string;
  tentative_date: string;
  duty_station: string;
  grade: string;
  daysUntil: number;
}

interface InternationalExitsAlertProps {
  exits: InternationalExit[];
}

export default function InternationalExitsAlert({ exits }: InternationalExitsAlertProps) {
  const navigate = useNavigate();
  
  const criticalExits = exits.filter(e => e.daysUntil <= 30);
  const warningExits = exits.filter(e => e.daysUntil > 30 && e.daysUntil <= 90);

  if (exits.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Globe className="h-5 w-5" />
          International Staff Exits (Protocol Required)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {criticalExits.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Urgent: Exits within 30 days</AlertTitle>
            <AlertDescription>
              <div className="mt-2 space-y-2">
                {criticalExits.map((exit) => (
                  <div 
                    key={exit.id} 
                    className="flex items-center justify-between bg-destructive/10 rounded p-2"
                  >
                    <div>
                      <span className="font-medium">{exit.name}</span>
                      <span className="text-sm ml-2">({exit.grade})</span>
                      <span className="text-sm text-muted-foreground ml-2">
                        - {exit.duty_station}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive" className="animate-pulse">
                        {exit.daysUntil} days
                      </Badge>
                      <span className="text-sm">
                        {format(parseISO(exit.tentative_date), 'dd MMM')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {warningExits.length > 0 && (
          <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950">
            <Clock className="h-4 w-4 text-orange-600" />
            <AlertTitle className="text-orange-800 dark:text-orange-200">
              Exits within 90 days ({warningExits.length})
            </AlertTitle>
            <AlertDescription>
              <div className="mt-2 space-y-1">
                {warningExits.slice(0, 5).map((exit) => (
                  <div 
                    key={exit.id} 
                    className="flex items-center justify-between text-sm"
                  >
                    <div>
                      <span className="font-medium">{exit.name}</span>
                      <span className="ml-1">({exit.grade})</span>
                      <span className="text-muted-foreground ml-2">
                        - {exit.duty_station}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="outline" 
                        className="border-orange-500 text-orange-700 dark:text-orange-300"
                      >
                        {exit.daysUntil} days
                      </Badge>
                      <span>
                        {format(parseISO(exit.tentative_date), 'dd MMM')}
                      </span>
                    </div>
                  </div>
                ))}
                {warningExits.length > 5 && (
                  <Button 
                    variant="link" 
                    className="p-0 h-auto text-orange-700"
                    onClick={() => navigate('/operations/separations')}
                  >
                    + {warningExits.length - 5} more...
                  </Button>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        <p className="text-xs text-muted-foreground">
          P-grade international staff require 90+ days notice for visa cancellation and protocol services.
        </p>
      </CardContent>
    </Card>
  );
}
