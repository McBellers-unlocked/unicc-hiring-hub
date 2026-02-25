import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Rocket, TrendingUp } from "lucide-react";

const readinessScore = 67;
const staffAssessed = 87;
const totalStaff = 130;

const trendData = [
  { month: "Sep", value: 45 },
  { month: "Oct", value: 52 },
  { month: "Nov", value: 55 },
  { month: "Dec", value: 61 },
  { month: "Jan", value: 64 },
  { month: "Feb", value: 67 },
];

const skillBreakdown = [
  { name: "AI & Machine Learning", value: 42 },
  { name: "Cloud Infrastructure", value: 71 },
  { name: "Data Analytics", value: 78 },
  { name: "Cybersecurity", value: 65 },
  { name: "DevOps & Automation", value: 58 },
];

function TrendSparkline() {
  const w = 120, h = 40, pad = 4;
  const min = Math.min(...trendData.map(d => d.value));
  const max = Math.max(...trendData.map(d => d.value));
  const points = trendData.map((d, i) => {
    const x = pad + (i / (trendData.length - 1)) * (w - pad * 2);
    const y = h - pad - ((d.value - min) / (max - min)) * (h - pad * 2);
    return `${x},${y}`;
  }).join(" ");

  return (
    <div className="flex flex-col items-end">
      <svg width={w} height={h} className="overflow-visible">
        <defs>
          <linearGradient id="sparkGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="hsl(142 71% 45%)" />
            <stop offset="100%" stopColor="hsl(45 93% 47%)" />
          </linearGradient>
        </defs>
        <polyline
          points={points}
          fill="none"
          stroke="url(#sparkGrad)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div className="flex justify-between w-full px-1 mt-0.5">
        {trendData.map(d => (
          <span key={d.month} className="text-[9px] text-muted-foreground">{d.month}</span>
        ))}
      </div>
    </div>
  );
}

export default function FutureReadinessCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Rocket className="h-5 w-5 text-primary" />
          Future Readiness Score
        </CardTitle>
        <CardDescription>
          Staff proficiency in emerging & new skills
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-4xl font-bold">{readinessScore}%</p>
              <div className="flex items-center gap-1 text-sm text-yellow-600">
                <TrendingUp className="h-4 w-4" />
                <span>Good Progress</span>
              </div>
            </div>
            <div className="text-right space-y-1">
              <div className="text-sm text-muted-foreground">
                <p>{staffAssessed} of {totalStaff}</p>
                <p>staff assessed</p>
              </div>
              <TrendSparkline />
            </div>
          </div>

          <Progress value={readinessScore} className="h-3 [&>div]:bg-yellow-500" />

          <div className="space-y-3 pt-1">
            {skillBreakdown.map(skill => (
              <div key={skill.name} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{skill.name}</span>
                  <span className="font-medium">{skill.value}%</span>
                </div>
                <Progress value={skill.value} className="h-2" />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
