import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Cell, Tooltip, LabelList } from "recharts";
import { AlertTriangle, ArrowDown, Minus } from "lucide-react";
import { ACCESSIBLE_COLORS } from "@/lib/accessibilityPatterns";

interface SkillGap {
  skillName: string;
  skillId: string;
  gapCount: number;
  totalGap: number;
}

interface Props {
  data: SkillGap[];
}

// SVG pattern definitions for accessibility
const PatternDefs = () => (
  <defs>
    <pattern id="bar-diagonal-heavy" patternUnits="userSpaceOnUse" width="6" height="6">
      <path d="M-1.5,1.5 l3,-3 M0,6 l6,-6 M4.5,7.5 l3,-3" stroke="rgba(255,255,255,0.4)" strokeWidth="2"/>
    </pattern>
    <pattern id="bar-diagonal-light" patternUnits="userSpaceOnUse" width="8" height="8">
      <path d="M-2,2 l4,-4 M0,8 l8,-8 M6,10 l4,-4" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5"/>
    </pattern>
    <pattern id="bar-horizontal" patternUnits="userSpaceOnUse" width="6" height="6">
      <path d="M0,3 l6,0" stroke="rgba(255,255,255,0.25)" strokeWidth="1"/>
    </pattern>
  </defs>
);

export default function TopSkillGapsChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
        <p>No skill gaps detected. Great job!</p>
      </div>
    );
  }

  const chartData = data.map(d => ({
    skill: d.skillName.length > 20 ? d.skillName.slice(0, 18) + '...' : d.skillName,
    fullName: d.skillName,
    gap: d.totalGap,
    count: d.gapCount,
    severity: d.totalGap >= 4 ? 'critical' : d.totalGap >= 2 ? 'moderate' : 'minor',
  }));

  const getBarColor = (severity: string) => {
    switch (severity) {
      case 'critical': return ACCESSIBLE_COLORS.criticalGap.bg;
      case 'moderate': return ACCESSIBLE_COLORS.minorGap.bg;
      default: return '#fcd34d';
    }
  };

  const getBarPattern = (severity: string) => {
    switch (severity) {
      case 'critical': return 'url(#bar-diagonal-heavy)';
      case 'moderate': return 'url(#bar-diagonal-light)';
      default: return 'url(#bar-horizontal)';
    }
  };

  const GapIcon = ({ severity }: { severity: string }) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="h-3 w-3 text-red-500" />;
      case 'moderate':
        return <ArrowDown className="h-3 w-3 text-orange-500" />;
      default:
        return <Minus className="h-3 w-3 text-yellow-500" />;
    }
  };

  // Custom label with icon
  const CustomLabel = (props: any) => {
    const { x, y, width, height, value, index } = props;
    const item = chartData[index];
    if (!item) return null;
    
    return (
      <g>
        {/* Value label */}
        <text
          x={x + width + 8}
          y={y + height / 2}
          fill="hsl(var(--foreground))"
          textAnchor="start"
          dominantBaseline="middle"
          className="text-xs font-bold"
        >
          {value}
        </text>
        {/* Severity icon indicator */}
        <foreignObject x={x + width + 28} y={y + height / 2 - 8} width={20} height={16}>
          <div className="flex items-center justify-center h-full">
            <GapIcon severity={item.severity} />
          </div>
        </foreignObject>
      </g>
    );
  };

  return (
    <div className="space-y-3">
      {/* Accessible legend */}
      <div className="flex flex-wrap gap-3 text-xs px-2">
        <div className="flex items-center gap-1.5" role="listitem">
          <div 
            className="w-4 h-3 rounded-sm relative overflow-hidden"
            style={{ backgroundColor: ACCESSIBLE_COLORS.criticalGap.bg }}
          >
            <svg className="absolute inset-0 w-full h-full">
              <PatternDefs />
              <rect width="100%" height="100%" fill="url(#bar-diagonal-heavy)" />
            </svg>
          </div>
          <AlertTriangle className="h-3 w-3 text-red-500" />
          <span className="text-muted-foreground">Critical (4+)</span>
        </div>
        <div className="flex items-center gap-1.5" role="listitem">
          <div 
            className="w-4 h-3 rounded-sm relative overflow-hidden"
            style={{ backgroundColor: ACCESSIBLE_COLORS.minorGap.bg }}
          >
            <svg className="absolute inset-0 w-full h-full">
              <PatternDefs />
              <rect width="100%" height="100%" fill="url(#bar-diagonal-light)" />
            </svg>
          </div>
          <ArrowDown className="h-3 w-3 text-orange-500" />
          <span className="text-muted-foreground">Moderate (2-3)</span>
        </div>
        <div className="flex items-center gap-1.5" role="listitem">
          <div 
            className="w-4 h-3 rounded-sm relative overflow-hidden"
            style={{ backgroundColor: '#fcd34d' }}
          >
            <svg className="absolute inset-0 w-full h-full">
              <PatternDefs />
              <rect width="100%" height="100%" fill="url(#bar-horizontal)" />
            </svg>
          </div>
          <Minus className="h-3 w-3 text-yellow-600" />
          <span className="text-muted-foreground">Minor (1)</span>
        </div>
      </div>

      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={chartData} 
            layout="vertical"
            margin={{ top: 5, right: 60, left: 10, bottom: 5 }}
          >
            <PatternDefs />
            <XAxis 
              type="number" 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={false}
            />
            <YAxis 
              type="category" 
              dataKey="skill" 
              width={100}
              tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const item = payload[0]?.payload;
                return (
                  <div className="bg-popover border rounded-lg shadow-lg p-3">
                    <div className="flex items-center gap-2">
                      <GapIcon severity={item?.severity} />
                      <p className="font-medium text-sm">{item?.fullName}</p>
                    </div>
                    <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                      <p>Total gap levels: {item?.gap}</p>
                      <p>Team members affected: {item?.count}</p>
                      <p className="capitalize font-medium text-foreground">Severity: {item?.severity}</p>
                    </div>
                  </div>
                );
              }}
            />
            {/* Base bars */}
            <Bar 
              dataKey="gap" 
              radius={[0, 4, 4, 0]}
              maxBarSize={20}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.severity)} />
              ))}
              <LabelList content={<CustomLabel />} />
            </Bar>
            {/* Pattern overlay bars for accessibility */}
            <Bar 
              dataKey="gap" 
              radius={[0, 4, 4, 0]}
              maxBarSize={20}
              isAnimationActive={false}
            >
              {chartData.map((entry, index) => (
                <Cell key={`pattern-${index}`} fill={getBarPattern(entry.severity)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
