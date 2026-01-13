import { memo } from 'react';
import { OrgNode, getPersonnelTypeColor } from '@/lib/orgChartUtils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';

interface OrgChartNodeProps {
  nodeDatum: OrgNode;
  onNodeClick?: (node: OrgNode) => void;
}

export const OrgChartNode = memo(({ nodeDatum, onNodeClick }: OrgChartNodeProps) => {
  const typeColors = getPersonnelTypeColor(nodeDatum.attributes.personnelType);
  const initials = nodeDatum.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <g onClick={() => onNodeClick?.(nodeDatum)} style={{ cursor: 'pointer' }}>
      {/* Card background */}
      <foreignObject x={-100} y={-50} width={200} height={100}>
        <div
          className={`
            w-full h-full rounded-lg border-2 shadow-md
            ${typeColors.bg} ${typeColors.border}
            transition-all duration-200 hover:shadow-lg hover:scale-105
            flex flex-col items-center justify-center p-2
          `}
        >
          {/* Avatar */}
          <Avatar className="h-8 w-8 mb-1">
            <AvatarFallback className={`text-xs font-semibold ${typeColors.text} bg-white`}>
              {initials}
            </AvatarFallback>
          </Avatar>
          
          {/* Name */}
          <div className="text-xs font-semibold text-foreground text-center truncate w-full px-1">
            {nodeDatum.name}
          </div>
          
          {/* Title */}
          <div className="text-[10px] text-muted-foreground text-center truncate w-full px-1">
            {nodeDatum.attributes.title}
          </div>
          
          {/* Badges row */}
          <div className="flex items-center gap-1 mt-1">
            {nodeDatum.attributes.grade && (
              <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                {nodeDatum.attributes.grade}
              </Badge>
            )}
            <Badge 
              variant="secondary" 
              className={`text-[9px] px-1 py-0 h-4 ${typeColors.text}`}
            >
              {nodeDatum.attributes.personnelType}
            </Badge>
          </div>
          
          {/* Direct reports indicator */}
          {nodeDatum.attributes.directReports > 0 && (
            <div className="flex items-center gap-0.5 text-[9px] text-muted-foreground mt-0.5">
              <Users className="h-2.5 w-2.5" />
              {nodeDatum.attributes.directReports}
            </div>
          )}
        </div>
      </foreignObject>
    </g>
  );
});

OrgChartNode.displayName = 'OrgChartNode';
