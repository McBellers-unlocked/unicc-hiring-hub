interface FunnelStage {
  name: string;
  count: number;
  onClick?: () => void;
}

interface HiringFunnelMiniProps {
  stages: FunnelStage[];
}

export default function HiringFunnelMini({ stages }: HiringFunnelMiniProps) {
  const maxCount = Math.max(...stages.map(s => s.count), 1);

  return (
    <div className="space-y-2">
      {stages.map((stage, index) => {
        const widthPercentage = (stage.count / maxCount) * 100;
        
        return (
          <div key={index}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">{stage.name}</span>
              <span className="font-semibold">{stage.count}</span>
            </div>
            <div 
              className="h-8 bg-primary/10 rounded cursor-pointer hover:bg-primary/20 transition-colors flex items-center px-3"
              style={{ width: `${Math.max(widthPercentage, 10)}%` }}
              onClick={stage.onClick}
            >
              <span className="text-xs font-medium text-primary">{stage.count}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
