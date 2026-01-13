import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ZoomIn, ZoomOut, Maximize2, RotateCcw, Download } from 'lucide-react';

interface OrgChartControlsProps {
  divisions: string[];
  selectedDivision: string;
  onDivisionChange: (division: string) => void;
  personnelTypes: string[];
  selectedTypes: string[];
  onTypesChange: (types: string[]) => void;
  maxDepth: number;
  selectedDepth: number;
  onDepthChange: (depth: number) => void;
  orientation: 'vertical' | 'horizontal';
  onOrientationChange: (orientation: 'vertical' | 'horizontal') => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onExport: () => void;
}

export function OrgChartControls({
  divisions,
  selectedDivision,
  onDivisionChange,
  personnelTypes,
  selectedTypes,
  onTypesChange,
  maxDepth,
  selectedDepth,
  onDepthChange,
  orientation,
  onOrientationChange,
  onZoomIn,
  onZoomOut,
  onReset,
  onExport,
}: OrgChartControlsProps) {
  const handleTypeToggle = (type: string) => {
    if (selectedTypes.includes(type)) {
      onTypesChange(selectedTypes.filter(t => t !== type));
    } else {
      onTypesChange([...selectedTypes, type]);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/50 rounded-lg border">
      {/* Division filter */}
      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium">Division:</Label>
        <Select value={selectedDivision} onValueChange={onDivisionChange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {divisions.map(div => (
              <SelectItem key={div} value={div}>{div}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Personnel type filter */}
      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium">Types:</Label>
        <div className="flex items-center gap-3">
          {personnelTypes.map(type => (
            <label key={type} className="flex items-center gap-1.5 text-sm cursor-pointer">
              <Checkbox
                checked={selectedTypes.includes(type)}
                onCheckedChange={() => handleTypeToggle(type)}
              />
              {type}
            </label>
          ))}
        </div>
      </div>

      {/* Depth selector */}
      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium">Depth:</Label>
        <Select value={selectedDepth.toString()} onValueChange={(v) => onDepthChange(parseInt(v))}>
          <SelectTrigger className="w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: maxDepth }, (_, i) => i + 1).map(d => (
              <SelectItem key={d} value={d.toString()}>{d}</SelectItem>
            ))}
            <SelectItem value="99">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Orientation toggle */}
      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium">Layout:</Label>
        <Button
          variant={orientation === 'vertical' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onOrientationChange('vertical')}
        >
          Vertical
        </Button>
        <Button
          variant={orientation === 'horizontal' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onOrientationChange('horizontal')}
        >
          Horizontal
        </Button>
      </div>

      {/* Zoom controls */}
      <div className="flex items-center gap-1 ml-auto">
        <Button variant="outline" size="icon" onClick={onZoomIn} title="Zoom in">
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={onZoomOut} title="Zoom out">
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={onReset} title="Reset view">
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={onExport} title="Export as PNG">
          <Download className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
