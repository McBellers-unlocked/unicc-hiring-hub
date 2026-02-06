import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HR_FOCAL_POINTS } from '@/lib/hrFocalPoints';

export interface SeparationFiltersState {
  search: string;
  operationType: string;
  status: string;
  dutyStation: string;
  hrFocalPoint: string;
  reason: string;
}

interface SeparationFiltersProps {
  filters: SeparationFiltersState;
  onFiltersChange: (filters: SeparationFiltersState) => void;
  dutyStations: string[];
}

const OPERATION_TYPES = [
  'Separation',
  'Separation (CB)',
  'Resignation',
  'Separation - Retirement',
  'Individual Consultancy (CB)',
  'Individual Consultancy Separation',
  'Individual Consultancy Extension',
  'Internship Separation',
  'UNV - Separation',
  'Canceled',
];

const STATUSES = [
  'Not started',
  'In progress',
  'Completed',
  'Cancelled',
];

const REASONS = [
  'Voluntary',
  'Non voluntary',
];

export const SeparationFilters = ({
  filters,
  onFiltersChange,
  dutyStations,
}: SeparationFiltersProps) => {
  const updateFilter = (key: keyof SeparationFiltersState, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      operationType: '',
      status: '',
      dutyStation: '',
      hrFocalPoint: '',
      reason: '',
    });
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== '');

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name..."
          value={filters.search}
          onChange={(e) => updateFilter('search', e.target.value)}
          className="pl-9"
        />
      </div>

      <Select value={filters.operationType} onValueChange={(v) => updateFilter('operationType', v)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          {OPERATION_TYPES.map((type) => (
            <SelectItem key={type} value={type}>{type}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.status} onValueChange={(v) => updateFilter('status', v)}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          {STATUSES.map((status) => (
            <SelectItem key={status} value={status}>{status}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.reason} onValueChange={(v) => updateFilter('reason', v)}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Reason" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Reasons</SelectItem>
          {REASONS.map((reason) => (
            <SelectItem key={reason} value={reason}>{reason}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.dutyStation} onValueChange={(v) => updateFilter('dutyStation', v)}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Location" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Locations</SelectItem>
          {dutyStations.map((station) => (
            <SelectItem key={station} value={station}>{station}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.hrFocalPoint} onValueChange={(v) => updateFilter('hrFocalPoint', v)}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="HR Focal Point" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All HR FPs</SelectItem>
          {HR_FOCAL_POINTS.map((fp) => (
            <SelectItem key={fp} value={fp}>{fp}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
};
