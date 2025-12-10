import { ResponsiveContainer, PieChart, Pie, Cell, Legend, Tooltip } from "recharts";
import { GapIcon, ACCESSIBLE_COLORS } from "@/lib/accessibilityPatterns";

interface Distribution {
  excelling: number;
  exceeding: number;
  meeting: number;
  minorGap: number;
  criticalGap: number;
}

interface Props {
  data: Distribution;
}

// Accessible color palette
const CHART_COLORS = {
  excelling: ACCESSIBLE_COLORS.excelling.bg,
  exceeding: ACCESSIBLE_COLORS.exceeding.bg,
  meeting: ACCESSIBLE_COLORS.meeting.bg,
  minorGap: ACCESSIBLE_COLORS.minorGap.bg,
  criticalGap: ACCESSIBLE_COLORS.criticalGap.bg,
};

// SVG pattern definitions
const PatternDefs = () => (
  <defs>
    <pattern id="pie-dots" patternUnits="userSpaceOnUse" width="6" height="6">
      <circle cx="3" cy="3" r="1" fill="rgba(255,255,255,0.4)"/>
    </pattern>
    <pattern id="pie-diagonal-light" patternUnits="userSpaceOnUse" width="8" height="8">
      <path d="M-2,2 l4,-4 M0,8 l8,-8 M6,10 l4,-4" stroke="rgba(0,0,0,0.2)" strokeWidth="1.5"/>
    </pattern>
    <pattern id="pie-diagonal-heavy" patternUnits="userSpaceOnUse" width="6" height="6">
      <path d="M-1.5,1.5 l3,-3 M0,6 l6,-6 M4.5,7.5 l3,-3" stroke="rgba(0,0,0,0.3)" strokeWidth="2"/>
    </pattern>
  </defs>
);

export default function SkillDistributionChart({ data }: Props) {
  const total = data.excelling + data.exceeding + data.meeting + data.minorGap + data.criticalGap;
  
  if (total === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
        <p>No distribution data available.</p>
      </div>
    );
  }

  const chartData = [
    { name: 'Excelling (+2)', value: data.excelling, color: CHART_COLORS.excelling, gap: 2, pattern: null },
    { name: 'Exceeding (+1)', value: data.exceeding, color: CHART_COLORS.exceeding, gap: 1, pattern: 'url(#pie-dots)' },
    { name: 'Meeting (0)', value: data.meeting, color: CHART_COLORS.meeting, gap: 0, pattern: null },
    { name: 'Minor Gap (-1)', value: data.minorGap, color: CHART_COLORS.minorGap, gap: -1, pattern: 'url(#pie-diagonal-light)' },
    { name: 'Critical Gap (-2+)', value: data.criticalGap, color: CHART_COLORS.criticalGap, gap: -2, pattern: 'url(#pie-diagonal-heavy)' },
  ].filter(d => d.value > 0);

  const renderLabel = ({ name, percent, cx, cy, midAngle, innerRadius, outerRadius, index }: any) => {
    if (percent < 0.08) return null;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    
    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor="middle" 
        dominantBaseline="central"
        className="text-xs font-bold drop-shadow-md"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  // Custom legend with icons for accessibility
  const CustomLegend = ({ payload }: any) => (
    <div className="flex flex-wrap justify-center gap-3 pt-2" role="list" aria-label="Chart legend">
      {payload?.map((entry: any, index: number) => {
        const item = chartData.find(d => d.name === entry.value);
        return (
          <div 
            key={`legend-${index}`} 
            className="flex items-center gap-1.5 text-xs"
            role="listitem"
          >
            <div 
              className="w-4 h-4 rounded-sm flex items-center justify-center relative overflow-hidden"
              style={{ backgroundColor: entry.color }}
              aria-hidden="true"
            >
              {item?.pattern && (
                <svg className="absolute inset-0 w-full h-full">
                  <PatternDefs />
                  <rect width="100%" height="100%" fill={item.pattern} />
                </svg>
              )}
              <GapIcon gap={item?.gap ?? null} size="sm" className="text-white relative z-10" />
            </div>
            <span className="text-muted-foreground">{entry.value}</span>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <PatternDefs />
          <Pie
            data={chartData}
            cx="50%"
            cy="45%"
            innerRadius={55}
            outerRadius={95}
            paddingAngle={2}
            dataKey="value"
            label={renderLabel}
            labelLine={false}
          >
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.color}
                stroke="hsl(var(--background))"
                strokeWidth={2}
              />
            ))}
          </Pie>
          {/* Pattern overlays for accessibility */}
          <Pie
            data={chartData}
            cx="50%"
            cy="45%"
            innerRadius={55}
            outerRadius={95}
            paddingAngle={2}
            dataKey="value"
            isAnimationActive={false}
          >
            {chartData.map((entry, index) => (
              <Cell 
                key={`pattern-${index}`} 
                fill={entry.pattern || 'transparent'}
                stroke="none"
              />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const item = payload[0];
              const dataItem = chartData.find(d => d.name === item.name);
              const percent = ((item.value as number) / total * 100).toFixed(1);
              return (
                <div className="bg-popover border rounded-lg shadow-lg p-3">
                  <div className="flex items-center gap-2">
                    <GapIcon gap={dataItem?.gap ?? null} size="md" />
                    <p className="font-medium text-sm">{item.name}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {item.value} assessments ({percent}%)
                  </p>
                </div>
              );
            }}
          />
          <Legend content={<CustomLegend />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
