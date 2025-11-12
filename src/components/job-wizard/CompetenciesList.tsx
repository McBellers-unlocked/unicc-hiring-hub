import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, GripVertical } from 'lucide-react';

export interface Competency {
  id: string;
  competency_type: 'Core' | 'Management' | 'Leadership';
  competency_name: string;
  description: string;
  weight: number;
  order_index: number;
}

interface CompetenciesListProps {
  competencies: Competency[];
  onChange: (competencies: Competency[]) => void;
}

const CORE_COMPETENCIES = [
  'Communication',
  'Teamwork and Collaboration',
  'Planning and Organizing',
  'Accountability',
  'Creativity',
  'Client Orientation',
  'Commitment to Continuous Learning',
  'Technological Awareness'
];

const MANAGEMENT_COMPETENCIES = [
  'Leadership',
  'Vision',
  'Empowering Others',
  'Building Trust',
  'Managing Performance',
  'Judgement/Decision Making'
];

const LEADERSHIP_COMPETENCIES = [
  'Strategic Direction',
  'Managing Change',
  'Building Coalitions',
  'Influencing',
  'Results Focus',
  'Innovation'
];

export function CompetenciesList({ competencies, onChange }: CompetenciesListProps) {
  const [activeTab, setActiveTab] = useState<'Core' | 'Management' | 'Leadership'>('Core');

  const addCompetency = (type: 'Core' | 'Management' | 'Leadership', name: string = '') => {
    const newComp: Competency = {
      id: `temp-${Date.now()}`,
      competency_type: type,
      competency_name: name,
      description: '',
      weight: 1,
      order_index: competencies.filter(c => c.competency_type === type).length
    };
    onChange([...competencies, newComp]);
  };

  const updateCompetency = (id: string, field: keyof Competency, value: string | number) => {
    const updated = competencies.map(comp =>
      comp.id === id ? { ...comp, [field]: value } : comp
    );
    onChange(updated);
  };

  const removeCompetency = (id: string) => {
    const updated = competencies.filter(comp => comp.id !== id);
    // Reorder within each type
    const types: Array<'Core' | 'Management' | 'Leadership'> = ['Core', 'Management', 'Leadership'];
    types.forEach(type => {
      const typeComps = updated.filter(c => c.competency_type === type);
      typeComps.forEach((comp, i) => comp.order_index = i);
    });
    onChange(updated);
  };

  const moveCompetency = (id: string, direction: 'up' | 'down') => {
    const comp = competencies.find(c => c.id === id);
    if (!comp) return;

    const typeComps = competencies.filter(c => c.competency_type === comp.competency_type);
    const index = typeComps.findIndex(c => c.id === id);
    
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === typeComps.length - 1)) {
      return;
    }

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [typeComps[index], typeComps[targetIndex]] = [typeComps[targetIndex], typeComps[index]];
    typeComps.forEach((c, i) => c.order_index = i);

    const updated = competencies.map(c => {
      const updated = typeComps.find(tc => tc.id === c.id);
      return updated || c;
    });
    onChange(updated);
  };

  const getCompetenciesByType = (type: 'Core' | 'Management' | 'Leadership') => {
    return competencies
      .filter(c => c.competency_type === type)
      .sort((a, b) => a.order_index - b.order_index);
  };

  const renderCompetencyList = (type: 'Core' | 'Management' | 'Leadership', predefined: string[]) => {
    const typeComps = getCompetenciesByType(type);

    return (
      <div className="space-y-4">
        <div>
          <Label className="text-sm font-medium mb-2 block">Common {type} Competencies</Label>
          <div className="grid grid-cols-2 gap-2">
            {predefined.map(name => {
              const exists = typeComps.some(c => c.competency_name === name);
              return (
                <Button
                  key={name}
                  variant={exists ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => exists ? removeCompetency(typeComps.find(c => c.competency_name === name)!.id) : addCompetency(type, name)}
                  className="justify-start"
                >
                  {exists ? '✓ ' : '+ '}{name}
                </Button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Custom {type} Competencies</Label>
          <Button variant="outline" size="sm" onClick={() => addCompetency(type)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Custom
          </Button>
        </div>

        {typeComps.filter(c => !predefined.includes(c.competency_name)).length === 0 ? (
          <div className="border border-dashed rounded-lg p-4 text-center text-sm text-muted-foreground">
            No custom competencies. Use the buttons above or add a custom one.
          </div>
        ) : (
          <div className="space-y-3">
            {typeComps.map(comp => (
              <div key={comp.id} className="border rounded-lg p-3 bg-card">
                <div className="flex gap-3">
                  <div className="flex flex-col gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => moveCompetency(comp.id, 'up')}
                    >
                      ↑
                    </Button>
                    <GripVertical className="w-3 h-3 text-muted-foreground" />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => moveCompetency(comp.id, 'down')}
                    >
                      ↓
                    </Button>
                  </div>

                  <div className="flex-1 space-y-2">
                    <Input
                      placeholder="Competency name"
                      value={comp.competency_name}
                      onChange={(e) => updateCompetency(comp.id, 'competency_name', e.target.value)}
                      className="font-medium"
                    />
                    <Textarea
                      placeholder="Description (optional)"
                      value={comp.description}
                      onChange={(e) => updateCompetency(comp.id, 'description', e.target.value)}
                      className="min-h-[50px] text-sm"
                    />
                    <div className="flex items-center gap-2">
                      <Label className="text-xs">Weight:</Label>
                      <Input
                        type="number"
                        min="1"
                        max="10"
                        value={comp.weight}
                        onChange={(e) => updateCompetency(comp.id, 'weight', parseInt(e.target.value) || 1)}
                        className="w-16 h-7 text-sm"
                      />
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeCompetency(comp.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <Label className="text-base font-medium">Competencies</Label>
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="Core">
            Core ({getCompetenciesByType('Core').length})
          </TabsTrigger>
          <TabsTrigger value="Management">
            Management ({getCompetenciesByType('Management').length})
          </TabsTrigger>
          <TabsTrigger value="Leadership">
            Leadership ({getCompetenciesByType('Leadership').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="Core" className="space-y-4">
          {renderCompetencyList('Core', CORE_COMPETENCIES)}
        </TabsContent>

        <TabsContent value="Management" className="space-y-4">
          {renderCompetencyList('Management', MANAGEMENT_COMPETENCIES)}
        </TabsContent>

        <TabsContent value="Leadership" className="space-y-4">
          {renderCompetencyList('Leadership', LEADERSHIP_COMPETENCIES)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
