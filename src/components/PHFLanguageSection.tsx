import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Languages, Plus, X } from "lucide-react";
import { useState } from "react";

interface LanguageData {
  un_languages?: Record<string, string>;
  other_languages?: Array<{ language?: string; proficiency?: string }>;
}

interface PHFLanguageSectionProps {
  languages: LanguageData;
  onChange: (languages: LanguageData) => void;
}

const UN_LANGUAGES = [
  { code: 'english', name: 'English' },
  { code: 'french', name: 'French' },
  { code: 'spanish', name: 'Spanish' },
  { code: 'arabic', name: 'Arabic' },
  { code: 'chinese', name: 'Chinese' },
  { code: 'russian', name: 'Russian' },
];

const PROFICIENCY_LEVELS = [
  { value: 'native', label: 'Native/Bilingual' },
  { value: 'professional', label: 'Professional Working' },
  { value: 'limited', label: 'Limited Working' },
  { value: 'elementary', label: 'Elementary' },
];

export default function PHFLanguageSection({ languages, onChange }: PHFLanguageSectionProps) {
  const [newLanguage, setNewLanguage] = useState({ language: "", proficiency: "" });

  const updateUNLanguage = (langCode: string, proficiency: string) => {
    const updated = { 
      ...languages,
      un_languages: languages?.un_languages || {},
      other_languages: languages?.other_languages || []
    };
    if (proficiency === "" || proficiency === "not_applicable") {
      delete updated.un_languages[langCode];
    } else {
      updated.un_languages[langCode] = proficiency;
    }
    onChange(updated);
  };

  const addOtherLanguage = () => {
    if (newLanguage.language && newLanguage.proficiency) {
      const updated = { 
        ...languages,
        un_languages: languages?.un_languages || {},
        other_languages: [...(languages?.other_languages || []), { 
          language: newLanguage.language, 
          proficiency: newLanguage.proficiency 
        }]
      };
      onChange(updated);
      setNewLanguage({ language: "", proficiency: "" });
    }
  };

  const removeOtherLanguage = (index: number) => {
    const updated = {
      ...languages,
      un_languages: languages?.un_languages || {},
      other_languages: (languages?.other_languages || []).filter((_, i) => i !== index)
    };
    onChange(updated);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Languages className="h-5 w-5" />
          Language Proficiency
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* UN Official Languages */}
        <div>
          <h4 className="font-medium mb-4">UN Official Languages</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {UN_LANGUAGES.map((lang) => (
              <div key={lang.code} className="space-y-2">
                <Label>{lang.name}</Label>
                <Select
                  value={languages?.un_languages?.[lang.code] || "not_applicable"}
                  onValueChange={(value) => updateUNLanguage(lang.code, value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select proficiency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_applicable">Not applicable</SelectItem>
                    {PROFICIENCY_LEVELS.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </div>

        {/* Other Languages */}
        <div>
          <h4 className="font-medium mb-4">Additional Languages</h4>
          
          {/* Current Other Languages */}
          <div className="space-y-2 mb-4">
            {(languages?.other_languages || []).map((lang, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <span className="font-medium">{lang.language}</span>
                  <Badge variant="secondary" className="ml-2">
                    {PROFICIENCY_LEVELS.find(p => p.value === lang.proficiency)?.label}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeOtherLanguage(index)}
                  className="text-destructive hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* Add New Language */}
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Language</Label>
                <Input
                  value={newLanguage.language}
                  onChange={(e) => setNewLanguage({ ...newLanguage, language: e.target.value })}
                  placeholder="German, Japanese, etc."
                />
              </div>
              <div>
                <Label>Proficiency Level</Label>
                <Select
                  value={newLanguage.proficiency}
                  onValueChange={(value) => setNewLanguage({ ...newLanguage, proficiency: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select proficiency" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROFICIENCY_LEVELS.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={addOtherLanguage} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Language
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
