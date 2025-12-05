import { cn } from "@/lib/utils";

interface SkillLevelSelectorProps {
  value: number | null;
  onChange: (level: number) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const levelLabels = [
  { level: 1, label: "Awareness", description: "Basic understanding" },
  { level: 2, label: "Application", description: "Can apply with guidance" },
  { level: 3, label: "Integration", description: "Works independently" },
  { level: 4, label: "Optimization", description: "Can optimize & mentor" },
  { level: 5, label: "Innovation", description: "Expert, drives innovation" },
];

export default function SkillLevelSelector({ 
  value, 
  onChange, 
  disabled = false,
  size = 'md' 
}: SkillLevelSelectorProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        {levelLabels.map(({ level, label }) => {
          const isSelected = value === level;
          const fillPercentage = (level / 5) * 100;
          
          return (
            <button
              key={level}
              type="button"
              disabled={disabled}
              onClick={() => onChange(level)}
              className={cn(
                "relative rounded-full border-2 transition-all duration-200 flex items-center justify-center",
                sizeClasses[size],
                isSelected 
                  ? "border-primary ring-2 ring-primary/30" 
                  : "border-muted-foreground/30 hover:border-primary/50",
                disabled && "opacity-50 cursor-not-allowed"
              )}
              title={label}
            >
              {/* Pie fill */}
              <svg 
                viewBox="0 0 32 32" 
                className={cn("absolute inset-0", sizeClasses[size])}
              >
                <circle
                  cx="16"
                  cy="16"
                  r="14"
                  fill="transparent"
                  stroke={isSelected ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"}
                  strokeWidth="28"
                  strokeDasharray={`${fillPercentage * 0.88} 100`}
                  strokeDashoffset="25"
                  opacity={isSelected ? 1 : 0.3}
                />
              </svg>
              <span className={cn(
                "relative z-10 font-semibold",
                textSizeClasses[size],
                isSelected ? "text-primary" : "text-muted-foreground"
              )}>
                {level}
              </span>
            </button>
          );
        })}
      </div>
      
      {/* Labels below */}
      <div className="flex items-start gap-2">
        {levelLabels.map(({ level, label, description }) => (
          <div 
            key={level} 
            className={cn(
              "flex flex-col items-center text-center",
              sizeClasses[size].replace('w-', 'min-w-'),
              value === level ? "text-primary" : "text-muted-foreground"
            )}
          >
            <span className={cn("font-medium", textSizeClasses[size])}>{label}</span>
            {size !== 'sm' && (
              <span className="text-xs opacity-70 hidden md:block">{description}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkillLevelDisplay({ level, size = 'sm' }: { level: number | null; size?: 'sm' | 'md' }) {
  if (!level) return <span className="text-muted-foreground">-</span>;
  
  const fillPercentage = (level / 5) * 100;
  const sizeClasses = size === 'sm' ? 'w-6 h-6' : 'w-8 h-8';
  
  return (
    <div className={cn("relative rounded-full border border-primary/30", sizeClasses)}>
      <svg viewBox="0 0 32 32" className={cn("absolute inset-0", sizeClasses)}>
        <circle
          cx="16"
          cy="16"
          r="14"
          fill="transparent"
          stroke="hsl(var(--primary))"
          strokeWidth="28"
          strokeDasharray={`${fillPercentage * 0.88} 100`}
          strokeDashoffset="25"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-primary">
        {level}
      </span>
    </div>
  );
}
