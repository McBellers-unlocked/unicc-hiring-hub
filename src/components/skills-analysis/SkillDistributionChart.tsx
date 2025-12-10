import { ResponsiveContainer, PieChart, Pie, Cell, Legend, Tooltip } from "recharts";

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

const COLORS = {
  excelling: '#8b5cf6', // violet
  exceeding: '#3b82f6', // blue
  meeting: '#10b981', // emerald
  minorGap: '#f59e0b', // amber
  criticalGap: '#ef4444', // rose
};

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
    { name: 'Excelling (+2)', value: data.excelling, color: COLORS.excelling },
    { name: 'Exceeding (+1)', value: data.exceeding, color: COLORS.exceeding },
    { name: 'Meeting (0)', value: data.meeting, color: COLORS.meeting },
    { name: 'Minor Gap (-1)', value: data.minorGap, color: COLORS.minorGap },
    { name: 'Critical Gap (-2+)', value: data.criticalGap, color: COLORS.criticalGap },
  ].filter(d => d.value > 0);

  const renderLabel = ({ name, percent }: { name: string; percent: number }) => {
    if (percent < 0.05) return null;
    return `${(percent * 100).toFixed(0)}%`;
  };

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
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
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const item = payload[0];
              const percent = ((item.value as number) / total * 100).toFixed(1);
              return (
                <div className="bg-popover border rounded-lg shadow-lg p-3">
                  <p className="font-medium text-sm">{item.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {item.value} assessments ({percent}%)
                  </p>
                </div>
              );
            }}
          />
          <Legend 
            layout="horizontal"
            align="center"
            verticalAlign="bottom"
            wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
