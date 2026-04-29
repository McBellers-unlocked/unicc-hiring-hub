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
  const isStack = !!nodeDatum.attributes.isStack;
  const stackMembers = nodeDatum.attributes.stackMembers ?? [];
  const hasChildren = !isStack && nodeDatum.attributes.directReports > 0;
  const initials = nodeDatum.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  if (isStack) {
    const stackHeight = Math.max(96, stackMembers.length * 46 + 16);

    return (
      <g>
        <foreignObject x={-140} y={-stackHeight / 2} width={280} height={stackHeight}>
          <div className="w-full h-full rounded-lg border-2 border-border bg-card shadow-md p-2 overflow-hidden">
            <div className="flex h-full flex-col gap-1.5 overflow-y-auto pr-1">
              {stackMembers.map((member) => {
                const memberColors = getPersonnelTypeColor(member.attributes.personnelType);
                const memberInitials = member.name
                  .split(' ')
                  .map((part) => part[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2);

                return (
                  <button
                    key={member.attributes.id}
                    type="button"
                    onClick={() => onNodeClick?.(member)}
                    className={`w-full rounded-md border ${memberColors.border} ${memberColors.bg} px-2 py-1.5 text-left transition-colors hover:bg-accent`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar className="h-7 w-7 shrink-0">
                        <AvatarFallback className={`text-[10px] font-semibold ${memberColors.text} bg-background`}>
                          {memberInitials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-semibold leading-tight text-foreground">
                          {member.name}
                        </div>
                        <div className="truncate text-[10px] leading-snug text-muted-foreground">
                          {member.attributes.title}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </foreignObject>
      </g>
    );
  }

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
