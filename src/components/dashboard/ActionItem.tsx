import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface ActionItemProps {
  priority: 'high' | 'medium' | 'low';
  title: string;
  count?: number;
  description: string;
  link: string;
  dueDate?: string;
}

export default function ActionItem({ 
  priority, 
  title, 
  count, 
  description, 
  link,
  dueDate 
}: ActionItemProps) {
  const priorityColors = {
    high: "border-l-4 border-destructive bg-destructive/5",
    medium: "border-l-4 border-orange-500 bg-orange-500/5",
    low: "border-l-4 border-blue-500 bg-blue-500/5"
  };

  const priorityIcons = {
    high: <AlertCircle className="h-4 w-4 text-destructive" />,
    medium: <Clock className="h-4 w-4 text-orange-500" />,
    low: <Clock className="h-4 w-4 text-blue-500" />
  };

  return (
    <div className={cn("p-4 rounded-lg", priorityColors[priority])}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          {priorityIcons[priority]}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold">{title}</h4>
              {count !== undefined && (
                <Badge variant={priority === 'high' ? 'destructive' : 'secondary'}>
                  {count}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{description}</p>
            {dueDate && (
              <p className="text-xs text-muted-foreground mt-1">Due: {dueDate}</p>
            )}
          </div>
        </div>
        <Link to={link}>
          <Button size="sm" variant={priority === 'high' ? 'default' : 'outline'}>
            Review
          </Button>
        </Link>
      </div>
    </div>
  );
}
