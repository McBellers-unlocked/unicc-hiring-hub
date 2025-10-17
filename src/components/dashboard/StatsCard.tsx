import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: string;
  icon?: LucideIcon;
  alert?: boolean;
  className?: string;
  onClick?: () => void;
}

export default function StatsCard({ 
  title, 
  value, 
  subtitle, 
  change, 
  icon: Icon, 
  alert,
  className,
  onClick
}: StatsCardProps) {
  return (
    <Card 
      className={cn(
        "hover:shadow-md transition-shadow",
        alert && "border-l-4 border-destructive",
        onClick && "cursor-pointer hover:scale-[1.02] transition-transform",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-2 mt-2">
              <h3 className="text-3xl font-bold">{value}</h3>
              {alert && (
                <Badge variant="destructive" className="ml-2">!</Badge>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
            {change && (
              <p className="text-xs text-green-600 mt-1">{change}</p>
            )}
          </div>
          {Icon && (
            <div className="p-3 rounded-lg bg-primary/10">
              <Icon className="h-6 w-6 text-primary" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
