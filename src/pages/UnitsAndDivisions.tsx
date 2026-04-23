import { useMemo, useRef, useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Save,
  RotateCcw,
  ChevronsUpDown,
  X,
  Check,
  Upload,
  Download,
  Archive,
  Undo2,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
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
  const [activeRows, setActiveRows] = useState<UnitRow[]>(initialRows);
  const [decommissionedRows, setDecommissionedRows] = useState<UnitRow[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('active');
  const [importResult, setImportResult] = useState<{ added: string[]; updated: string[]; skipped: string[] } | null>(null);
  const [importResultOpen, setImportResultOpen] = useState(false);

  const updateRow = (id: string, field: keyof UnitRow, value: string) => {
    setActiveRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const toggleRowSelection = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) setSelectedIds(new Set(activeRows.map((r) => r.id)));
    else setSelectedIds(new Set());
  };

  const sortedActiveRows = useMemo(
    () => [...activeRows].sort((a, b) => a.unit.localeCompare(b.unit, undefined, { sensitivity: 'base' })),
    [activeRows]
  );
  const sortedDecommissionedRows = useMemo(
    () => [...decommissionedRows].sort((a, b) => a.unit.localeCompare(b.unit, undefined, { sensitivity: 'base' })),
    [decommissionedRows]
  );

  const handleDecommissionClick = () => {
    if (!selectionMode) {
      setSelectionMode(true);
      return;
    }
    if (selectedIds.size === 0) {
      toast.message('Select at least one unit to decommission.');
      return;
    }
    setConfirmOpen(true);
  };

  const handleTabChange = (v: string) => {
    setActiveTab(v);
    if (v !== 'active' && selectionMode) exitSelectionMode();
  };

  const handleSave = () => {
    toast.success('Units and Divisions saved');
  };

  const handleReset = () => {
    setActiveRows(buildInitialRows());
    setDecommissionedRows([]);
    exitSelectionMode();
    toast.message('Reverted to default values');
  };

  const confirmDecommission = () => {
    const ids = selectedIds;
    if (ids.size === 0) {
      setConfirmOpen(false);
      return;
    }
    const toMove = activeRows.filter((r) => ids.has(r.id));
    setActiveRows((prev) => prev.filter((r) => !ids.has(r.id)));
    setDecommissionedRows((prev) => [...toMove, ...prev]);
    setConfirmOpen(false);
    exitSelectionMode();
    toast.success(`Decommissioned ${toMove.length} unit(s)`);
  };

  const handleRestore = (id: string) => {
    const row = decommissionedRows.find((r) => r.id === id);
    if (!row) return;
    setDecommissionedRows((prev) => prev.filter((r) => r.id !== id));
    setActiveRows((prev) => [...prev, row]);
    toast.success('Unit restored');
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const csvEscape = (v: string) => {
    const s = (v ?? '').toString();
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const handleDownloadTemplate = () => {
    const headers = ['Unit full name', 'Unit', 'Parent Section', 'Division full name', 'Division', 'Manager'];
    const lines = [headers.join(',')];
    activeRows.forEach((r) => {
      lines.push([
        r.fullName,
        r.unit,
        r.parentSection,
        DIVISIONS[r.division] || '',
        r.division,
        r.manager,
      ].map(csvEscape).join(','));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'units-and-divisions-template.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Template downloaded');
  };

  const parseCsv = (text: string): string[][] => {
    const out: string[][] = [];
    let row: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; }
        else if (c === '"') { inQuotes = false; }
        else { cur += c; }
      } else {
        if (c === '"') inQuotes = true;
        else if (c === ',') { row.push(cur); cur = ''; }
        else if (c === '\n') { row.push(cur); out.push(row); row = []; cur = ''; }
        else if (c === '\r') { /* skip */ }
        else cur += c;
      }
    }
    if (cur.length > 0 || row.length > 0) { row.push(cur); out.push(row); }
    return out.filter((r) => r.some((v) => v.trim() !== ''));
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const divisionLabelToCode = (label: string): string => {
    const entry = Object.entries(DIVISIONS).find(([, l]) => l === label);
    return entry ? entry[0] : '';
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const name = file.name.toLowerCase();
    if (!name.endsWith('.csv')) {
      toast.error('Please upload a .csv file (use the downloaded template).');
      return;
    }
    try {
      const text = await file.text();
      const parsed = parseCsv(text);
      if (parsed.length < 2) {
        toast.error('File is empty or missing data rows.');
        return;
      }
      const dataRows = parsed.slice(1);
      const imported = dataRows.map((r) => {
        const fullName = (r[0] || '').trim();
        const unit = (r[1] || '').trim();
        const parentSection = (r[2] || '').trim();
        const divFullName = (r[3] || '').trim();
        const divCodeCsv = (r[4] || '').trim().toUpperCase();
        const manager = (r[5] || '').trim();
        const division =
          (DIVISIONS[divCodeCsv] ? divCodeCsv : '') ||
          divisionLabelToCode(divFullName) ||
          '';
        return {
          fullName,
          unit: unit || extractCode(fullName),
          parentSection,
          division,
          manager,
        };
      }).filter((r) => r.fullName);
      if (imported.length === 0) {
        toast.error('No valid rows found.');
        return;
      }

      // Pre-flight: ensure every row has a Unit (primary key)
      const blankUnit = imported.find((r) => !r.unit.trim());
      if (blankUnit) {
        toast.error("Import failed: every row must have a 'Unit' value (primary key).");
        return;
      }

      // Pre-flight: duplicate Unit values in the imported file (case-insensitive)
      const seen = new Map<string, number>();
      imported.forEach((r) => {
        const key = r.unit.trim().toLowerCase();
        seen.set(key, (seen.get(key) || 0) + 1);
      });
      const dupes = imported
        .map((r) => r.unit.trim())
        .filter((u, i, arr) => arr.findIndex((x) => x.toLowerCase() === u.toLowerCase()) !== i);
      const uniqueDupes = Array.from(new Set(dupes.map((d) => d.toLowerCase())))
        .map((lc) => dupes.find((d) => d.toLowerCase() === lc) as string);
      if (uniqueDupes.length > 0) {
        const shown = uniqueDupes.slice(0, 5).join(', ');
        const more = uniqueDupes.length > 5 ? `, +${uniqueDupes.length - 5} more` : '';
        toast.error(`Import failed: duplicate Unit values found: ${shown}${more}`);
        return;
      }

      // Partition imported rows: skip those colliding with decommissioned units
      const decommissionedKeys = new Map(
        decommissionedRows.map((r) => [r.unit.trim().toLowerCase(), r.unit])
      );
      const skippedUnits: string[] = [];
      const toMerge: typeof imported = [];
      imported.forEach((r) => {
        if (decommissionedKeys.has(r.unit.trim().toLowerCase())) {
          skippedUnits.push(r.unit);
        } else {
          toMerge.push(r);
        }
      });

      // Outer-join merge keyed on Unit (case-insensitive)
      const activeIndex = new Map<string, number>();
      activeRows.forEach((r, i) => {
        activeIndex.set(r.unit.trim().toLowerCase(), i);
      });
      const merged = [...activeRows];
      const addedUnits: string[] = [];
      const updatedUnits: string[] = [];
      const ts = Date.now();
      toMerge.forEach((imp, idx) => {
        const key = imp.unit.trim().toLowerCase();
        const existingIdx = activeIndex.get(key);
        if (existingIdx !== undefined) {
          merged[existingIdx] = {
            ...merged[existingIdx],
            fullName: imp.fullName,
            unit: imp.unit,
            parentSection: imp.parentSection,
            division: imp.division,
            manager: imp.manager,
          };
          updatedUnits.push(imp.unit);
        } else {
          merged.push({
            id: `imp-${ts}-${idx}`,
            fullName: imp.fullName,
            unit: imp.unit,
            parentSection: imp.parentSection,
            division: imp.division,
            manager: imp.manager,
          });
          addedUnits.push(imp.unit);
        }
      });
      setActiveRows(merged);
      setImportResult({ added: addedUnits, updated: updatedUnits, skipped: skippedUnits });
      setImportResultOpen(true);
    } catch (err) {
      console.error(err);
      toast.error('Failed to read file.');
    }
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
            <div className="flex flex-wrap gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleImportFile}
              />
              <Button variant="outline" onClick={handleDownloadTemplate} disabled={selectionMode}>
                <Download className="w-4 h-4 mr-2" />
                Download table
              </Button>
              <Button variant="outline" onClick={handleImportClick} disabled={selectionMode}>
                <Upload className="w-4 h-4 mr-2" />
                Import
              </Button>
              <Button variant="outline" onClick={handleReset} disabled={selectionMode}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
              {activeTab === 'active' && (
                <>
                  <Button
                    variant={selectionMode && selectedIds.size > 0 ? 'destructive' : 'outline'}
                    onClick={handleDecommissionClick}
                  >
                    <Archive className="w-4 h-4 mr-2" />
                    {selectionMode
                      ? `Decommission selected (${selectedIds.size})`
                      : 'Decommission'}
                  </Button>
                  {selectionMode && (
                    <Button variant="ghost" onClick={exitSelectionMode}>
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  )}
                </>
              )}
              <Button onClick={handleSave} disabled={selectionMode}>
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <TabsList>
                <TabsTrigger value="active">
                  Active ({activeRows.length})
                </TabsTrigger>
                <TabsTrigger value="decommissioned">
                  Decommissioned ({decommissionedRows.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="active" className="mt-4">
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {selectionMode && (
                          <TableHead className="w-[44px]">
                            <Checkbox
                              aria-label="Select all units"
                              checked={
                                activeRows.length > 0 && selectedIds.size === activeRows.length
                                  ? true
                                  : selectedIds.size === 0
                                  ? false
                                  : 'indeterminate'
                              }
                              onCheckedChange={(c) => toggleSelectAll(c === true)}
                            />
                          </TableHead>
                        )}
                        <TableHead className="min-w-[280px] whitespace-nowrap">Unit full name</TableHead>
                        <TableHead className="min-w-[120px]">Unit</TableHead>
                        <TableHead className="min-w-[280px]">Parent Section</TableHead>
                        <TableHead className="min-w-[300px]">Division full name</TableHead>
                        <TableHead className="min-w-[110px]">Division</TableHead>
                        <TableHead className="min-w-[280px]">Manager</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedActiveRows.map((row) => {
                        const isSelected = selectedIds.has(row.id);
                        return (
                        <TableRow
                          key={row.id}
                          className={cn(selectionMode && isSelected && 'bg-muted/50')}
                        >
                          {selectionMode && (
                            <TableCell className="w-[44px]">
                              <Checkbox
                                aria-label={`Select ${row.fullName}`}
                                checked={isSelected}
                                onCheckedChange={(c) => toggleRowSelection(row.id, c === true)}
                              />
                            </TableCell>
                          )}
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
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="decommissioned" className="mt-4">
                {decommissionedRows.length === 0 ? (
                  <div className="border rounded-md py-12 text-center text-muted-foreground">
                    No decommissioned units.
                  </div>
                ) : (
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
                          <TableHead className="min-w-[140px] text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedDecommissionedRows.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell className="font-medium whitespace-nowrap">
                              {row.fullName}
                            </TableCell>
                            <TableCell>{row.unit}</TableCell>
                            <TableCell className="whitespace-normal break-words">
                              {row.parentSection || <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell className="whitespace-normal break-words">
                              {DIVISIONS[row.division] || ''}
                            </TableCell>
                            <TableCell className="font-mono text-sm text-muted-foreground">
                              {row.division}
                            </TableCell>
                            <TableCell>
                              {row.manager || <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRestore(row.id)}
                              >
                                <Undo2 className="w-4 h-4 mr-2" />
                                Restore
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <AlertDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Decommission selected units?</AlertDialogTitle>
            <AlertDialogDescription>
              This will move {selectedIds.size} unit(s) to the Decommissioned tab. You can restore them later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDecommission}>
              Yes, decommission
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={importResultOpen} onOpenChange={setImportResultOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import complete</DialogTitle>
            <DialogDescription>
              {importResult
                ? `${importResult.added.length} added · ${importResult.updated.length} updated · ${importResult.skipped.length} skipped · ${activeRows.length - importResult.updated.length} kept`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {importResult && importResult.added.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">Added ({importResult.added.length})</h3>
                </div>
                <div className="max-h-48 overflow-y-auto flex flex-wrap gap-1.5 p-2 rounded-md border bg-muted/30">
                  {importResult.added.map((u, i) => (
                    <Badge key={`a-${i}`} variant="default">
                      {u}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {importResult && importResult.updated.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <RefreshCw className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">Updated ({importResult.updated.length})</h3>
                </div>
                <div className="max-h-48 overflow-y-auto flex flex-wrap gap-1.5 p-2 rounded-md border bg-muted/30">
                  {importResult.updated.map((u, i) => (
                    <Badge key={`u-${i}`} variant="secondary">
                      {u}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {importResult && importResult.skipped.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Archive className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold">Skipped — decommissioned ({importResult.skipped.length})</h3>
                </div>
                <div className="max-h-48 overflow-y-auto flex flex-wrap gap-1.5 p-2 rounded-md border bg-muted/30">
                  {importResult.skipped.map((u, i) => (
                    <Badge key={`s-${i}`} variant="outline">
                      {u}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">Restore them first to update.</p>
              </div>
            )}
            {importResult &&
              importResult.added.length === 0 &&
              importResult.updated.length === 0 &&
              importResult.skipped.length === 0 && (
                <p className="text-sm text-muted-foreground">No changes were applied.</p>
              )}
          </div>
          <DialogFooter>
            <Button onClick={() => setImportResultOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
