import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import Tree from 'react-d3-tree';
import type { CustomNodeElementProps } from 'react-d3-tree';
import { OrgNode } from '@/lib/orgChartUtils';
import { OrgChartNode } from './OrgChartNode';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mail, MapPin, Building2, Users } from 'lucide-react';

interface OrganizationChartProps {
  data: OrgNode[];
  orientation?: 'vertical' | 'horizontal';
  onNodeClick?: (node: OrgNode) => void;
}

export function OrganizationChart({ 
  data, 
  orientation = 'vertical',
  onNodeClick 
}: OrganizationChartProps) {
  const treeContainerRef = useRef<HTMLDivElement>(null);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(0.58);
  const [selectedNode, setSelectedNode] = useState<OrgNode | null>(null);

  // Center the tree on initial render
  const onContainerResize = useCallback(() => {
    if (treeContainerRef.current) {
      const { width, height } = treeContainerRef.current.getBoundingClientRect();
      setTranslate({
        x: orientation === 'vertical' ? width / 2 : 100,
        y: orientation === 'vertical' ? 80 : height / 2,
      });
    }
  }, [orientation]);

  useEffect(() => {
    onContainerResize();
    window.addEventListener('resize', onContainerResize);
    return () => window.removeEventListener('resize', onContainerResize);
  }, [onContainerResize]);

  // Transform data for react-d3-tree format
  const treeData = useMemo(() => {
    if (data.length === 0) return null;
    
    // If multiple roots, create a virtual root
    if (data.length > 1) {
      return {
        name: 'UNICC',
        attributes: {
          id: 'root',
          title: 'Organization',
          division: '',
          grade: '',
          personnelType: '',
          email: '',
          directReports: data.length,
        },
        children: data,
      };
    }
    
    return data[0];
  }, [data]);

  const handleNodeClick = useCallback((node: OrgNode) => {
    setSelectedNode(node);
    onNodeClick?.(node);
  }, [onNodeClick]);

  const renderCustomNode = useCallback(({ nodeDatum, toggleNode }: CustomNodeElementProps) => {
    return (
      <OrgChartNode
        nodeDatum={nodeDatum as unknown as OrgNode}
        isCollapsed={nodeDatum.__rd3t?.collapsed}
        onToggle={toggleNode}
        onNodeClick={handleNodeClick}
      />
    );
  }, [handleNodeClick]);

  if (!treeData) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No organization data available
      </div>
    );
  }

  return (
    <>
      <div 
        ref={treeContainerRef} 
        className="w-full h-full"
        style={{ minHeight: '500px' }}
      >
        <Tree
          data={treeData}
          orientation={orientation}
          translate={translate}
          zoom={zoom}
          onUpdate={({ zoom: newZoom, translate: newTranslate }) => {
            setZoom(newZoom);
            setTranslate(newTranslate);
          }}
          nodeSize={{ x: 320, y: 180 }}
          separation={{ siblings: 1.1, nonSiblings: 1.35 }}
          renderCustomNodeElement={renderCustomNode}
          collapsible
          pathFunc="step"
          pathClassFunc={() => 'stroke-muted-foreground/40 stroke-2 fill-none'}
          enableLegacyTransitions
          transitionDuration={300}
        />
      </div>

      {/* Node detail dialog */}
      <Dialog open={!!selectedNode} onOpenChange={() => setSelectedNode(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedNode?.name}</DialogTitle>
          </DialogHeader>
          {selectedNode && (
            <div className="overflow-y-auto max-h-[60vh] space-y-4">
              <div className="text-lg font-medium text-muted-foreground">
                {selectedNode.attributes.title}
              </div>
              
              <div className="flex flex-wrap gap-2">
                {selectedNode.attributes.grade && !selectedNode.attributes.isAffiliate && (
                  <Badge variant="outline">{selectedNode.attributes.grade}</Badge>
                )}
                <Badge variant="secondary">{selectedNode.attributes.personnelType}</Badge>
                {selectedNode.attributes.affiliateType && (
                  <Badge variant="outline">{selectedNode.attributes.affiliateType}</Badge>
                )}
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedNode.attributes.division}</span>
                </div>
                
                {selectedNode.attributes.dutyStation && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedNode.attributes.dutyStation}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a 
                    href={`mailto:${selectedNode.attributes.email}`}
                    className="text-primary hover:underline"
                  >
                    {selectedNode.attributes.email}
                  </a>
                </div>
                
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedNode.attributes.directReports} direct reports</span>
                </div>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => window.location.href = `mailto:${selectedNode.attributes.email}`}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Send Email
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
