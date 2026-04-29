import { memo } from 'react';
import { OrgNode, getPersonnelTypeColor } from '@/lib/orgChartUtils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, Users } from 'lucide-react';

interface OrgChartNodeProps {
  nodeDatum: OrgNode;
  isCollapsed?: boolean;
  onToggle?: () => void;
  onNodeClick?: (node: OrgNode) => void;
}

export const OrgChartNode = memo(({ nodeDatum, isCollapsed, onToggle, onNodeClick }: OrgChartNodeProps) => {
  const typeColors = getPersonnelTypeColor(nodeDatum.attributes.personnelType);
  const hasChildren = nodeDatum.attributes.directReports > 0;
  const initials = nodeDatum.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <g style={{ cursor: 'pointer' }}>
      {/* Card background */}
      <foreignObject x={-140} y={-64} width={280} height={128}>
        <div
          onClick={() => onNodeClick?.(nodeDatum)}
          className={`
            w-full h-full rounded-lg border-2 shadow-md
            ${typeColors.bg} ${typeColors.border}
            transition-all duration-200 hover:shadow-lg
            flex flex-col p-3 bg-card
          `}
        >
          <div className="flex items-start gap-2.5 min-w-0">
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarFallback className={`text-xs font-semibold ${typeColors.text} bg-background`}>
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold leading-tight text-foreground break-words line-clamp-2">
                {nodeDatum.name}
              </div>
              <div className="mt-1 text-[11px] leading-snug text-muted-foreground break-words line-clamp-2">
                {nodeDatum.attributes.title}
              </div>
            </div>
          </div>
          
          {/* Badges row */}
          <div className="flex items-center justify-between gap-2 mt-auto pt-2">
            <div className="flex items-center gap-1 min-w-0">
            {nodeDatum.attributes.grade && !nodeDatum.attributes.isAffiliate && (
              <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                {nodeDatum.attributes.grade}
              </Badge>
            )}
            <Badge 
              variant="secondary" 
              className={`text-[10px] px-1.5 py-0 h-5 max-w-24 truncate ${typeColors.text}`}
            >
              {nodeDatum.attributes.personnelType}
            </Badge>
            </div>
            {hasChildren && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onToggle?.();
                }}
                className="flex shrink-0 items-center gap-1 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground"
                aria-label={isCollapsed ? 'Expand direct reports' : 'Collapse direct reports'}
              >
                {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                <Users className="h-3 w-3" />
                {nodeDatum.attributes.directReports}
              </button>
            )}
          </div>
        </div>
      </foreignObject>
    </g>
  );
});

OrgChartNode.displayName = 'OrgChartNode';
