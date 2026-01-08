import React, { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Users, Building2, MapPin, Briefcase } from 'lucide-react';

interface BreakdownItem {
  label: string;
  total: number;
  women: number;
  men: number;
  other: number;
  womenPercent: number;
}

interface DivisionDrillDownDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  division: string | null;
  divisionTotal: number;
  divisionWomenPercent: number;
}

export const DivisionDrillDownDrawer: React.FC<DivisionDrillDownDrawerProps> = ({
  open,
  onOpenChange,
  division,
  divisionTotal,
  divisionWomenPercent,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [gradeBreakdown, setGradeBreakdown] = useState<BreakdownItem[]>([]);
  const [locationBreakdown, setLocationBreakdown] = useState<BreakdownItem[]>([]);
  const [workerTypeBreakdown, setWorkerTypeBreakdown] = useState<BreakdownItem[]>([]);

  useEffect(() => {
    if (!open || !division) return;

    const fetchBreakdowns = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('users')
          .select('current_grade, duty_station, worker_type, gender')
          .eq('division', division);

        if (error) throw error;

        // Process grade breakdown
        const gradeMap: Record<string, { women: number; men: number; other: number }> = {};
        const locationMap: Record<string, { women: number; men: number; other: number }> = {};
        const workerTypeMap: Record<string, { women: number; men: number; other: number }> = {};

        (data || []).forEach((row) => {
          const grade = row.current_grade || 'Unknown';
          const location = row.duty_station || 'Unknown';
          const workerType = row.worker_type || 'Unknown';
          const gender = row.gender?.toLowerCase() || '';

          // Initialize maps
          if (!gradeMap[grade]) gradeMap[grade] = { women: 0, men: 0, other: 0 };
          if (!locationMap[location]) locationMap[location] = { women: 0, men: 0, other: 0 };
          if (!workerTypeMap[workerType]) workerTypeMap[workerType] = { women: 0, men: 0, other: 0 };

          // Categorize by gender
          const isWoman = gender === 'woman' || gender === 'female';
          const isMan = gender === 'man' || gender === 'male';

          if (isWoman) {
            gradeMap[grade].women++;
            locationMap[location].women++;
            workerTypeMap[workerType].women++;
          } else if (isMan) {
            gradeMap[grade].men++;
            locationMap[location].men++;
            workerTypeMap[workerType].men++;
          } else {
            gradeMap[grade].other++;
            locationMap[location].other++;
            workerTypeMap[workerType].other++;
          }
        });

        // Convert to arrays with calculations
        const processMap = (map: Record<string, { women: number; men: number; other: number }>): BreakdownItem[] => {
          return Object.entries(map)
            .map(([label, counts]) => {
              const total = counts.women + counts.men + counts.other;
              return {
                label,
                total,
                women: counts.women,
                men: counts.men,
                other: counts.other,
                womenPercent: total > 0 ? (counts.women / total) * 100 : 0,
              };
            })
            .sort((a, b) => b.total - a.total);
        };

        setGradeBreakdown(processMap(gradeMap));
        setLocationBreakdown(processMap(locationMap));
        setWorkerTypeBreakdown(processMap(workerTypeMap));
      } catch (error) {
        console.error('Error fetching division breakdown:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBreakdowns();
  }, [open, division]);

  const getParityColor = (womenPercent: number) => {
    if (womenPercent < 30) return 'text-destructive';
    if (womenPercent < 45) return 'text-amber-600';
    if (womenPercent <= 55) return 'text-green-600';
    return 'text-blue-600';
  };

  const BreakdownSection: React.FC<{
    title: string;
    icon: React.ReactNode;
    items: BreakdownItem[];
  }> = ({ title, icon, items }) => (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        {icon}
        {title}
      </div>
      <div className="space-y-2">
        {items.slice(0, 8).map((item) => (
          <div key={item.label} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium truncate max-w-[180px]">{item.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">{item.total} staff</span>
                <span className={`font-medium ${getParityColor(item.womenPercent)}`}>
                  {item.womenPercent.toFixed(0)}% W
                </span>
              </div>
            </div>
            <div className="flex h-2 rounded-full overflow-hidden bg-muted">
              <div
                className="bg-chart-1 transition-all"
                style={{ width: `${item.womenPercent}%` }}
              />
              <div
                className="bg-chart-2 transition-all"
                style={{ width: `${(item.men / item.total) * 100}%` }}
              />
              <div
                className="bg-chart-3 transition-all"
                style={{ width: `${(item.other / item.total) * 100}%` }}
              />
            </div>
          </div>
        ))}
        {items.length > 8 && (
          <p className="text-xs text-muted-foreground">
            +{items.length - 8} more categories
          </p>
        )}
      </div>
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {division}
          </SheetTitle>
          <SheetDescription>
            <div className="flex items-center gap-4 mt-2">
              <Badge variant="secondary" className="text-sm">
                <Users className="h-3 w-3 mr-1" />
                {divisionTotal} staff
              </Badge>
              <Badge
                variant="outline"
                className={`text-sm ${getParityColor(divisionWomenPercent)}`}
              >
                {divisionWomenPercent.toFixed(1)}% Women
              </Badge>
            </div>
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-8">
          {isLoading ? (
            <div className="space-y-6">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : (
            <>
              <BreakdownSection
                title="By Grade"
                icon={<Briefcase className="h-4 w-4" />}
                items={gradeBreakdown}
              />

              <BreakdownSection
                title="By Duty Station"
                icon={<MapPin className="h-4 w-4" />}
                items={locationBreakdown}
              />

              <BreakdownSection
                title="By Worker Type"
                icon={<Users className="h-4 w-4" />}
                items={workerTypeBreakdown}
              />
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
