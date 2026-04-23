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
import { Label } from '@/components/ui/label';
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
  Plus,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { DIVISIONS, DIVISION_UNITS } from '@/lib/organizationConstants';
import { StaffSearchCombobox, type StaffMember } from '@/components/operations/StaffSearchCombobox';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';

interface UnitRow {
  id: string;
  fullName: string;
  unit: string;
  parentSection: string;
  division: string;
  manager: string;
  status: 'active' | 'decommissioned';
}

interface OrgUnitDb {
  id: string;
  full_name: string;
  unit: string;
  parent_section: string | null;
  division: string;
  manager: string | null;
  status: string;
}

const dbToRow = (r: OrgUnitDb): UnitRow => ({
  id: r.id,
  fullName: r.full_name,
  unit: r.unit,
  parentSection: r.parent_section ?? '',
  division: r.division,
  manager: r.manager ?? '',
  status: (r.status === 'decommissioned' ? 'decommissioned' : 'active'),
});

const extractCode = (fullName: string): string => {
  const match = fullName.match(/\(([^)]+)\)\s*$/);
  return match ? match[1] : '';
};

// Default seed list (used by Reset)
const buildSeedRows = () => {
  const rows: { full_name: string; unit: string; division: string }[] = [];
  Object.keys(DIVISIONS).forEach((divCode) => {
    const units = DIVISION_UNITS[divCode] || [];
    units.forEach((fullName) => {
      // strip trailing " (CODE)" from the seed full names
      const cleanName = fullName.replace(/\s*\([^)]+\)\s*$/, '');
      rows.push({
        full_name: cleanName,
        unit: extractCode(fullName),
        division: divCode,
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
  onCommit?: (v: string) => void;
}

const ParentSectionPicker = ({ value, onChange, onCommit }: ParentSectionPickerProps) => {
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
                  onCommit?.('');
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
                    onCommit?.(name);
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
  onCommit?: (v: string) => void;
}

const ManagerPicker = ({ value, onChange, onCommit }: ManagerPickerProps) => {
  if (value) {
    return (
      <div className="flex items-center gap-1">
        <Input value={value} readOnly className="flex-1" />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => { onChange(''); onCommit?.(''); }}
          aria-label="Clear manager"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }
  return (
    <StaffSearchCombobox
      onSelect={(staff: StaffMember) => { onChange(staff.name); onCommit?.(staff.name); }}
    />
  );
};

// ============== Add row dialog ==============
interface AddOrgUnitDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  existingUnits: string[];
  onCreated: () => void;
}

const AddOrgUnitDialog = ({ open, onOpenChange, existingUnits, onCreated }: AddOrgUnitDialogProps) => {
  const [fullName, setFullName] = useState('');
  const [unit, setUnit] = useState('');
  const [parentSection, setParentSection] = useState('');
  const [division, setDivision] = useState('');
  const [manager, setManager] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setFullName(''); setUnit(''); setParentSection('');
    setDivision(''); setManager(''); setSaving(false);
  };

  const existingLower = useMemo(
    () => new Set(existingUnits.map((u) => u.trim().toLowerCase())),
    [existingUnits]
  );
  const unitTrim = unit.trim();
  const unitDuplicate = unitTrim !== '' && existingLower.has(unitTrim.toLowerCase());

  const canSave =
    fullName.trim() !== '' &&
    unitTrim !== '' &&
    !unitDuplicate &&
    Object.keys(DIVISIONS).includes(division);

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('org_units').insert({
      full_name: fullName.trim(),
      unit: unitTrim,
      parent_section: parentSection.trim(),
      division,
      manager: manager.trim(),
      status: 'active',
      created_by: user?.id ?? null,
    });
    setSaving(false);
    if (error) {
      toast.error(`Failed to add unit: ${error.message}`);
      return;
    }
    toast.success('Unit added');
    onCreated();
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Add a new unit</DialogTitle>
          <DialogDescription>
            Create a new organizational unit. Fields marked with * are required.
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto max-h-[60vh] space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="add-fullname">Unit full name *</Label>
            <Input
              id="add-fullname"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Project Portfolio Unit"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="add-unit">Unit (code) *</Label>
            <Input
              id="add-unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="e.g. DDPM"
              className={cn(unitDuplicate && 'border-destructive focus-visible:ring-destructive')}
            />
            {unitDuplicate && (
              <p className="text-xs text-destructive">A unit with this code already exists.</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Parent Section</Label>
            <ParentSectionPicker value={parentSection} onChange={setParentSection} />
          </div>
          <div className="space-y-1.5">
            <Label>Division *</Label>
            <Select value={division} onValueChange={setDivision}>
              <SelectTrigger>
                <SelectValue placeholder="Select division…" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DIVISIONS).map(([code, label]) => (
                  <SelectItem key={code} value={code}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Manager</Label>
            <ManagerPicker value={manager} onChange={setManager} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={!canSave || saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Add unit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ============== Page ==============
export default function UnitsAndDivisions() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('active');
  const [importResult, setImportResult] = useState<{ added: string[]; updated: string[]; skipped: string[] } | null>(null);
  const [importResultOpen, setImportResultOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  // Permission gate (matches RLS): Admin / HR Assistant / Chief of HR
  const userRole = (user as any)?.role || (user as any)?.user_metadata?.role;
  const canEdit = ['Admin', 'HR Assistant', 'Chief of HR'].includes(userRole);

  const { data: rows = [], isLoading, error } = useQuery({
    queryKey: ['org_units'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('org_units')
        .select('*')
        .order('unit', { ascending: true });
      if (error) throw error;
      return (data as OrgUnitDb[]).map(dbToRow);
    },
  });

  const activeRows = useMemo(() => rows.filter((r) => r.status === 'active'), [rows]);
  const decommissionedRows = useMemo(() => rows.filter((r) => r.status === 'decommissioned'), [rows]);

  const refetch = () => queryClient.invalidateQueries({ queryKey: ['org_units'] });

  // Optimistic local edit + persist on commit
  const persistField = async (id: string, dbField: string, value: string) => {
    const { error } = await supabase
      .from('org_units')
      .update({ [dbField]: value })
      .eq('id', id);
    if (error) {
      toast.error(`Failed to save: ${error.message}`);
      refetch();
    }
  };

  // For inline edits, we keep an optimistic patch map so typing feels immediate
  const [optimistic, setOptimistic] = useState<Record<string, Partial<UnitRow>>>({});
  const applyOptimistic = (id: string, patch: Partial<UnitRow>) => {
    setOptimistic((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), ...patch } }));
  };
  const clearOptimistic = (id: string) => {
    setOptimistic((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const mergedActive = useMemo(
    () => activeRows.map((r) => ({ ...r, ...(optimistic[r.id] || {}) })),
    [activeRows, optimistic]
  );

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
    () => [...mergedActive].sort((a, b) => a.unit.localeCompare(b.unit, undefined, { sensitivity: 'base' })),
    [mergedActive]
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

  const handleReset = async () => {
    setResetConfirmOpen(false);
    const { error: delErr } = await supabase.from('org_units').delete().not('id', 'is', null);
    if (delErr) {
      toast.error(`Reset failed: ${delErr.message}`);
      return;
    }
    const seed = buildSeedRows().map((r) => ({ ...r, status: 'active' as const }));
    const { error: insErr } = await supabase.from('org_units').insert(seed);
    if (insErr) {
      toast.error(`Reset insert failed: ${insErr.message}`);
      return;
    }
    setOptimistic({});
    exitSelectionMode();
    refetch();
    toast.success('Reset to defaults');
  };

  const confirmDecommission = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      setConfirmOpen(false);
      return;
    }
    const { error } = await supabase
      .from('org_units')
      .update({ status: 'decommissioned' })
      .in('id', ids);
    setConfirmOpen(false);
    exitSelectionMode();
    if (error) {
      toast.error(`Failed: ${error.message}`);
      return;
    }
    refetch();
    toast.success(`Decommissioned ${ids.length} unit(s)`);
  };

  const handleRestore = async (id: string) => {
    const { error } = await supabase
      .from('org_units')
      .update({ status: 'active' })
      .eq('id', id);
    if (error) {
      toast.error(`Failed to restore: ${error.message}`);
      return;
    }
    refetch();
    toast.success('Unit restored');
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const csvEscape = (v: string) => {
    const s = (v ?? '').toString();
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const handleDownloadTemplate = () => {
    const headers = ['Unit full name', 'Unit', 'Parent Section', 'Division full name', 'Division', 'Manager'];
    const lines = [headers.join(',')]
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

      const blankUnit = imported.find((r) => !r.unit.trim());
      if (blankUnit) {
        toast.error("Import failed: every row must have a 'Unit' value (primary key).");
        return;
      }

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

      const decommissionedKeys = new Map(
        decommissionedRows.map((r) => [r.unit.trim().toLowerCase(), r.unit])
      );
      const activeIndex = new Map<string, UnitRow>();
      activeRows.forEach((r) => activeIndex.set(r.unit.trim().toLowerCase(), r));

      const skippedUnits: string[] = [];
      const updatedUnits: string[] = [];
      const addedUnits: string[] = [];
      const updateOps: Promise<any>[] = [];
      const insertPayload: any[] = [];

      const { data: { user: authUser } } = await supabase.auth.getUser();

      imported.forEach((r) => {
        const key = r.unit.trim().toLowerCase();
        if (decommissionedKeys.has(key)) {
          skippedUnits.push(r.unit);
          return;
        }
        const existing = activeIndex.get(key);
        if (existing) {
          updateOps.push(
            supabase.from('org_units').update({
              full_name: r.fullName,
              unit: r.unit,
              parent_section: r.parentSection,
              division: r.division,
              manager: r.manager,
            }).eq('id', existing.id)
          );
          updatedUnits.push(r.unit);
        } else {
          insertPayload.push({
            full_name: r.fullName,
            unit: r.unit,
            parent_section: r.parentSection,
            division: r.division,
            manager: r.manager,
            status: 'active',
            created_by: authUser?.id ?? null,
          });
          addedUnits.push(r.unit);
        }
      });

      const updateResults = await Promise.all(updateOps);
      const updateErr = updateResults.find((res: any) => res?.error)?.error;
      let insertErr: any = null;
      if (insertPayload.length > 0) {
        const { error } = await supabase.from('org_units').insert(insertPayload);
        insertErr = error;
      }

      if (updateErr || insertErr) {
        toast.error(`Import error: ${(updateErr || insertErr).message}`);
      }

      refetch();
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
              {canEdit && !selectionMode && (
                <Button variant="default" onClick={() => setAddOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add row
                </Button>
              )}
              <Button variant="outline" onClick={handleDownloadTemplate} disabled={selectionMode}>
                <Download className="w-4 h-4 mr-2" />
                Download table
              </Button>
              {canEdit && (
                <>
                  <Button variant="outline" onClick={handleImportClick} disabled={selectionMode}>
                    <Upload className="w-4 h-4 mr-2" />
                    Import
                  </Button>
                  <Button variant="outline" onClick={() => setResetConfirmOpen(true)} disabled={selectionMode}>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset
                  </Button>
                </>
              )}
              {canEdit && activeTab === 'active' && (
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
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-12 text-center text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                Loading units…
              </div>
            ) : error ? (
              <div className="py-12 text-center text-destructive text-sm">
                Failed to load units. Please refresh.
              </div>
            ) : (
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
                        const editable = canEdit;
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
                              disabled={!editable}
                              onChange={(e) => applyOptimistic(row.id, { unit: e.target.value })}
                              onBlur={async (e) => {
                                const v = e.target.value;
                                const original = activeRows.find((r) => r.id === row.id)?.unit ?? '';
                                if (v !== original) {
                                  await persistField(row.id, 'unit', v);
                                }
                                clearOptimistic(row.id);
                                refetch();
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <ParentSectionPicker
                              value={row.parentSection}
                              onChange={(v) => applyOptimistic(row.id, { parentSection: v })}
                              onCommit={async (v) => {
                                if (!editable) return;
                                await persistField(row.id, 'parent_section', v);
                                clearOptimistic(row.id);
                                refetch();
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Select
                              value={row.division}
                              disabled={!editable}
                              onValueChange={async (v) => {
                                applyOptimistic(row.id, { division: v });
                                await persistField(row.id, 'division', v);
                                clearOptimistic(row.id);
                                refetch();
                              }}
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
                              onChange={(v) => applyOptimistic(row.id, { manager: v })}
                              onCommit={async (v) => {
                                if (!editable) return;
                                await persistField(row.id, 'manager', v);
                                clearOptimistic(row.id);
                                refetch();
                              }}
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
                              {canEdit && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRestore(row.id)}
                                >
                                  <Undo2 className="w-4 h-4 mr-2" />
                                  Restore
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
            )}
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

      <AlertDialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset to defaults?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete ALL current rows (including decommissioned ones)
              and reinsert the default Units & Divisions list. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset}>
              Yes, reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AddOrgUnitDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        existingUnits={rows.map((r) => r.unit)}
        onCreated={refetch}
      />

      <Dialog open={importResultOpen} onOpenChange={setImportResultOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import complete</DialogTitle>
            <DialogDescription>
              {importResult
                ? `${importResult.added.length} added · ${importResult.updated.length} updated · ${importResult.skipped.length} skipped`
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
