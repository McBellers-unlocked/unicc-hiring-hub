import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Languages, Star } from "lucide-react";

interface LanguageData {
  un_languages?: Record<string, string>;
  other_languages?: Array<{ language: string; proficiency: string }>;
}

interface EnhancedLanguagesSectionProps {
  languages: LanguageData | string;
}

export default function EnhancedLanguagesSection({ languages }: EnhancedLanguagesSectionProps) {
  // Parse languages if it's a string
  let parsedLanguages: LanguageData = {};
  
  if (typeof languages === 'string') {
    try {
      parsedLanguages = JSON.parse(languages);
    } catch (e) {
      console.error('Failed to parse languages:', e);
      parsedLanguages = {};
    }
  } else if (languages) {
    parsedLanguages = languages;
  }

  const unLanguages = parsedLanguages.un_languages || {};
  const otherLanguages = parsedLanguages.other_languages || [];

  const hasLanguages = Object.keys(unLanguages).length > 0 || otherLanguages.length > 0;

  if (!hasLanguages) return null;

  const proficiencyLevels = {
    native: { label: 'Native/Bilingual', value: 100, variant: 'default' as const },
    professional: { label: 'Professional', value: 80, variant: 'secondary' as const },
    limited: { label: 'Limited Working', value: 60, variant: 'outline' as const },
    elementary: { label: 'Elementary', value: 40, variant: 'outline' as const }
  };

  const unLanguageNames = {
    english: 'English',
    french: 'French',
    spanish: 'Spanish',
    arabic: 'Arabic',
    chinese: 'Chinese',
    russian: 'Russian'
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Languages className="h-5 w-5" />
          Languages
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* UN Official Languages */}
        {Object.keys(unLanguages).length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Star className="h-4 w-4 text-primary" />
              <h4 className="font-semibold text-sm">UN Official Languages</h4>
            </div>
            <div className="space-y-3">
              {Object.entries(unLanguages).map(([code, proficiency]) => {
                const languageName = unLanguageNames[code as keyof typeof unLanguageNames] || code;
                const profLevel = proficiencyLevels[proficiency as keyof typeof proficiencyLevels];
                
                return (
                  <div key={code} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{languageName}</span>
                      <Badge variant={profLevel?.variant || 'outline'}>
                        {profLevel?.label || proficiency}
                      </Badge>
                    </div>
                    <Progress value={profLevel?.value || 50} className="h-1.5" />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Other Languages */}
        {otherLanguages.length > 0 && (
          <div>
            <h4 className="font-semibold text-sm mb-3">Additional Languages</h4>
            <div className="space-y-3">
              {otherLanguages.map((lang, index) => {
                const profLevel = proficiencyLevels[lang.proficiency as keyof typeof proficiencyLevels];
                
                return (
                  <div key={index} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{lang.language}</span>
                      <Badge variant={profLevel?.variant || 'outline'}>
                        {profLevel?.label || lang.proficiency}
                      </Badge>
                    </div>
                    <Progress value={profLevel?.value || 50} className="h-1.5" />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
