import React, { useState, useEffect, useCallback } from "react";
import { Layout } from "@/components/Layout";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, ChevronDown, Check } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const YEARS = ["2026", "2027", "2028"] as const;
const STATUSES = ["Achieved", "In progress", "Paused", "Not started"] as const;
const PRIORITIES = ["Critical", "Important", "Low", "Pause"] as const;
const PILLARS = [
  "Establish a best in class approach to talent acquisition",
  "Cultivate an engaging and positive employee experience",
  "Drive skills growth and elevate leadership skills",
  "Foster a culture of excellence, inclusion and wellbeing",
  "Leverage data driven decision making",
] as const;

type Status = (typeof STATUSES)[number];
type StrategyItem = {
  id: string;
  actionItem: string;
  year: string[];
  status: Status;
  owner: string[];
  priority: string;
  updates: string;
  prioritisationUpdates: string;
  pillar: string;
  participants: string;
};

const STATUS_STYLES: Record<Status, string> = {
  Achieved: "bg-green-100 text-green-800",
  "In progress": "bg-amber-100 text-amber-800",
  Paused: "bg-red-100 text-red-800",
  "Not started": "bg-gray-100 text-gray-600",
};

const PRIORITY_STYLES: Record<string, string> = {
  Critical: "bg-red-100 text-red-800",
  Important: "bg-amber-100 text-amber-800",
  Low: "bg-blue-100 text-blue-800",
  Pause: "bg-gray-100 text-gray-600",
};

const STORAGE_KEY = "strategy-tracker-items";

const migrateItem = (item: any): StrategyItem => ({
  ...item,
  year: Array.isArray(item.year) ? item.year : (item.year ? [item.year] : ["2026"]),
  owner: Array.isArray(item.owner) ? item.owner : (item.owner ? [item.owner] : []),
});

const newItem = (): StrategyItem => ({
  id: crypto.randomUUID(),
  actionItem: "",
  year: ["2026"],
  status: "Not started",
  owner: [],
  priority: "",
  updates: "",
  prioritisationUpdates: "",
  pillar: "",
  participants: "",
});

