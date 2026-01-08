import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, X } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export interface AnalyticsFilterState {
  dateFrom?: Date;
  dateTo?: Date;
  jobId?: string;
  status?: string;
  grade?: string;
  location?: string;
  division?: string;
  contractType?: string;
  includeProjections?: boolean;
}

interface AnalyticsFiltersProps {
  filters: AnalyticsFilterState;
  onChange: (filters: AnalyticsFilterState) => void;
  showProjectionsToggle?: boolean;
}

export const AnalyticsFilters: React.FC<AnalyticsFiltersProps> = ({ 
  filters, 
  onChange,
  showProjectionsToggle = false 
}) => {
  const [jobs, setJobs] = useState<{ id: string; title: string }[]>([]);
  const [divisions, setDivisions] = useState<string[]>([]);

  useEffect(() => {
    fetchJobs();
    fetchDivisions();
  }, []);

  const fetchJobs = async () => {
    const { data } = await supabase
      .from('jobs')
      .select('id, title')
      .order('created_at', { ascending: false });
    
    if (data) setJobs(data);
  };

  const fetchDivisions = async () => {
    const { data } = await supabase
      .from('users')
      .select('division')
      .not('division', 'is', null);
    
    if (data) {
      const uniqueDivisions = [...new Set(data.map(d => d.division).filter(Boolean))] as string[];
      setDivisions(uniqueDivisions.sort());
    }
  };

  const updateFilter = (key: keyof AnalyticsFilterState, value: any) => {
    // Convert "all" placeholder back to undefined
    const actualValue = value === '__all__' ? undefined : value;
    onChange({ ...filters, [key]: actualValue });
  };

  const clearFilters = () => {
    onChange({ includeProjections: filters.includeProjections });
  };

  const hasActiveFilters = Object.entries(filters).some(
    ([key, value]) => key !== 'includeProjections' && value !== undefined
  );

  const statuses = ['Application', 'Longlist', 'Shortlist', 'Pre-Recorded Video', 'Panel Interview', 'Offer', 'Roster'];
  const grades = ['P-1', 'P-2', 'P-3', 'P-4', 'P-5', 'D-1', 'D-2', 'G-1', 'G-2', 'G-3', 'G-4', 'G-5', 'G-6', 'G-7'];
  const contractTypes = ['Fixed term', 'Temporary', 'STDA', 'Intern', 'Individual Consultant'];

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="flex flex-wrap gap-4 items-end">
          {/* Date Range */}
          <div className="flex gap-2 items-center">
            <div className="space-y-2">
              <label className="text-sm font-medium">From Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[140px] justify-start text-left font-normal",
                      !filters.dateFrom && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dateFrom ? format(filters.dateFrom, "MMM dd, yyyy") : "Pick date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={filters.dateFrom}
                    onSelect={(date) => updateFilter('dateFrom', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">To Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[140px] justify-start text-left font-normal",
                      !filters.dateTo && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dateTo ? format(filters.dateTo, "MMM dd, yyyy") : "Pick date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={filters.dateTo}
                    onSelect={(date) => updateFilter('dateTo', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Division Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Division</label>
            <Select 
              value={filters.division || '__all__'} 
              onValueChange={(val) => updateFilter('division', val)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All divisions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All divisions</SelectItem>
                {divisions.map(division => (
                  <SelectItem key={division} value={division}>{division}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Job Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Job</label>
            <Select 
              value={filters.jobId || '__all__'} 
              onValueChange={(val) => updateFilter('jobId', val)}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All jobs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All jobs</SelectItem>
                {jobs.map(job => (
                  <SelectItem key={job.id} value={job.id}>{job.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <Select 
              value={filters.status || '__all__'} 
              onValueChange={(val) => updateFilter('status', val)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All statuses</SelectItem>
                {statuses.map(status => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Grade Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Grade</label>
            <Select 
              value={filters.grade || '__all__'} 
              onValueChange={(val) => updateFilter('grade', val)}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="All grades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All grades</SelectItem>
                {grades.map(grade => (
                  <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Contract Type Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Contract Type</label>
            <Select 
              value={filters.contractType || '__all__'} 
              onValueChange={(val) => updateFilter('contractType', val)}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All types</SelectItem>
                {contractTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Include Projections Toggle */}
          {showProjectionsToggle && (
            <div className="flex items-center space-x-2 mt-7">
              <Switch
                id="include-projections"
                checked={filters.includeProjections !== false}
                onCheckedChange={(checked) => updateFilter('includeProjections', checked)}
              />
              <Label htmlFor="include-projections" className="text-sm">
                Include Projections
              </Label>
            </div>
          )}

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="mt-7">
              <X className="h-4 w-4 mr-2" />
              Clear filters
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
