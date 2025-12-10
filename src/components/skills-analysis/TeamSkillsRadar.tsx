import { useState, useMemo } from "react";
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, Tooltip } from "recharts";
import { Circle, Square } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(data.map(d => d.category))];
    return uniqueCategories.sort();
  }, [data]);

  const filteredData = useMemo(() => {
    if (selectedCategory === 'all') return data;
    return data.filter(d => d.category === selectedCategory);
  }, [data, selectedCategory]);

  if (data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
        <p>No skill data available for radar chart.</p>
      </div>
    );
  }

  if (filteredData.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(category => (
                <SelectItem key={category} value={category}>{category}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="h-[300px] flex items-center justify-center text-muted-foreground">
          <p>No skills available for {selectedCategory}.</p>
        </div>
      </div>
    );
  }

  const chartData = filteredData.map(d => ({
    skill: d.skillName.length > 15 ? d.skillName.slice(0, 12) + '...' : d.skillName,
    fullName: d.skillName,
    team: Number(d.avgLevel.toFixed(1)),
    required: d.requiredLevel,
  }));

  // Custom legend with shape indicators for accessibility
  const CustomLegend = () => (
    <div className="flex justify-center gap-6 pt-2" role="list" aria-label="Chart legend">
      <div className="flex items-center gap-2 text-xs" role="listitem">
        <div className="flex items-center gap-1">
          <div className="w-4 h-0.5 bg-primary" aria-hidden="true" />
          <Circle className="h-3 w-3 fill-primary text-primary" aria-hidden="true" />
        </div>
        <span className="text-muted-foreground">Team Average (solid line, circles)</span>
      </div>
      <div className="flex items-center gap-2 text-xs" role="listitem">
        <div className="flex items-center gap-1">
          <div className="w-4 h-0.5 bg-muted-foreground border-dashed border-t-2 border-muted-foreground" aria-hidden="true" />
          <Square className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
        </div>
        <span className="text-muted-foreground">Required Level (dashed line, squares)</span>
      </div>
    </div>
  );

  // Custom dot for team data points
  const TeamDot = (props: any) => {
    const { cx, cy } = props;
    return (
      <circle
        cx={cx}
        cy={cy}
        r={4}
        fill="hsl(var(--primary))"
        stroke="hsl(var(--background))"
        strokeWidth={2}
      />
    );
  };

  // Custom dot for required data points (square shape for differentiation)
  const RequiredDot = (props: any) => {
    const { cx, cy } = props;
    return (
      <rect
        x={cx - 4}
        y={cy - 4}
        width={8}
        height={8}
        fill="hsl(var(--muted-foreground))"
        stroke="hsl(var(--background))"
        strokeWidth={2}
        transform={`rotate(45, ${cx}, ${cy})`}
      />
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent className="bg-popover z-50">
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(category => (
              <SelectItem key={category} value={category}>{category}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="h-[340px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={chartData} margin={{ top: 20, right: 30, bottom: 40, left: 30 }}>
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
          {/* Required level - dashed line with square markers */}
          <Radar
            name="Required Level"
            dataKey="required"
            stroke="hsl(var(--muted-foreground))"
            fill="hsl(var(--muted))"
            fillOpacity={0.2}
            strokeWidth={2}
            strokeDasharray="8 4"
            dot={<RequiredDot />}
          />
          {/* Team average - solid line with circle markers */}
          <Radar
            name="Team Average"
            dataKey="team"
            stroke="hsl(var(--primary))"
            fill="hsl(var(--primary))"
            fillOpacity={0.35}
            strokeWidth={2.5}
            dot={<TeamDot />}
          />
          <Tooltip 
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const data = payload[0]?.payload;
              const gap = data?.team - data?.required;
              const gapColor = gap >= 0 ? 'text-teal-500' : 'text-red-500';
              return (
                <div className="bg-popover border rounded-lg shadow-lg p-3">
                  <p className="font-medium text-sm">{data?.fullName}</p>
                  <div className="mt-2 space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <Circle className="h-3 w-3 fill-primary text-primary" />
                      <span>Team Avg: {data?.team}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Square className="h-3 w-3 text-muted-foreground" />
                      <span>Required: {data?.required}</span>
                    </div>
                    <div className={`font-medium pt-1 border-t border-border/50 ${gapColor}`}>
                      Gap: {gap >= 0 ? '+' : ''}{gap.toFixed(1)}
                    </div>
                  </div>
                </div>
              );
            }}
          />
          <Legend content={<CustomLegend />} />
        </RadarChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
}
