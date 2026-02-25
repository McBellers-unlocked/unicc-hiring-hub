import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { MapPin, Users, TrendingUp, TrendingDown } from "lucide-react";

// --- Dummy Data ---

const SKILLS = [
  "Cloud Architecture", "Cybersecurity", "AI/ML", "DevOps",
  "Data Analytics", "Leadership", "Communication",
  "Policy & Governance", "Strategic Planning", "Change Management",
] as const;

type SkillName = typeof SKILLS[number];

interface StationData {
  name: string;
  staff: number;
  coverage: number; // 0-100
  strengths: string[];
  gaps: string[];
  skills: Record<SkillName, { count: number; required: number }>;
  mapX: number; // SVG x %
  mapY: number; // SVG y %
}

const STATIONS: StationData[] = [
  {
    name: "Valencia (HQ)",
    staff: 120,
    coverage: 78,
    strengths: ["Cloud Architecture", "Cybersecurity", "DevOps"],
    gaps: ["Leadership", "Communication", "Change Management"],
    skills: {
      "Cloud Architecture": { count: 45, required: 40 },
      "Cybersecurity": { count: 38, required: 35 },
      "AI/ML": { count: 28, required: 30 },
      "DevOps": { count: 42, required: 38 },
      "Data Analytics": { count: 35, required: 30 },
      "Leadership": { count: 12, required: 25 },
      "Communication": { count: 15, required: 28 },
      "Policy & Governance": { count: 20, required: 22 },
      "Strategic Planning": { count: 18, required: 20 },
      "Change Management": { count: 10, required: 22 },
    },
    mapX: 48.5, mapY: 38,
  },
  {
    name: "Geneva",
    staff: 45,
    coverage: 74,
    strengths: ["Policy & Governance", "Strategic Planning", "Communication"],
    gaps: ["AI/ML", "DevOps", "Cloud Architecture"],
    skills: {
      "Cloud Architecture": { count: 5, required: 12 },
      "Cybersecurity": { count: 10, required: 12 },
      "AI/ML": { count: 3, required: 10 },
      "DevOps": { count: 4, required: 10 },
      "Data Analytics": { count: 12, required: 12 },
      "Leadership": { count: 18, required: 15 },
      "Communication": { count: 20, required: 15 },
      "Policy & Governance": { count: 22, required: 18 },
      "Strategic Planning": { count: 19, required: 15 },
      "Change Management": { count: 14, required: 12 },
    },
    mapX: 50.5, mapY: 34,
  },
  {
    name: "New York",
    staff: 30,
    coverage: 62,
    strengths: ["Strategic Planning", "Communication", "Policy & Governance"],
    gaps: ["Cloud Architecture", "AI/ML", "Cybersecurity"],
    skills: {
      "Cloud Architecture": { count: 3, required: 8 },
      "Cybersecurity": { count: 4, required: 8 },
      "AI/ML": { count: 2, required: 8 },
      "DevOps": { count: 3, required: 6 },
      "Data Analytics": { count: 8, required: 8 },
      "Leadership": { count: 12, required: 10 },
      "Communication": { count: 14, required: 10 },
      "Policy & Governance": { count: 13, required: 10 },
      "Strategic Planning": { count: 15, required: 10 },
      "Change Management": { count: 8, required: 8 },
    },
    mapX: 27, mapY: 36,
  },
  {
    name: "Brindisi",
    staff: 25,
    coverage: 35,
    strengths: ["DevOps", "Data Analytics", "Communication"],
    gaps: ["Cloud Architecture", "AI/ML", "Cybersecurity"],
    skills: {
      "Cloud Architecture": { count: 1, required: 8 },
      "Cybersecurity": { count: 2, required: 8 },
      "AI/ML": { count: 0, required: 6 },
      "DevOps": { count: 6, required: 6 },
      "Data Analytics": { count: 7, required: 6 },
      "Leadership": { count: 4, required: 6 },
      "Communication": { count: 5, required: 5 },
      "Policy & Governance": { count: 3, required: 5 },
      "Strategic Planning": { count: 2, required: 5 },
      "Change Management": { count: 2, required: 5 },
    },
    mapX: 52.5, mapY: 37,
  },
  {
    name: "Nairobi",
    staff: 15,
    coverage: 48,
    strengths: ["Communication", "Change Management", "Leadership"],
    gaps: ["Cloud Architecture", "AI/ML", "DevOps"],
    skills: {
      "Cloud Architecture": { count: 1, required: 4 },
      "Cybersecurity": { count: 2, required: 4 },
      "AI/ML": { count: 0, required: 3 },
      "DevOps": { count: 1, required: 3 },
      "Data Analytics": { count: 3, required: 4 },
      "Leadership": { count: 5, required: 4 },
      "Communication": { count: 6, required: 4 },
      "Policy & Governance": { count: 3, required: 3 },
      "Strategic Planning": { count: 2, required: 3 },
      "Change Management": { count: 4, required: 3 },
    },
    mapX: 55, mapY: 52,
  },
];

