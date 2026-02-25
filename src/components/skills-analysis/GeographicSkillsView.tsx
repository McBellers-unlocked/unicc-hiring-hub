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
  coverage: number;
  strengths: string[];
  gaps: string[];
  skills: Record<SkillName, { count: number; required: number }>;
  mapX: number;
  mapY: number;
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
    mapX: 480, mapY: 168,
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
    mapX: 506, mapY: 155,
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
    mapX: 270, mapY: 170,
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
    mapX: 530, mapY: 172,
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
    mapX: 515, mapY: 165,
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
  return Math.max(8, Math.sqrt(staff) * 2.5);
}

// Realistic simplified continent outlines for Mercator-like projection (viewBox 0 0 1000 500)
const CONTINENT_PATHS = [
  // North America
  "M 120,60 L 135,55 L 155,50 L 175,48 L 195,52 L 210,58 L 225,55 L 240,50 L 255,52 L 265,58 L 270,65 L 268,72 L 260,78 L 255,85 L 260,92 L 268,98 L 275,105 L 280,112 L 282,120 L 278,128 L 272,135 L 268,142 L 275,148 L 282,155 L 288,162 L 290,170 L 285,176 L 278,180 L 270,178 L 262,175 L 255,180 L 248,188 L 240,195 L 232,198 L 225,195 L 218,190 L 210,192 L 205,200 L 198,208 L 190,212 L 182,210 L 178,205 L 175,198 L 170,192 L 165,188 L 158,192 L 152,198 L 148,205 L 142,210 L 135,208 L 130,202 L 128,195 L 125,188 L 120,182 L 115,178 L 108,182 L 102,178 L 98,172 L 95,165 L 92,158 L 88,152 L 82,148 L 78,142 L 80,135 L 85,128 L 88,120 L 85,112 L 80,105 L 78,98 L 82,92 L 88,85 L 95,78 L 102,72 L 110,65 Z",
  // Central America & Caribbean
  "M 215,215 L 222,218 L 228,222 L 235,228 L 240,235 L 238,242 L 232,248 L 225,252 L 220,258 L 218,265 L 222,270 L 228,272 L 235,268 L 240,262 L 245,258 L 250,262 L 248,268 L 242,275 L 235,278 L 228,280 L 220,278 L 215,272 L 210,265 L 208,258 L 205,250 L 202,242 L 205,235 L 210,228 L 212,220 Z",
  // South America
  "M 260,275 L 272,270 L 285,268 L 298,272 L 310,278 L 318,285 L 322,295 L 325,308 L 328,320 L 330,332 L 328,345 L 322,358 L 315,368 L 308,378 L 302,388 L 295,395 L 288,400 L 280,405 L 272,408 L 265,412 L 258,418 L 252,425 L 248,432 L 245,438 L 242,445 L 240,450 L 238,455 L 242,458 L 248,455 L 252,448 L 255,442 L 258,435 L 262,428 L 258,422 L 252,415 L 248,408 L 245,400 L 242,392 L 240,385 L 238,378 L 235,370 L 232,362 L 230,355 L 228,348 L 225,340 L 222,332 L 220,325 L 218,318 L 220,310 L 225,302 L 232,295 L 240,288 L 248,282 Z",
  // Europe
  "M 460,68 L 472,62 L 485,58 L 498,55 L 510,58 L 520,62 L 528,68 L 535,75 L 540,82 L 545,90 L 548,98 L 550,105 L 548,112 L 542,118 L 535,122 L 528,128 L 522,135 L 518,142 L 525,148 L 532,152 L 538,158 L 542,165 L 538,172 L 532,178 L 525,182 L 518,185 L 510,188 L 502,185 L 495,180 L 488,175 L 480,172 L 472,175 L 465,180 L 458,185 L 450,182 L 445,175 L 442,168 L 440,160 L 438,152 L 435,145 L 432,138 L 430,130 L 432,122 L 438,115 L 445,108 L 448,100 L 450,92 L 452,85 L 455,78 Z",
  // Africa
  "M 450,195 L 462,190 L 475,188 L 488,190 L 500,195 L 512,200 L 522,208 L 530,218 L 535,228 L 538,240 L 540,252 L 542,265 L 540,278 L 535,290 L 530,302 L 528,315 L 525,328 L 520,340 L 515,352 L 508,362 L 500,370 L 492,375 L 485,378 L 478,380 L 470,378 L 462,372 L 455,365 L 450,355 L 445,345 L 442,335 L 440,325 L 438,315 L 435,305 L 432,295 L 430,285 L 428,275 L 430,265 L 432,255 L 435,245 L 438,235 L 442,225 L 445,215 L 448,205 Z",
  // Asia (simplified)
  "M 555,55 L 575,48 L 598,42 L 622,38 L 648,35 L 672,38 L 695,42 L 718,48 L 738,55 L 755,62 L 770,72 L 782,82 L 790,95 L 795,108 L 798,122 L 800,135 L 798,148 L 792,160 L 785,172 L 775,182 L 762,190 L 748,195 L 735,198 L 720,200 L 705,202 L 690,205 L 675,208 L 660,212 L 648,218 L 638,225 L 630,232 L 622,238 L 612,242 L 600,238 L 590,232 L 582,225 L 575,218 L 568,210 L 562,202 L 558,195 L 555,188 L 552,178 L 548,168 L 545,158 L 542,148 L 540,138 L 538,128 L 540,118 L 542,108 L 545,98 L 548,88 L 550,78 L 552,68 Z",
  // India subcontinent
  "M 648,220 L 658,215 L 668,218 L 675,225 L 680,235 L 682,248 L 680,260 L 675,272 L 668,282 L 660,288 L 652,285 L 645,278 L 640,268 L 638,255 L 640,242 L 642,232 Z",
  // Southeast Asia / Indonesia
  "M 710,215 L 722,210 L 735,212 L 748,218 L 758,225 L 765,232 L 770,240 L 768,248 L 760,252 L 750,255 L 740,258 L 730,260 L 720,258 L 712,252 L 708,245 L 705,238 L 705,228 Z",
  // Australia
  "M 755,320 L 775,312 L 798,308 L 820,312 L 838,320 L 850,332 L 855,348 L 852,362 L 842,375 L 828,385 L 812,390 L 795,388 L 780,382 L 768,372 L 758,360 L 752,345 L 752,332 Z",
  // Japan / Korean peninsula
  "M 808,105 L 815,98 L 822,95 L 828,98 L 832,105 L 835,115 L 832,125 L 828,132 L 822,138 L 815,135 L 810,128 L 808,118 Z",
  // UK & Ireland
  "M 462,82 L 468,78 L 475,76 L 480,78 L 482,85 L 480,92 L 475,98 L 468,100 L 462,98 L 460,92 L 460,86 Z",
  // Scandinavia
  "M 505,38 L 512,32 L 520,28 L 528,32 L 532,40 L 530,50 L 525,58 L 518,65 L 510,70 L 502,68 L 498,60 L 500,50 L 502,42 Z",
  // Greenland
  "M 310,18 L 325,12 L 342,8 L 358,12 L 370,20 L 375,32 L 372,45 L 365,55 L 355,62 L 342,65 L 328,62 L 318,55 L 310,45 L 308,32 Z",
  // Madagascar
  "M 558,340 L 565,335 L 570,340 L 572,350 L 568,360 L 562,365 L 555,362 L 552,352 L 555,342 Z",
  // New Zealand
  "M 878,378 L 882,372 L 888,370 L 892,375 L 890,382 L 885,388 L 880,390 L 876,385 Z",
];

