import { cn } from "@/lib/utils";

interface BatteryLevelSelectorProps {
  value: number | null;
  onChange: (level: number) => void;
  disabled?: boolean;
}

const levelLabels = ["Awareness", "Application", "Integration", "Optimization", "Innovation"];

export default function BatteryLevelSelector({
  value,
  onChange,
  disabled = false,
}: BatteryLevelSelectorProps) {
  return (
    <div className="flex flex-col items-center gap-3 py-4">
      {/* Battery container */}
      <div className="relative flex gap-1">
        {[1, 2, 3, 4, 5].map((level) => (
          <button
            key={level}
            type="button"
            disabled={disabled}
            onClick={() => onChange(level)}
            className={cn(
              "relative rounded-sm border border-border/50 transition-all duration-150 w-12 h-10",
              level <= (value ?? 0) ? "bg-primary" : "bg-muted/30",
              !disabled && "cursor-pointer hover:ring-2 hover:ring-primary/50 hover:scale-105",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            {/* Level number inside segment */}
            <span className={cn(
              "absolute inset-0 flex items-center justify-center text-sm font-medium",
              level <= (value ?? 0) ? "text-primary-foreground" : "text-muted-foreground"
            )}>
              {level}
            </span>
            
            {/* Selected indicator arrow */}
            {value === level && (
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2">
                <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-b-[6px] border-l-transparent border-r-transparent border-b-primary" />
              </div>
            )}
          </button>
        ))}
        
        {/* Battery cap */}
        <div className="rounded-r-sm bg-border/50 w-2 h-4 mt-3" />
      </div>

      {/* Level labels */}
      <div className="flex gap-1 mt-2">
        {levelLabels.map((label, index) => (
          <div
            key={label}
            className={cn(
              "w-12 text-center text-[10px] leading-tight",
              value === index + 1 ? "text-primary font-medium" : "text-muted-foreground"
            )}
          >
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
