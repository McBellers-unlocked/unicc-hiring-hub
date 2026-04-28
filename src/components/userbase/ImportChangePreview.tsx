import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { InlineTrackChanges } from '@/components/InlineTrackChanges';
import { Loader2, RotateCcw, XCircle } from 'lucide-react';

export type ChangeStatus = 'new' | 'updated' | 'unchanged';

export interface FieldDiff {
  column: string;
  label: string;
  before: string;
  after: string;
}

export interface RowChange {
  matchKey: string;
  status: ChangeStatus;
  existingId?: string;
  isServiceTimeOnly?: boolean;
  name: string;
  email: string;
  staffNumber: string;
  source: string;
  diffs: FieldDiff[]; // for new: all populated fields (before = '')
  newFieldsCount: number;
}

export interface UnmatchedExtractRow {
  id: string;
  source: 'GSM only' | 'Samsaran Staff only';
  name: string;
  email: string;
  staffNumber: string;
  workerType?: string;
}

interface Props {
  changes: RowChange[];
  unmatchedRows: UnmatchedExtractRow[];
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  saving: boolean;
  rejectedKeys: Set<string>;
  onToggleRejected: (matchKey: string) => void;
}

const truncate = (s: string, n = 30) =>
  s.length > n ? s.slice(0, n - 1) + '…' : s;

