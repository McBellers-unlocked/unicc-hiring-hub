import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { MapPin, Users, TrendingUp, TrendingDown } from "lucide-react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
} from "react-simple-maps";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

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
  coverage: number;
  strengths: string[];
  gaps: string[];
  skills: Record<SkillName, { count: number; required: number }>;
  coordinates: [number, number]; // [lng, lat]
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
    coordinates: [-0.3763, 39.4699],
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
    coordinates: [6.1432, 46.2044],
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
    coordinates: [-74.006, 40.7128],
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
    coordinates: [17.9369, 40.6326],
  },
  {
    name: "Rome",
    staff: 15,
    coverage: 48,
    strengths: ["Data Analytics", "Policy & Governance", "Communication"],
    gaps: ["Cloud Architecture", "AI/ML", "DevOps"],
    skills: {
      "Cloud Architecture": { count: 1, required: 4 },
      "Cybersecurity": { count: 2, required: 4 },
      "AI/ML": { count: 0, required: 3 },
      "DevOps": { count: 1, required: 3 },
      "Data Analytics": { count: 5, required: 4 },
      "Leadership": { count: 3, required: 4 },
      "Communication": { count: 5, required: 4 },
      "Policy & Governance": { count: 5, required: 3 },
      "Strategic Planning": { count: 2, required: 3 },
      "Change Management": { count: 3, required: 3 },
    },
    coordinates: [12.4964, 41.9028],
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
  return Math.max(4, Math.sqrt(staff) * 1.8);
}

export default function GeographicSkillsView() {
  const [openStation, setOpenStation] = useState<string | null>(null);
  const [hoveredStation, setHoveredStation] = useState<string | null>(null);

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
          <div className="rounded-lg overflow-hidden border" style={{ background: "hsl(210 60% 88%)" }}>
            <ComposableMap
              projection="geoEqualEarth"
              projectionConfig={{ scale: 160 }}
              width={800}
              height={450}
              style={{ width: "100%", height: "auto" }}
            >
              <Geographies geography={GEO_URL}>
                {({ geographies }) =>
                  geographies.map((geo) => (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill="hsl(40 30% 92%)"
                      stroke="hsl(var(--border))"
                      strokeWidth={0.5}
                      style={{
                        default: { outline: "none" },
                        hover: { outline: "none", fill: "hsl(var(--muted))" },
                        pressed: { outline: "none" },
                      }}
                    />
                  ))
                }
              </Geographies>

              {STATIONS.map((station) => {
                const r = getRadius(station.staff);
                const health = getHealthColor(station.coverage);
                const isHovered = hoveredStation === station.name;

                return (
                  <Marker key={station.name} coordinates={station.coordinates}>
                    <Popover
                      open={openStation === station.name}
                      onOpenChange={(o) => setOpenStation(o ? station.name : null)}
                    >
                      <PopoverTrigger asChild>
                        <g
                          className="cursor-pointer"
                          role="button"
                          tabIndex={0}
                          onMouseEnter={() => setHoveredStation(station.name)}
                          onMouseLeave={() => setHoveredStation(null)}
                        >
                          {/* Pulse ring */}
                          <circle
                            r={r + 3}
                            fill="none"
                            stroke={health.fill}
                            strokeWidth="1.5"
                            opacity="0.35"
                          />
                          {/* Main circle */}
                          <circle
                            r={r}
                            fill={health.fill}
                            fillOpacity="0.85"
                            stroke="white"
                            strokeWidth="1.5"
                          />
                          {/* Hover label */}
                          {isHovered && (
                            <text
                              y={-(r + 8)}
                              textAnchor="middle"
                              fontSize="10"
                              fontWeight="600"
                              fill="hsl(var(--foreground))"
                              className="pointer-events-none"
                            >
                              {station.name.replace(" (HQ)", "")}
                            </text>
                          )}
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
                  </Marker>
                );
              })}
            </ComposableMap>
          </div>
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
                        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: health.fill }} />
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
