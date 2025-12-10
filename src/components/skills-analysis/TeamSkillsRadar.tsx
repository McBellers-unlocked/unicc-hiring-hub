import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, Tooltip } from "recharts";

interface SkillAggregate {
  skillName: string;
  category: string;
  avgLevel: number;
  requiredLevel: number;
}

interface Props {
  data: SkillAggregate[];
}

export default function TeamSkillsRadar({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
        <p>No skill data available for radar chart.</p>
      </div>
    );
  }

  const chartData = data.map(d => ({
    skill: d.skillName.length > 15 ? d.skillName.slice(0, 12) + '...' : d.skillName,
    fullName: d.skillName,
    team: Number(d.avgLevel.toFixed(1)),
    required: d.requiredLevel,
  }));

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={chartData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
          <PolarGrid 
            stroke="hsl(var(--border))" 
            strokeDasharray="3 3"
          />
          <PolarAngleAxis 
            dataKey="skill" 
            tick={{ 
              fill: 'hsl(var(--muted-foreground))', 
              fontSize: 10 
            }}
          />
          <PolarRadiusAxis 
            angle={30} 
            domain={[0, 5]} 
            tick={{ 
              fill: 'hsl(var(--muted-foreground))', 
              fontSize: 10 
            }}
          />
          <Radar
            name="Required Level"
            dataKey="required"
            stroke="hsl(var(--muted-foreground))"
            fill="hsl(var(--muted))"
            fillOpacity={0.3}
            strokeWidth={2}
            strokeDasharray="5 5"
          />
          <Radar
            name="Team Average"
            dataKey="team"
            stroke="hsl(var(--primary))"
            fill="hsl(var(--primary))"
            fillOpacity={0.4}
            strokeWidth={2}
          />
          <Tooltip 
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const data = payload[0]?.payload;
              return (
                <div className="bg-popover border rounded-lg shadow-lg p-3">
                  <p className="font-medium text-sm">{data?.fullName}</p>
                  <div className="mt-1 space-y-0.5 text-xs">
                    <p className="text-primary">Team Avg: {data?.team}</p>
                    <p className="text-muted-foreground">Required: {data?.required}</p>
                  </div>
                </div>
              );
            }}
          />
          <Legend 
            wrapperStyle={{ fontSize: '12px' }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