export function ImportChangePreview({ changes, unmatchedRows, loading, onCancel, onConfirm, saving, rejectedKeys, onToggleRejected }: Props) {
  const [tab, setTab] = useState<'all' | 'new' | 'updated' | 'unchanged' | 'unmatched'>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<RowChange | null>(null);

  const counts = useMemo(() => {
    const c = { new: 0, updated: 0, unchanged: 0, fields: 0 };
    for (const r of changes) {
      if (r.status === 'updated' && r.isServiceTimeOnly) continue;
      c[r.status]++;
      if (r.status === 'updated') c.fields += r.diffs.length;
    }
    return c;
  }, [changes]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return changes.filter((r) => {
      if (tab === 'new' && r.status !== 'new') return false;
      if (tab === 'updated' && (r.status !== 'updated' || r.isServiceTimeOnly)) return false;
      if (tab === 'unchanged' && r.status !== 'unchanged') return false;
      if (tab === 'unmatched') return false;
      if (tab === 'all' && (r.status === 'unchanged' || r.isServiceTimeOnly)) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.staffNumber.toLowerCase().includes(q)
      );
    });
  }, [changes, tab, search]);

  const autoApprovedCount = changes.filter((r) => r.status === 'updated' && r.isServiceTimeOnly && !rejectedKeys.has(r.matchKey)).length;
  const rejectedCount = rejectedKeys.size;
  const pendingCount = changes.filter((r) => (r.status === 'new' || r.status === 'updated') && !rejectedKeys.has(r.matchKey)).length;

  if (loading) {
    return (
      <Card className="mb-6">
        <CardContent className="py-12 flex items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          Comparing with existing database…
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Review changes before saving</CardTitle>
          <CardDescription>
            <span className="text-foreground font-medium">{counts.new}</span> new ·{' '}
            <span className="text-foreground font-medium">{counts.updated}</span> updated ·{' '}
            <span className="text-foreground font-medium">{counts.unchanged}</span> unchanged ·{' '}
            <span className="text-foreground font-medium">{counts.fields}</span> field{counts.fields === 1 ? '' : 's'} will change
            {autoApprovedCount > 0 && <> · <span className="text-foreground font-medium">{autoApprovedCount}</span> service-time update{autoApprovedCount === 1 ? '' : 's'} auto-approved</>}
            {rejectedCount > 0 && <> · <span className="text-foreground font-medium">{rejectedCount}</span> rejected</>}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
              <TabsList>
                <TabsTrigger value="all">All changes ({counts.new + counts.updated})</TabsTrigger>
                <TabsTrigger value="new">New ({counts.new})</TabsTrigger>
                <TabsTrigger value="updated">Updated ({counts.updated})</TabsTrigger>
                <TabsTrigger value="unchanged">Unchanged ({counts.unchanged})</TabsTrigger>
              </TabsList>
            </Tabs>
            <Input
              placeholder="Search name, email, staff #"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
          </div>

          <div className="border rounded-md max-h-[55vh] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Staff #</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Changes</TableHead>
                  <TableHead className="w-[110px] text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No rows to display.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((r) => (
                    <TableRow key={r.matchKey} className={rejectedKeys.has(r.matchKey) ? 'opacity-60' : undefined}>
                      <TableCell>
                        {r.status === 'new' && <Badge>New</Badge>}
                        {r.status === 'updated' && <Badge variant="secondary">Updated</Badge>}
                        {r.status === 'unchanged' && <Badge variant="outline">Unchanged</Badge>}
                      </TableCell>
                      <TableCell className="font-medium cursor-pointer" onClick={() => setSelected(r)}>{r.name || '—'}</TableCell>
                      <TableCell className="text-sm cursor-pointer" onClick={() => setSelected(r)}>{r.email || '—'}</TableCell>
                      <TableCell className="text-sm cursor-pointer" onClick={() => setSelected(r)}>{r.staffNumber || '—'}</TableCell>
                      <TableCell className="text-sm capitalize cursor-pointer" onClick={() => setSelected(r)}>{r.source}</TableCell>
                      <TableCell className="cursor-pointer" onClick={() => setSelected(r)}>
                        {r.status === 'new' ? (
                          <Badge variant="outline" className="text-xs">
                            +{r.newFieldsCount} field{r.newFieldsCount === 1 ? '' : 's'} populated
                          </Badge>
                        ) : r.status === 'updated' ? (
                          <div className="flex flex-wrap gap-1 max-w-[520px]">
                            {r.diffs.slice(0, 4).map((d) => (
                              <Tooltip key={d.column}>
                                <TooltipTrigger asChild>
                                  <Badge variant="outline" className="text-xs font-normal">
                                    <span className="font-medium mr-1">{d.label}:</span>
                                    <span className="text-red-600 line-through">
                                      {truncate(d.before || '∅', 14)}
                                    </span>
                                    <span className="mx-1">→</span>
                                    <span className="text-green-700">
                                      {truncate(d.after || '∅', 14)}
                                    </span>
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-md">
                                  <div className="text-xs">
                                    <div className="font-medium mb-1">{d.label}</div>
                                    <div><span className="text-red-600">- </span>{d.before || '(empty)'}</div>
                                    <div><span className="text-green-700">+ </span>{d.after || '(empty)'}</div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            ))}
                            {r.diffs.length > 4 && (
                              <Badge variant="outline" className="text-xs">
                                +{r.diffs.length - 4} more
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">No changes</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {(r.status === 'new' || r.status === 'updated') && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => onToggleRejected(r.matchKey)}
                            disabled={saving}
                          >
                            {rejectedKeys.has(r.matchKey) ? <RotateCcw className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                            {rejectedKeys.has(r.matchKey) ? 'Restore' : 'Reject'}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" onClick={onCancel} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={onConfirm} disabled={pendingCount === 0 || saving}>
              {saving
                ? 'Saving…'
                : pendingCount === 0
                ? 'Nothing to save'
                : `Confirm and save ${pendingCount} change${pendingCount === 1 ? '' : 's'}`}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.name || '(no name)'}</SheetTitle>
                <SheetDescription>
                  {selected.email || '—'} · {selected.staffNumber || 'no staff #'}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                {selected.status === 'unchanged' ? (
                  <p className="text-sm text-muted-foreground">No changes for this record.</p>
                ) : selected.diffs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No populated fields.</p>
                ) : (
                  selected.diffs.map((d) => (
                    <InlineTrackChanges
                      key={d.column}
                      fieldLabel={d.label}
                      originalValue={d.before}
                      newValue={d.after}
                      showToggle={false}
                    />
                  ))
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </TooltipProvider>
  );
}
