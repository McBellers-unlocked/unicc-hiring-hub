import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ShieldAlert } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const PILLARS = [
  "Establish a best in class approach to talent acquisition",
  "Cultivate an engaging and positive employee experience",
  "Drive skills growth and elevate leadership skills",
  "Foster a culture of excellence, inclusion and wellbeing",
  "Leverage data driven decision making",
] as const;

type Status = "Achieved" | "In progress" | "Paused" | "Not started";

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

type UpdateEntry = { id: string; text: string; author: string; date: string };

type StrategyItem = {
  id: string;
  action_item: string;
  year: string[];
  status: Status;
  owner: string[];
  priority: string;
  updates: UpdateEntry[];
  prioritisation_updates: UpdateEntry[];
  pillar: string;
  participants: string[];
};

const mapFromDbRow = (row: any): StrategyItem => ({
  id: row.id,
  action_item: row.action_item || "",
  year: row.year || [],
  status: row.status || "Not started",
  owner: row.owner || [],
  priority: row.priority || "",
  updates: Array.isArray(row.updates) ? row.updates : [],
  prioritisation_updates: Array.isArray(row.prioritisation_updates) ? row.prioritisation_updates : [],
  pillar: row.pillar || "",
  participants: row.participants || [],
});

const StrategyTrackerPublic = () => {
  const { token } = useParams<{ token: string }>();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const { data: items = [], isLoading, isError } = useQuery({
    queryKey: ["strategy-tracker-public", token],
    queryFn: async () => {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/get-strategy-tracker-public?token=${encodeURIComponent(token || "")}`
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Access denied");
      }
      const data = await res.json();
      return (data as any[]).map(mapFromDbRow);
    },
    enabled: !!token,
    retry: false,
  });

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (isError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background text-muted-foreground">
        <ShieldAlert className="h-16 w-16" />
        <h2 className="text-xl font-semibold text-foreground">Access Denied</h2>
        <p>This link is invalid or has expired.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        Loading strategy tracker...
      </div>
    );
  }

  const sorted = [...items].sort((a, b) => {
    const idxA = PILLARS.indexOf(a.pillar as any);
    const idxB = PILLARS.indexOf(b.pillar as any);
    return (idxA === -1 ? PILLARS.length : idxA) - (idxB === -1 ? PILLARS.length : idxB);
  });

  let lastPillar = "";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-6 py-4">
        <h1 className="text-2xl font-bold text-foreground">HR Strategy Tracker</h1>
        <p className="text-sm text-muted-foreground mt-1">UNICC — Read-only view</p>
      </header>

      <div className="p-6">
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
              {sorted.map((item) => {
                const showPillarHeader = item.pillar && item.pillar !== lastPillar;
                if (item.pillar) lastPillar = item.pillar;

                return (
                  <React.Fragment key={item.id}>
                    {showPillarHeader && (
                      <TableRow className="bg-primary/5">
                        <TableCell colSpan={6} className="py-2 px-4">
                          <span className="text-xs font-semibold uppercase tracking-wide text-primary">
                            {item.pillar}
                          </span>
                        </TableCell>
                      </TableRow>
                    )}
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
                      <TableCell className="text-sm whitespace-pre-wrap">{item.action_item}</TableCell>
                      <TableCell className="text-xs">{item.year.join(", ")}</TableCell>
                      <TableCell>
                        <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[item.status] || ""}`}>
                          {item.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        {item.priority && (
                          <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${PRIORITY_STYLES[item.priority] || ""}`}>
                            {item.priority}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {item.owner.map((o) => o.split(" ")[0]).join(", ")}
                      </TableCell>
                    </TableRow>

                    {expandedRows.has(item.id) && (
                      <TableRow className="bg-muted/20">
                        <TableCell colSpan={6} className="pt-0 pb-4 px-6">
                          <div className="grid grid-cols-2 gap-4 mt-2">
                            <div className="space-y-2">
                              <label className="text-xs font-medium text-muted-foreground">Updates</label>
                              {item.updates.length > 0 ? (
                                <div className="max-h-[160px] overflow-y-auto space-y-1.5">
                                  {item.updates.map((entry) => (
                                    <div key={entry.id} className="rounded-md bg-muted/50 px-3 py-2 text-sm">
                                      <p className="whitespace-pre-wrap">{entry.text}</p>
                                      <p className="text-[11px] text-muted-foreground mt-1">
                                        {entry.author} · {formatDistanceToNow(new Date(entry.date), { addSuffix: true })}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground">No updates yet.</p>
                              )}
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-medium text-muted-foreground">Prioritisation Updates</label>
                              {item.prioritisation_updates.length > 0 ? (
                                <div className="max-h-[160px] overflow-y-auto space-y-1.5">
                                  {item.prioritisation_updates.map((entry) => (
                                    <div key={entry.id} className="rounded-md bg-muted/50 px-3 py-2 text-sm">
                                      <p className="whitespace-pre-wrap">{entry.text}</p>
                                      <p className="text-[11px] text-muted-foreground mt-1">
                                        {entry.author} · {formatDistanceToNow(new Date(entry.date), { addSuffix: true })}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground">No prioritisation updates yet.</p>
                              )}
                            </div>
                            {item.participants.length > 0 && (
                              <div className="space-y-1">
                                <label className="text-xs font-medium text-muted-foreground">Participants</label>
                                <div className="flex flex-wrap gap-1.5">
                                  {item.participants.map((p) => (
                                    <Badge key={p} variant="secondary">{p}</Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default StrategyTrackerPublic;