function getHealthColor(coverage: number) {
  if (coverage > 70) return { fill: "hsl(var(--chart-2))", label: "Healthy", badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" };
  if (coverage >= 40) return { fill: "hsl(var(--chart-4))", label: "Moderate", badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" };
  return { fill: "hsl(var(--destructive))", label: "Critical", badgeClass: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" };
}

function getCellColor(count: number, required: number) {
  const ratio = required === 0 ? 1 : count / required;
  if (ratio >= 0.9) return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300";
  if (ratio >= 0.5) return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
  return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
}

function getRadius(staff: number) {
  return Math.max(6, Math.sqrt(staff) * 1.8);
}

// Simplified continent outlines for the SVG map
const CONTINENT_PATHS = [
  // North America (simplified)
  "M 15,20 Q 18,18 22,17 L 28,18 L 32,22 Q 34,28 32,35 L 28,40 Q 25,42 22,40 L 18,38 Q 14,34 13,28 Z",
  // South America
  "M 25,48 Q 28,46 30,48 L 32,55 Q 33,62 31,68 L 28,72 Q 26,74 25,72 L 23,65 Q 22,58 23,52 Z",
  // Europe
  "M 46,18 Q 48,16 52,17 L 55,18 Q 56,20 55,24 L 53,28 Q 51,30 48,29 L 46,26 Q 44,22 46,18 Z",
  // Africa
  "M 46,35 Q 50,33 54,35 L 56,42 Q 58,50 56,58 L 53,64 Q 50,66 48,64 L 45,56 Q 43,48 44,40 Z",
  // Asia
  "M 56,16 Q 62,14 70,15 L 78,18 Q 82,22 80,28 L 76,32 Q 72,36 66,35 L 60,32 Q 56,28 55,22 Z",
  // Australia
  "M 76,54 Q 80,52 84,54 L 86,58 Q 86,62 84,64 L 80,65 Q 77,64 76,60 Z",
];

export default function GeographicSkillsView() {
  const [openStation, setOpenStation] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* Map Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Geographic Skills Dashboard
          </CardTitle>
          <CardDescription>
            Click duty stations to view skill coverage details. Circle size reflects staff count, color indicates coverage health.
          </CardDescription>
          <div className="flex gap-4 pt-2">
            {[
              { label: "Healthy (>70%)", cls: "bg-emerald-500" },
              { label: "Moderate (40-70%)", cls: "bg-amber-500" },
              { label: "Critical (<40%)", cls: "bg-red-500" },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={`inline-block h-3 w-3 rounded-full ${l.cls}`} />
                {l.label}
              </div>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <svg
            viewBox="0 0 100 80"
            className="w-full h-auto max-h-[420px] select-none"
            style={{ background: "hsl(var(--muted) / 0.3)" }}
          >
            {/* Continent outlines */}
            {CONTINENT_PATHS.map((d, i) => (
              <path
                key={i}
                d={d}
                fill="hsl(var(--muted))"
                stroke="hsl(var(--border))"
                strokeWidth="0.3"
              />
            ))}

            {/* Station markers */}
            {STATIONS.map((station) => {
              const r = getRadius(station.staff);
              const svgR = r / 6; // scale for viewBox
              const health = getHealthColor(station.coverage);

              return (
                <Popover
                  key={station.name}
                  open={openStation === station.name}
                  onOpenChange={(o) => setOpenStation(o ? station.name : null)}
                >
                  <PopoverTrigger asChild>
                    <g className="cursor-pointer" role="button" tabIndex={0}>
                      {/* Pulse ring */}
                      <circle
                        cx={station.mapX}
                        cy={station.mapY}
                        r={svgR + 0.8}
                        fill="none"
                        stroke={health.fill}
                        strokeWidth="0.3"
                        opacity="0.4"
                      />
                      {/* Main circle */}
                      <circle
                        cx={station.mapX}
                        cy={station.mapY}
                        r={svgR}
                        fill={health.fill}
                        fillOpacity="0.85"
                        stroke="hsl(var(--background))"
                        strokeWidth="0.4"
                      />
                      {/* Label */}
                      <text
                        x={station.mapX}
                        y={station.mapY + svgR + 2.2}
                        textAnchor="middle"
                        fontSize="2"
                        fill="hsl(var(--foreground))"
                        fontWeight="600"
                      >
                        {station.name.replace(" (HQ)", "")}
                      </text>
                    </g>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-0" side="top" sideOffset={8}>
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm">{station.name}</h4>
                        <Badge className={health.badgeClass} variant="outline">
                          {station.coverage}% coverage
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        {station.staff} staff members
                      </div>
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <div>
                          <div className="flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-1">
                            <TrendingUp className="h-3 w-3" /> Strengths
                          </div>
                          {station.strengths.map(s => (
                            <div key={s} className="text-xs text-muted-foreground truncate">• {s}</div>
                          ))}
                        </div>
                        <div>
                          <div className="flex items-center gap-1 text-xs font-medium text-red-700 dark:text-red-400 mb-1">
                            <TrendingDown className="h-3 w-3" /> Critical Gaps
                          </div>
                          {station.gaps.map(g => (
                            <div key={g} className="text-xs text-muted-foreground truncate">• {g}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              );
            })}
          </svg>
        </CardContent>
      </Card>

      {/* Comparison Matrix */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Skills Comparison Matrix</CardTitle>
          <CardDescription>
            Staff counts per skill at each duty station. Color indicates adequacy vs requirement.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[140px]">Duty Station</TableHead>
                {SKILLS.map(skill => (
                  <TableHead key={skill} className="text-xs text-center min-w-[90px] whitespace-nowrap">
                    {skill}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {STATIONS.map(station => {
                const health = getHealthColor(station.coverage);
                return (
                  <TableRow key={station.name}>
                    <TableCell className="font-medium text-sm">
                      <div className="flex items-center gap-2">
                        <span className={`inline-block h-2.5 w-2.5 rounded-full`} style={{ background: health.fill }} />
                        {station.name}
                      </div>
                    </TableCell>
                    {SKILLS.map(skill => {
                      const s = station.skills[skill];
                      return (
                        <TableCell key={skill} className="text-center p-1.5">
                          <span className={`inline-flex items-center justify-center rounded px-2 py-0.5 text-xs font-medium ${getCellColor(s.count, s.required)}`}>
                            {s.count}/{s.required}
                          </span>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
