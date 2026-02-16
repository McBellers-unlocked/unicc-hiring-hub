import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Code, Users, Wrench, Globe, Globe2 } from "lucide-react";

interface SkillAssessment {
  selfAssessment: number | null;
  managerAssessment: number | null;
  requiredLevel: number | null;
  status: string;
}

interface EnhancedSkillsSectionProps {
  skills: string[];
  skillAssessments?: Map<string, SkillAssessment>;
  openSourceSkills?: Set<string>;
}

function getGapBasedStyle(assessment?: SkillAssessment | null) {
  if (!assessment || assessment.status !== 'approved') {
    return { bgColor: "bg-muted", textColor: "text-muted-foreground", label: "Not assessed" };
  }
  
  const level = assessment.managerAssessment ?? assessment.selfAssessment;
  const required = assessment.requiredLevel;
  if (level === null || required === null) {
    return { bgColor: "bg-muted", textColor: "text-muted-foreground", label: "Not assessed" };
  }
  
  const gap = level - required;
  
  if (gap >= 2) return { bgColor: "bg-purple-100", textColor: "text-purple-700", label: `Excellence (+${gap})` };
  if (gap === 1) return { bgColor: "bg-blue-100", textColor: "text-blue-700", label: "Exceeding (+1)" };
  if (gap === 0) return { bgColor: "bg-emerald-100", textColor: "text-emerald-700", label: "Meeting requirement" };
  if (gap === -1) return { bgColor: "bg-amber-100", textColor: "text-amber-700", label: "Minor gap (-1)" };
  return { bgColor: "bg-red-100", textColor: "text-red-700", label: `Gap (${gap})` };
}

export default function EnhancedSkillsSection({ skills, skillAssessments, openSourceSkills }: EnhancedSkillsSectionProps) {
  if (!skills || skills.length === 0) return null;

  // Categorize skills (this is a simple heuristic - could be enhanced with AI)
  const technicalKeywords = ['programming', 'development', 'coding', 'software', 'database', 'cloud', 'api', 'framework', 'react', 'node', 'python', 'java', 'sql', 'aws', 'azure', 'docker', 'kubernetes'];
  const softKeywords = ['communication', 'leadership', 'teamwork', 'management', 'presentation', 'negotiation', 'collaboration', 'problem-solving', 'critical thinking'];
  const domainKeywords = ['finance', 'healthcare', 'education', 'marketing', 'sales', 'legal', 'hr', 'project', 'agile', 'scrum'];
  
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

  const renderSkillBadge = (skill: string, idx: number) => {
    const assessment = skillAssessments?.get(skill.toLowerCase());
    const style = getGapBasedStyle(assessment);
    const level = assessment?.managerAssessment ?? assessment?.selfAssessment;
    const required = assessment?.requiredLevel;

    return (
      <TooltipProvider key={idx}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant="secondary" 
              className={`${style.bgColor} ${style.textColor} border-0 cursor-default`}
            >
              {skill}
              {openSourceSkills?.has(skill.toLowerCase()) && (
                <Globe2 className="h-3 w-3 ml-1 inline-block text-emerald-600" />
              )}
              {level !== null && level !== undefined && required !== null && required !== undefined && (
                <span className="ml-1.5 opacity-75">({level}/{required})</span>
              )}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-medium">{style.label}</p>
            {level !== null && level !== undefined && required !== null && required !== undefined && (
              <p className="text-xs text-muted-foreground">
                Level: {level} / Required: {required}
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

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
              <div className="flex flex-wrap gap-2">
                {categorySkills.map((skill, idx) => renderSkillBadge(skill, idx))}
              </div>
            </div>
          );
        })}

        {/* If all skills are categorized elsewhere, show them all */}
        {categorizedSkills.technical.length === 0 && 
         categorizedSkills.soft.length === 0 && 
         categorizedSkills.domain.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {skills.map((skill, index) => renderSkillBadge(skill, index))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
