import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Code, Users, Wrench, Globe } from "lucide-react";

interface EnhancedSkillsSectionProps {
  skills: string[];
}

export default function EnhancedSkillsSection({ skills }: EnhancedSkillsSectionProps) {
  if (!skills || skills.length === 0) return null;

  // Categorize skills (this is a simple heuristic - could be enhanced with AI)
  const technicalKeywords = ['programming', 'development', 'coding', 'software', 'database', 'cloud', 'api', 'framework', 'react', 'node', 'python', 'java', 'sql'];
  const softKeywords = ['communication', 'leadership', 'teamwork', 'management', 'presentation', 'negotiation', 'collaboration'];
  const domainKeywords = ['finance', 'healthcare', 'education', 'marketing', 'sales', 'legal', 'hr'];
  
  const categorizeSkill = (skill: string) => {
    const lowerSkill = skill.toLowerCase();
    if (technicalKeywords.some(kw => lowerSkill.includes(kw))) return 'technical';
    if (softKeywords.some(kw => lowerSkill.includes(kw))) return 'soft';
    if (domainKeywords.some(kw => lowerSkill.includes(kw))) return 'domain';
    return 'other';
  };

  const categorizedSkills = {
    technical: skills.filter(s => categorizeSkill(s) === 'technical'),
    soft: skills.filter(s => categorizeSkill(s) === 'soft'),
    domain: skills.filter(s => categorizeSkill(s) === 'domain'),
    other: skills.filter(s => categorizeSkill(s) === 'other')
  };

  const categories = [
    { key: 'technical', title: 'Technical Skills', icon: Code, color: 'text-primary' },
    { key: 'soft', title: 'Soft Skills', icon: Users, color: 'text-accent' },
    { key: 'domain', title: 'Domain Expertise', icon: Wrench, color: 'text-green-600' },
    { key: 'other', title: 'Other Skills', icon: Globe, color: 'text-orange-600' }
  ] as const;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Skills & Expertise</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {categories.map(category => {
          const categorySkills = categorizedSkills[category.key];
          if (categorySkills.length === 0) return null;
          
          return (
            <div key={category.key}>
              <div className="flex items-center gap-2 mb-3">
                <category.icon className={`h-4 w-4 ${category.color}`} />
                <h4 className="font-semibold text-sm">{category.title}</h4>
                <Badge variant="outline" className="ml-auto text-xs">
                  {categorySkills.length}
                </Badge>
              </div>
              <div className="space-y-2">
                {categorySkills.map((skill, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>{skill}</span>
                      <span className="text-muted-foreground">
                        {/* Simulated proficiency - in real app, this would come from data */}
                        {85 + Math.floor(Math.random() * 15)}%
                      </span>
                    </div>
                    <Progress 
                      value={85 + Math.floor(Math.random() * 15)} 
                      className="h-1.5"
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* If all skills are categorized elsewhere, show them all */}
        {categorizedSkills.technical.length === 0 && 
         categorizedSkills.soft.length === 0 && 
         categorizedSkills.domain.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {skills.map((skill, index) => (
              <Badge key={index} variant="secondary">
                {skill}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
