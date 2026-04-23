import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Save, RotateCcw, ChevronsUpDown, X, Check } from 'lucide-react';
import { toast } from 'sonner';
import { DIVISIONS, DIVISION_UNITS } from '@/lib/organizationConstants';
import { StaffSearchCombobox, type StaffMember } from '@/components/operations/StaffSearchCombobox';
import { cn } from '@/lib/utils';

interface UnitRow {
  id: string;
  fullName: string;
  unit: string;
  parentSection: string;
  division: string;
  manager: string;
}

const extractCode = (fullName: string): string => {
  const match = fullName.match(/\(([^)]+)\)\s*$/);
  return match ? match[1] : '';
};

const buildInitialRows = (): UnitRow[] => {
  const rows: UnitRow[] = [];
  Object.keys(DIVISIONS).forEach((divCode) => {
    const units = DIVISION_UNITS[divCode] || [];
    const sorted = [...units].sort((a, b) => a.localeCompare(b));
    sorted.forEach((fullName, idx) => {
      rows.push({
        id: `${divCode}-${idx}`,
        fullName,
        unit: extractCode(fullName),
        parentSection: '',
        division: divCode,
        manager: '',
      });
    });
  });
  return rows;
};

const ALL_UNIT_NAMES: string[] = [
  ...Object.values(DIVISIONS),
  ...Object.values(DIVISION_UNITS).flat(),
].sort((a, b) => a.localeCompare(b));

interface ParentSectionPickerProps {
  value: string;
  onChange: (v: string) => void;
}

const ParentSectionPicker = ({ value, onChange }: ParentSectionPickerProps) => {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal h-auto min-h-10 py-2 text-left"
        >
          <span className={cn('whitespace-normal break-words', !value && 'text-muted-foreground')}>
            {value || 'Select parent section…'}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[460px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search unit…" />
          <CommandList>
            <CommandEmpty>No unit found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__none__"
                onSelect={() => {
                  onChange('');
                  setOpen(false);
                }}
              >
                <span className="text-muted-foreground">— None —</span>
              </CommandItem>
              {ALL_UNIT_NAMES.map((name) => (
                <CommandItem
                  key={name}
                  value={name}
                  onSelect={() => {
                    onChange(name);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === name ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <span className="truncate">{name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

interface ManagerPickerProps {
  value: string;
  onChange: (v: string) => void;
}

const ManagerPicker = ({ value, onChange }: ManagerPickerProps) => {
  if (value) {
    return (
      <div className="flex items-center gap-1">
        <Input value={value} readOnly className="flex-1" />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onChange('')}
          aria-label="Clear manager"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }
  return (
    <StaffSearchCombobox
      onSelect={(staff: StaffMember) => onChange(staff.name)}
    />
  );
};

export default function UnitsAndDivisions() {
  const navigate = useNavigate();
  const initialRows = useMemo(buildInitialRows, []);
  const [rows, setRows] = useState<UnitRow[]>(initialRows);

  const updateRow = (id: string, field: keyof UnitRow, value: string) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const handleSave = () => {
    toast.success('Units and Divisions saved');
  };

  const handleReset = () => {
    setRows(buildInitialRows());
    toast.message('Reverted to default values');
  };

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4 max-w-[1600px]">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Units and Divisions</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Editable directory of organizational units and sections used across the platform.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
              <Button onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[280px] whitespace-nowrap">Unit full name</TableHead>
                    <TableHead className="min-w-[120px]">Unit</TableHead>
                    <TableHead className="min-w-[280px]">Parent Section</TableHead>
                    <TableHead className="min-w-[300px]">Division full name</TableHead>
                    <TableHead className="min-w-[110px]">Division</TableHead>
                    <TableHead className="min-w-[280px]">Manager</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium align-middle whitespace-nowrap">
                        {row.fullName}
                      </TableCell>
                      <TableCell>
                        <Input
                          value={row.unit}
                          onChange={(e) => updateRow(row.id, 'unit', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <ParentSectionPicker
                          value={row.parentSection}
                          onChange={(v) => updateRow(row.id, 'parentSection', v)}
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={row.division}
                          onValueChange={(v) => updateRow(row.id, 'division', v)}
                        >
                          <SelectTrigger className="h-auto min-h-10 py-2 text-left [&>span]:whitespace-normal [&>span]:line-clamp-none">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(DIVISIONS).map(([code, label]) => (
                              <SelectItem key={code} value={code}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {row.division}
                      </TableCell>
                      <TableCell>
                        <ManagerPicker
                          value={row.manager}
                          onChange={(v) => updateRow(row.id, 'manager', v)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