// Graticule lines for professional cartographic look
function Graticules() {
  const lines: JSX.Element[] = [];
  // Latitude lines every 30 degrees (mapped to viewBox)
  for (let lat = 0; lat <= 5; lat++) {
    const y = 40 + lat * 85;
    lines.push(
      <line key={`lat-${lat}`} x1="50" y1={y} x2="950" y2={y}
        stroke="hsl(var(--border))" strokeWidth="0.5" strokeDasharray="4,6" opacity="0.3" />
    );
  }
  // Longitude lines every 30 degrees
  for (let lon = 0; lon <= 10; lon++) {
    const x = 50 + lon * 90;
    lines.push(
      <line key={`lon-${lon}`} x1={x} y1="20" x2={x} y2="480"
        stroke="hsl(var(--border))" strokeWidth="0.5" strokeDasharray="4,6" opacity="0.3" />
    );
  }
  return <>{lines}</>;
}

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
            viewBox="0 0 1000 500"
            className="w-full h-auto max-h-[480px] select-none rounded-lg overflow-hidden"
            style={{ background: "hsl(210 50% 96%)" }}
          >
            {/* Graticule grid */}
            <Graticules />

            {/* Continent outlines */}
            {CONTINENT_PATHS.map((d, i) => (
              <path
                key={i}
                d={d}
                fill="hsl(var(--muted))"
                stroke="hsl(var(--border))"
                strokeWidth="1"
                strokeLinejoin="round"
              />
            ))}

            {/* Station markers */}
            {STATIONS.map((station) => {
              const r = getRadius(station.staff);
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
                        r={r + 4}
                        fill="none"
                        stroke={health.fill}
                        strokeWidth="1.5"
                        opacity="0.35"
                      />
                      {/* Main circle */}
                      <circle
                        cx={station.mapX}
                        cy={station.mapY}
                        r={r}
                        fill={health.fill}
                        fillOpacity="0.85"
                        stroke="white"
                        strokeWidth="2"
                      />
                      {/* Label */}
                      <text
                        x={station.mapX}
                        y={station.mapY + r + 14}
                        textAnchor="middle"
                        fontSize="11"
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
