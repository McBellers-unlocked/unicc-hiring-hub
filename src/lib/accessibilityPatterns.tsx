import { CheckCheck, Check, Circle, ArrowDown, AlertTriangle, Minus } from "lucide-react";
import { cn } from "./utils";

// Colorblind-safe color palette with higher contrast
export const ACCESSIBLE_COLORS = {
  excelling: { 
    bg: '#7c3aed', // Deep violet
    hsl: '262 83% 58%',
    pattern: 'none',
  },
  exceeding: { 
    bg: '#2563eb', // Strong blue
    hsl: '221 83% 53%',
    pattern: 'dots',
  },
  meeting: { 
    bg: '#059669', // Teal-green
    hsl: '161 94% 30%',
    pattern: 'none',
  },
  minorGap: { 
    bg: '#d97706', // Orange (distinguishable from red for colorblind)
    hsl: '32 95% 44%',
    pattern: 'diagonal-light',
  },
  criticalGap: { 
    bg: '#dc2626', // True red
    hsl: '0 72% 51%',
    pattern: 'diagonal-heavy',
  },
  noData: {
    bg: '#6b7280', // Gray
    hsl: '220 9% 46%',
    pattern: 'none',
  }
};

// SVG pattern definitions for charts - to be included in SVG defs
export const ChartPatterns = () => (
  <defs>
    {/* Heavy diagonal stripes for critical gaps */}
    <pattern id="diagonalHeavy" patternUnits="userSpaceOnUse" width="8" height="8">
      <path d="M-2,2 l4,-4 M0,8 l8,-8 M6,10 l4,-4" stroke="rgba(0,0,0,0.4)" strokeWidth="2.5"/>
    </pattern>
    
    {/* Light diagonal stripes for minor gaps */}
    <pattern id="diagonalLight" patternUnits="userSpaceOnUse" width="12" height="12">
      <path d="M-3,3 l6,-6 M0,12 l12,-12 M9,15 l6,-6" stroke="rgba(0,0,0,0.2)" strokeWidth="1.5"/>
    </pattern>
    
    {/* Horizontal lines */}
    <pattern id="horizontalLines" patternUnits="userSpaceOnUse" width="6" height="6">
      <path d="M0,3 l6,0" stroke="rgba(0,0,0,0.2)" strokeWidth="1"/>
    </pattern>
    
    {/* Dots pattern */}
    <pattern id="dots" patternUnits="userSpaceOnUse" width="8" height="8">
      <circle cx="4" cy="4" r="1.5" fill="rgba(255,255,255,0.3)"/>
    </pattern>
    
    {/* Cross hatch for emphasis */}
    <pattern id="crossHatch" patternUnits="userSpaceOnUse" width="8" height="8">
      <path d="M0,0 l8,8 M8,0 l-8,8" stroke="rgba(0,0,0,0.15)" strokeWidth="1"/>
    </pattern>
  </defs>
);

// Gap status icon component - provides visual indicator beyond color
interface GapIconProps {
  gap: number | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: 'h-3 w-3',
  md: 'h-3.5 w-3.5',
  lg: 'h-4 w-4',
};

export const GapIcon = ({ gap, className, size = 'md' }: GapIconProps) => {
  const sizeClass = sizeMap[size];
  
  if (gap === null) {
    return <Minus className={cn(sizeClass, "text-muted-foreground", className)} aria-label="No data" />;
  }
  if (gap >= 2) {
    return <CheckCheck className={cn(sizeClass, className)} aria-label="Excelling" />;
  }
  if (gap === 1) {
    return <Check className={cn(sizeClass, className)} aria-label="Exceeding" />;
  }
  if (gap === 0) {
    // Filled circle for "meeting" - more visible than outline
    return (
      <div 
        className={cn(sizeClass, "rounded-full bg-current", className)} 
        aria-label="Meeting requirements"
      />
    );
  }
  if (gap === -1) {
    return <ArrowDown className={cn(sizeClass, className)} aria-label="Minor gap" />;
  }
  return <AlertTriangle className={cn(sizeClass, className)} aria-label="Critical gap" />;
};

// Get gap label with icon name for screen readers
export const getGapAriaLabel = (gap: number | null): string => {
  if (gap === null) return 'No assessment data';
  if (gap >= 2) return `Excelling, ${gap} levels above required`;
  if (gap === 1) return 'Exceeding, 1 level above required';
  if (gap === 0) return 'Meeting requirements';
  if (gap === -1) return 'Minor gap, 1 level below required';
  return `Critical gap, ${Math.abs(gap)} levels below required`;
};

// Pattern name based on gap
export const getPatternForGap = (gap: number | null): string | null => {
  if (gap === null) return null;
  if (gap >= 0) return null; // No pattern for meeting/exceeding
  if (gap === -1) return 'url(#diagonalLight)';
  return 'url(#diagonalHeavy)';
};

// Accessible legend item component
interface LegendItemProps {
  gap: number | null;
  label: string;
  color: string;
  showPattern?: boolean;
}

export const AccessibleLegendItem = ({ gap, label, color, showPattern = true }: LegendItemProps) => {
  const hasPattern = gap !== null && gap < 0;
  
  return (
    <div className="flex items-center gap-2 text-xs" role="listitem">
      <div 
        className={cn(
          "w-5 h-5 rounded flex items-center justify-center relative overflow-hidden",
          hasPattern && "border border-foreground/20"
        )}
        style={{ backgroundColor: color }}
        aria-hidden="true"
      >
        {showPattern && hasPattern && (
          <svg className="absolute inset-0 w-full h-full" aria-hidden="true">
            <ChartPatterns />
            <rect 
              width="100%" 
              height="100%" 
              fill={gap === -1 ? 'url(#diagonalLight)' : 'url(#diagonalHeavy)'} 
            />
          </svg>
        )}
        <GapIcon gap={gap} size="sm" className="text-white relative z-10" />
      </div>
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
};

// Full accessible legend component
export const AccessibleLegend = ({ className }: { className?: string }) => {
  const items = [
    { gap: 2, label: 'Excelling (+2)', color: ACCESSIBLE_COLORS.excelling.bg },
    { gap: 1, label: 'Exceeding (+1)', color: ACCESSIBLE_COLORS.exceeding.bg },
    { gap: 0, label: 'Meeting (0)', color: ACCESSIBLE_COLORS.meeting.bg },
    { gap: -1, label: 'Minor Gap (-1)', color: ACCESSIBLE_COLORS.minorGap.bg },
    { gap: -2, label: 'Critical Gap (-2+)', color: ACCESSIBLE_COLORS.criticalGap.bg },
  ];

  return (
    <div 
      className={cn("flex flex-wrap gap-x-4 gap-y-2", className)} 
      role="list" 
      aria-label="Skill gap legend"
    >
      {items.map(item => (
        <AccessibleLegendItem 
          key={item.gap} 
          gap={item.gap} 
          label={item.label} 
          color={item.color} 
        />
      ))}
    </div>
  );
};
