import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Cell, Tooltip } from "recharts";

interface SkillGap {
  skillName: string;
  skillId: string;
  gapCount: number;
  totalGap: number;
}

interface Props {
  data: SkillGap[];
}

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
  }));

  const getBarColor = (gap: number) => {
    if (gap >= 4) return '#ef4444'; // rose - critical
    if (gap >= 2) return '#f59e0b'; // amber - moderate
    return '#fcd34d'; // yellow - minor
  };

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart 
          data={chartData} 
          layout="vertical"
          margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
        >
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
                  <p className="font-medium text-sm">{item?.fullName}</p>
                  <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                    <p>Total gap levels: {item?.gap}</p>
                    <p>Team members affected: {item?.count}</p>
                  </div>
                </div>
              );
            }}
          />
          <Bar 
            dataKey="gap" 
            radius={[0, 4, 4, 0]}
            maxBarSize={20}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.gap)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