const StrategyTracker = () => {
  const { data: users = [] } = useQuery({
    queryKey: ["strategy-tracker-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, name, email")
        .not("name", "is", null)
        .ilike("email", "%@unicc.org")
        .or("name.ilike.%LAVAL%,name.ilike.%NEGYESI%,name.ilike.%VALENTE%,name.ilike.%ARISTA%,name.ilike.%LEHTINEN%")
        .order("name");
      if (error) throw error;
      const surnames = ["LAVAL", "NEGYESI", "VALENTE", "ARISTA", "LEHTINEN"];
      const seen = new Set<string>();
      const unique: { id: string; name: string }[] = [];
      for (const user of (data ?? [])) {
        const surname = surnames.find(s => user.name?.toUpperCase().includes(s));
        if (surname && !seen.has(surname)) {
          seen.add(surname);
          unique.push({ id: user.id, name: user.name });
        }
      }
      return unique;
    },
  });

  const [items, setItems] = useState<StrategyItem[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? (JSON.parse(stored) as any[]).map(migrateItem) : [newItem()];
    } catch {
      return [newItem()];
    }
  });

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const update = useCallback(
    (id: string, field: keyof StrategyItem, value: string | string[]) => {
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
      );
    },
    []
  );

  const toggleArrayValue = useCallback(
    (id: string, field: "year" | "owner", val: string) => {
      setItems((prev) =>
        prev.map((item) => {
          if (item.id !== id) return item;
          const arr = item[field];
          const next = arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val];
          return { ...item, [field]: next };
        })
      );
    },
    []
  );

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addRow = () => setItems((prev) => [...prev, newItem()]);
  const deleteRow = (id: string) =>
    setItems((prev) => prev.filter((item) => item.id !== id));

  return (
    <Layout>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">
            HR Strategy Tracker
          </h1>
          <Button onClick={addRow} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Add Row
          </Button>
        </div>

        <div className="border rounded-lg overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="w-10" />
                <TableHead className="min-w-[300px]">Action Item</TableHead>
                <TableHead className="min-w-[100px]">Year</TableHead>
                <TableHead className="min-w-[140px]">Status</TableHead>
                <TableHead className="min-w-[120px]">Priority</TableHead>
                <TableHead className="min-w-[180px]">Owner</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <React.Fragment key={item.id}>
                  {/* Main row */}
                  <TableRow className="border-b-0">
                    <TableCell className="p-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => toggleRow(item.id)}
                      >
                        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${expandedRows.has(item.id) ? "rotate-180" : ""}`} />
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Textarea
                        value={item.actionItem}
                        onChange={(e) => update(item.id, "actionItem", e.target.value)}
                        className="border-none shadow-none bg-transparent px-1 min-h-[80px] resize-y text-sm"
                        placeholder="Enter action item..."
                        rows={3}
                      />
                    </TableCell>
                    <TableCell>
                      <Select value={item.year} onValueChange={(v) => update(item.id, "year", v)}>
                        <SelectTrigger className="h-8 border-none shadow-none bg-transparent">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {YEARS.map((y) => (
                            <SelectItem key={y} value={y}>{y}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select value={item.status} onValueChange={(v) => update(item.id, "status", v)}>
                        <SelectTrigger className={`h-8 border-none shadow-none rounded-full text-xs font-medium px-3 ${STATUS_STYLES[item.status]}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[s]}`}>{s}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select value={item.priority || "_none"} onValueChange={(v) => update(item.id, "priority", v === "_none" ? "" : v)}>
                        <SelectTrigger className={`h-8 border-none shadow-none rounded-full text-xs font-medium px-3 ${item.priority ? PRIORITY_STYLES[item.priority] || "" : ""}`}>
                          <SelectValue placeholder="Set priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">Set priority</SelectItem>
                          {PRIORITIES.map((p) => (
                            <SelectItem key={p} value={p}>
                              <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLES[p]}`}>{p}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select value={item.owner || "_none"} onValueChange={(v) => update(item.id, "owner", v === "_none" ? "" : v)}>
                        <SelectTrigger className="h-8 border-none shadow-none bg-transparent text-xs">
                          <SelectValue placeholder="Select owner" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">Select owner</SelectItem>
                          {users.map((u) => (
                            <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>

                  {/* Expandable detail row */}
                  {expandedRows.has(item.id) && (
                    <TableRow className="bg-muted/20">
                      <TableCell colSpan={6} className="pt-0 pb-4 px-6">
                        <div className="grid grid-cols-2 gap-4 mt-2">
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Updates</label>
                            <Textarea
                              value={item.updates}
                              onChange={(e) => update(item.id, "updates", e.target.value)}
                              className="min-h-[60px] resize-y text-sm"
                              placeholder="Updates..."
                              rows={2}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Prioritisation Updates</label>
                            <Textarea
                              value={item.prioritisationUpdates}
                              onChange={(e) => update(item.id, "prioritisationUpdates", e.target.value)}
                              className="min-h-[60px] resize-y text-sm"
                              placeholder="Prioritisation updates..."
                              rows={2}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">2025 Pillar</label>
                            <Select value={item.pillar || "_none"} onValueChange={(v) => update(item.id, "pillar", v === "_none" ? "" : v)}>
                              <SelectTrigger className="h-9 text-xs">
                                <SelectValue placeholder="Select pillar" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="_none">Select pillar</SelectItem>
                                {PILLARS.map((p) => (
                                  <SelectItem key={p} value={p}>
                                    <span className="line-clamp-1">{p}</span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Participants</label>
                            <Input
                              value={item.participants}
                              onChange={(e) => update(item.id, "participants", e.target.value)}
                              className="h-9 text-sm"
                              placeholder="Participants..."
                            />
                          </div>
                        </div>
                        <div className="flex justify-end mt-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => deleteRow(item.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" /> Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </Layout>
  );
};

export default StrategyTracker;
