import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Eye, Target, Award } from "lucide-react";

interface ProfileStatsCardsProps {
  profileCompletionPercentage: number;
  yearsOfExperience: number;
  skillsCount: number;
  certificationsCount: number;
}

export default function ProfileStatsCards({ 
  profileCompletionPercentage,
  yearsOfExperience,
  skillsCount,
  certificationsCount
}: ProfileStatsCardsProps) {
  const stats = [
    {
      title: "Profile Strength",
      value: `${profileCompletionPercentage}%`,
      icon: TrendingUp,
      description: "Complete for better matches",
      color: "text-primary",
      bgColor: "bg-primary/10"
    },
    {
      title: "Experience",
      value: `${yearsOfExperience}+`,
      icon: Award,
      description: "Years of experience",
      color: "text-accent",
      bgColor: "bg-accent/10"
    },
    {
      title: "Skills",
      value: skillsCount,
      icon: Target,
      description: "Professional skills",
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-950"
    },
    {
      title: "Certifications",
      value: certificationsCount,
      icon: Eye,
      description: "Validated credentials",
      color: "text-orange-600",
      bgColor: "bg-orange-50 dark:bg-orange-950"
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <Card key={index} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm font-medium text-muted-foreground truncate">
                  {stat.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
