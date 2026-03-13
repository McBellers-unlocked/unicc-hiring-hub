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
import { Plus, Trash2, ChevronDown, Send, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { DEFAULT_ITEMS } from "@/data/strategyTrackerDefaults";

const YEARS = ["2025", "2026", "2027", "2028"] as const;
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

type UpdateEntry = {
  id: string;
  text: string;
  author: string;
  date: string;
};

type StrategyItem = {
  id: string;
  actionItem: string;
  year: string[];
  status: Status;
  owner: string[];
  priority: string;
  updates: UpdateEntry[];
  prioritisationUpdates: UpdateEntry[];
  pillar: string;
  participants: string[];
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

const migrateUpdatesField = (val: any): UpdateEntry[] => {
  if (Array.isArray(val)) return val;
  if (typeof val === "string" && val.trim()) {
    return [{ id: crypto.randomUUID(), text: val, author: "Unknown", date: new Date().toISOString() }];
  }
  return [];
};

const migrateItem = (item: any): StrategyItem => ({
  ...item,
  year: Array.isArray(item.year) ? item.year : (item.year ? [item.year] : ["2026"]),
  owner: Array.isArray(item.owner) ? item.owner : (item.owner ? [item.owner] : []),
  updates: migrateUpdatesField(item.updates),
  prioritisationUpdates: migrateUpdatesField(item.prioritisationUpdates),
  participants: Array.isArray(item.participants)
    ? item.participants
    : typeof item.participants === "string" && item.participants.trim()
      ? item.participants.split(",").map((s: string) => s.trim()).filter(Boolean)
      : [],
});

const newItem = (): StrategyItem => ({
  id: crypto.randomUUID(),
  actionItem: "",
  year: ["2026"],
  status: "Not started",
  owner: [],
  priority: "",
  updates: [],
  prioritisationUpdates: [],
  pillar: "",
  participants: [],
});

const StrategyTracker = () => {
  const { userName } = useAuth();

  const { data: users = [] } = useQuery({
    queryKey: ["strategy-tracker-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, name, email")
        .not("name", "is", null)
        .ilike("email", "%@unicc.org")
        .or("name.ilike.%LAVAL%,name.ilike.%NEGYESI%,name.ilike.%VALENTE%,name.ilike.%ARISTA%,name.ilike.%LEHTINEN%,name.ilike.%ROMANO%,name.ilike.%GUARDENO%")
        .order("name");
      if (error) throw error;
      const surnames = ["LAVAL", "NEGYESI", "VALENTE", "ARISTA", "LEHTINEN", "ROMANO", "GUARDENO"];
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
    return DEFAULT_ITEMS;
  });

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [newUpdateText, setNewUpdateText] = useState<Record<string, string>>({});
  const [newPriorUpdateText, setNewPriorUpdateText] = useState<Record<string, string>>({});
  const [participantInput, setParticipantInput] = useState<Record<string, string>>({});

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const update = useCallback(
    (id: string, field: keyof StrategyItem, value: any) => {
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
      );
    },
    []
  );

  const addUpdateEntry = useCallback(
    (itemId: string, field: "updates" | "prioritisationUpdates", text: string) => {
      if (!text.trim()) return;
      const entry: UpdateEntry = {
        id: crypto.randomUUID(),
        text: text.trim(),
        author: userName || "Unknown",
        date: new Date().toISOString(),
      };
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, [field]: [entry, ...item[field]] } : item
        )
      );
    },
    [userName]
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
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" className="h-8 px-2 text-xs font-normal justify-start w-full">
                            {item.year.length > 0 ? item.year.join(", ") : "Select years"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-36 p-2" align="start">
                          {YEARS.map((y) => (
                            <label key={y} className="flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer hover:bg-accent rounded-sm">
                              <Checkbox
                                checked={item.year.includes(y)}
                                onCheckedChange={() => toggleArrayValue(item.id, "year", y)}
                              />
                              {y}
                            </label>
                          ))}
                        </PopoverContent>
                      </Popover>
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
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" className="h-8 px-2 text-xs font-normal justify-start w-full truncate">
                            {item.owner.length > 0
                              ? item.owner.map((o) => o.split(" ")[0]).join(", ")
                              : "Select owners"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56 p-2" align="start">
                          {users.map((u) => (
                            <label key={u.id} className="flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer hover:bg-accent rounded-sm">
                              <Checkbox
                                checked={item.owner.includes(u.name)}
                                onCheckedChange={() => toggleArrayValue(item.id, "owner", u.name)}
                              />
                              <span className="truncate">{u.name}</span>
                            </label>
                          ))}
                        </PopoverContent>
                      </Popover>
                    </TableCell>
                  </TableRow>

                  {/* Expandable detail row */}
                  {expandedRows.has(item.id) && (
                    <TableRow className="bg-muted/20">
                      <TableCell colSpan={6} className="pt-0 pb-4 px-6">
                        <div className="grid grid-cols-2 gap-4 mt-2">
                          <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">Updates</label>
                            <div className="flex gap-2">
                              <Textarea
                                value={newUpdateText[item.id] || ""}
                                onChange={(e) => setNewUpdateText((prev) => ({ ...prev, [item.id]: e.target.value }))}
                                className="min-h-[40px] resize-y text-sm flex-1"
                                placeholder="Add an update..."
                                rows={1}
                              />
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-9 w-9 shrink-0"
                                onClick={() => {
                                  addUpdateEntry(item.id, "updates", newUpdateText[item.id] || "");
                                  setNewUpdateText((prev) => ({ ...prev, [item.id]: "" }));
                                }}
                                disabled={!newUpdateText[item.id]?.trim()}
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                            </div>
                            {item.updates.length > 0 && (
                              <div className="max-h-[120px] overflow-y-auto space-y-1.5">
                                {item.updates.map((entry) => (
                                  <div key={entry.id} className="rounded-md bg-muted/50 px-3 py-2 text-sm">
                                    <p className="whitespace-pre-wrap">{entry.text}</p>
                                    <p className="text-[11px] text-muted-foreground mt-1">
                                      {entry.author} · {formatDistanceToNow(new Date(entry.date), { addSuffix: true })}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">Prioritisation Updates</label>
                            <div className="flex gap-2">
                              <Textarea
                                value={newPriorUpdateText[item.id] || ""}
                                onChange={(e) => setNewPriorUpdateText((prev) => ({ ...prev, [item.id]: e.target.value }))}
                                className="min-h-[40px] resize-y text-sm flex-1"
                                placeholder="Add a prioritisation update..."
                                rows={1}
                              />
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-9 w-9 shrink-0"
                                onClick={() => {
                                  addUpdateEntry(item.id, "prioritisationUpdates", newPriorUpdateText[item.id] || "");
                                  setNewPriorUpdateText((prev) => ({ ...prev, [item.id]: "" }));
                                }}
                                disabled={!newPriorUpdateText[item.id]?.trim()}
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                            </div>
                            {item.prioritisationUpdates.length > 0 && (
                              <div className="max-h-[120px] overflow-y-auto space-y-1.5">
                                {item.prioritisationUpdates.map((entry) => (
                                  <div key={entry.id} className="rounded-md bg-muted/50 px-3 py-2 text-sm">
                                    <p className="whitespace-pre-wrap">{entry.text}</p>
                                    <p className="text-[11px] text-muted-foreground mt-1">
                                      {entry.author} · {formatDistanceToNow(new Date(entry.date), { addSuffix: true })}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}
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
                              value={participantInput[item.id] || ""}
                              onChange={(e) => setParticipantInput((prev) => ({ ...prev, [item.id]: e.target.value }))}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  const val = (participantInput[item.id] || "").trim();
                                  if (val && !item.participants.includes(val)) {
                                    update(item.id, "participants", [...item.participants, val]);
                                  }
                                  setParticipantInput((prev) => ({ ...prev, [item.id]: "" }));
                                }
                              }}
                              className="h-9 text-sm"
                              placeholder="Type a participant and press Enter..."
                            />
                            {item.participants.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-1.5">
                                {item.participants.map((p) => (
                                  <Badge key={p} variant="secondary" className="gap-1 pr-1">
                                    {p}
                                    <button
                                      type="button"
                                      className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
                                      onClick={() => update(item.id, "participants", item.participants.filter((v) => v !== p))}
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </Badge>
                                ))}
                              </div>
                            )}
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
