import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2 } from 'lucide-react';

export interface LanguageRequirement {
  id: string;
  language: string;
  level: 'Basic' | 'Working' | 'Expert';
  is_essential: boolean;
  order_index: number;
}

interface LanguageRequirementsListProps {
  languages: LanguageRequirement[];
  onChange: (languages: LanguageRequirement[]) => void;
  readOnly?: boolean;
}

const COMMON_LANGUAGES = [
  'English',
  'French',
  'Spanish',
  'Arabic',
  'Chinese',
  'Russian',
  'German',
  'Portuguese',
  'Italian',
  'Japanese',
  'Other'
];

export function LanguageRequirementsList({ languages, onChange, readOnly = false }: LanguageRequirementsListProps) {
  const addLanguage = () => {
    const newLang: LanguageRequirement = {
      id: `temp-${Date.now()}`,
      language: 'English',
      level: 'Working',
      is_essential: true,
      order_index: languages.length
    };
    onChange([...languages, newLang]);
  };

  const updateLanguage = (index: number, field: keyof LanguageRequirement, value: string | boolean) => {
    const updated = [...languages];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const removeLanguage = (index: number) => {
    const updated = languages.filter((_, i) => i !== index);
    updated.forEach((lang, i) => lang.order_index = i);
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      {readOnly && (
        <div className="bg-muted/50 border border-border rounded-lg p-3 text-sm text-muted-foreground mb-4">
          <p className="font-medium">📋 Approved at PD Phase</p>
          <p className="text-xs mt-1">These language requirements were approved during the Position Description phase and are displayed as reference.</p>
        </div>
      )}
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">Language Requirements</Label>
        {!readOnly && (
          <Button variant="outline" size="sm" onClick={addLanguage}>
            <Plus className="w-4 h-4 mr-2" />
            Add Language
          </Button>
        )}
      </div>

      {readOnly ? (
        languages.length === 0 ? (
          <div className="border border-dashed rounded-lg p-8 text-center text-muted-foreground">
            <p>No language requirements specified.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {[...languages]
              .sort((a, b) => a.order_index - b.order_index)
              .map((lang) => (
                <div key={lang.id} className="border rounded-lg p-4 bg-muted/30">
                  <div className="flex items-center justify-between gap-4">
                    <div className="font-medium text-foreground">
                      {lang.language}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {lang.is_essential 
                        ? (lang.level === 'Expert'
                          ? 'Expert knowledge is required'
                          : lang.level === 'Working'
                          ? 'Working knowledge is required'
                          : 'Basic knowledge is required')
                        : 'Desirable / an advantage'}
                    </div>
                  </div>
                  {lang.is_essential && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Essential requirement
                    </p>
                  )}
                </div>
              ))}
          </div>
        )
      ) : languages.length === 0 ? (
        <div className="border border-dashed rounded-lg p-8 text-center text-muted-foreground">
          <p>No language requirements specified. {!readOnly && 'Click "Add Language" to create one.'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {languages.map((lang, index) => (
            <div key={lang.id} className="border rounded-lg p-4 bg-card">
              <div className="flex gap-3">
                <div className="flex-1 grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-sm">Language</Label>
                    <Select
                      value={lang.language}
                      onValueChange={(value) => updateLanguage(index, 'language', value)}
                      disabled={readOnly}
                    >
                      <SelectTrigger className={`mt-1 ${readOnly ? 'bg-muted' : ''}`}>
                        <SelectValue />
                      </SelectTrigger>
                      {!readOnly && (
                        <SelectContent>
                          {COMMON_LANGUAGES.map(language => (
                            <SelectItem key={language} value={language}>
                              {language}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      )}
                    </Select>
                    {lang.language === 'Other' && !readOnly && (
                      <Input
                        placeholder="Specify language"
                        className="mt-2"
                        onChange={(e) => updateLanguage(index, 'language', e.target.value)}
                      />
                    )}
                  </div>

                  <div>
                    <Label className="text-sm">Proficiency Level</Label>
                    <Select
                      value={lang.level}
                      onValueChange={(value: 'Basic' | 'Working' | 'Expert') => updateLanguage(index, 'level', value)}
                      disabled={readOnly}
                    >
                      <SelectTrigger className={`mt-1 ${readOnly ? 'bg-muted' : ''}`}>
                        <SelectValue />
                      </SelectTrigger>
                      {!readOnly && (
                        <SelectContent>
                          <SelectItem value="Basic">Basic</SelectItem>
                          <SelectItem value="Working">Working</SelectItem>
                          <SelectItem value="Expert">Expert</SelectItem>
                        </SelectContent>
                      )}
                    </Select>
                  </div>

                  <div className="flex items-end">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`essential-${lang.id}`}
                        checked={lang.is_essential}
                        onCheckedChange={(checked) => updateLanguage(index, 'is_essential', checked === true)}
                        disabled={readOnly}
                      />
                      <Label htmlFor={`essential-${lang.id}`} className="text-sm font-normal cursor-pointer">
                        Essential
                      </Label>
                    </div>
                  </div>
                </div>

                {!readOnly && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeLanguage(index)}
                    className="mt-6"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        {readOnly 
          ? 'Language proficiency requirements approved at PD phase.'
          : 'Specify the language proficiency requirements for this position. Essential requirements will be used in candidate screening.'
        }
      </p>
    </div>
  );
}
