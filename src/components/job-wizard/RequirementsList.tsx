import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, GripVertical } from 'lucide-react';

export interface Requirement {
  id: string;
  title: string;
  description: string;
  weight: number;
  order_index: number;
}

interface RequirementsListProps {
  requirements: Requirement[];
  onChange: (requirements: Requirement[]) => void;
  title: string;
  category: 'Essential Criteria' | 'Desirable Criteria' | 'Essential Education' | 'Desirable Education';
  readOnly?: boolean;
}

export function RequirementsList({ requirements, onChange, title, category, readOnly = false }: RequirementsListProps) {
  const addRequirement = () => {
    const newReq: Requirement = {
      id: `temp-${Date.now()}`,
      title: '',
      description: '',
      weight: 1,
      order_index: requirements.length
    };
    onChange([...requirements, newReq]);
  };

  const updateRequirement = (index: number, field: keyof Requirement, value: string | number) => {
    const updated = [...requirements];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const removeRequirement = (index: number) => {
    const updated = requirements.filter((_, i) => i !== index);
    updated.forEach((req, i) => req.order_index = i);
    onChange(updated);
  };

  const moveRequirement = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === requirements.length - 1)) {
      return;
    }

    const updated = [...requirements];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [updated[index], updated[targetIndex]] = [updated[targetIndex], updated[index]];
    updated.forEach((req, i) => req.order_index = i);
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      {readOnly && (
        <div className="bg-muted/50 border border-border rounded-lg p-3 text-sm text-muted-foreground mb-4">
          <p className="font-medium">📋 Approved at PD Phase</p>
          <p className="text-xs mt-1">These requirements were approved during the Position Description phase and are displayed as reference.</p>
        </div>
      )}
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">{title}</Label>
        {!readOnly && (
          <Button variant="outline" size="sm" onClick={addRequirement}>
            <Plus className="w-4 h-4 mr-2" />
            Add {category.includes('Education') ? 'Education Requirement' : 'Criterion'}
          </Button>
        )}
      </div>

      {requirements.length === 0 ? (
        <div className="border border-dashed rounded-lg p-8 text-center text-muted-foreground">
          <p>No {title.toLowerCase()} added yet. {!readOnly && 'Click "Add" to create one.'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requirements.map((req, index) => (
            <div key={req.id} className="border rounded-lg p-4 bg-card">
              <div className="flex gap-3">
                {!readOnly && (
                  <div className="flex flex-col gap-1 pt-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => moveRequirement(index, 'up')}
                      disabled={index === 0}
                    >
                      ↑
                    </Button>
                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => moveRequirement(index, 'down')}
                      disabled={index === requirements.length - 1}
                    >
                      ↓
                    </Button>
                  </div>
                )}

                <div className="flex-1 space-y-3">
                  <div>
                    <Label className="text-sm">Title *</Label>
                    <Input
                      placeholder={category.includes('Education') ? 'e.g., Bachelor\'s in Computer Science' : 'e.g., 5 years of project management experience'}
                      value={req.title}
                      disabled={readOnly}
                      className={`mt-1 ${readOnly ? 'bg-muted' : ''}`}
                      onChange={(e) => updateRequirement(index, 'title', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Description (optional)</Label>
                    <Textarea
                      placeholder="Add details about this requirement..."
                      value={req.description}
                      onChange={(e) => updateRequirement(index, 'description', e.target.value)}
                      disabled={readOnly}
                      className={`mt-1 ${readOnly ? 'min-h-[150px] bg-muted' : 'min-h-[100px]'}`}
                    />
                  </div>
                </div>

                {!readOnly && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeRequirement(index)}
                    className="mt-2"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
