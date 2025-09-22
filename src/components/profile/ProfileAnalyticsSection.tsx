import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Target, TrendingUp, Eye, Search, Users, Lightbulb } from "lucide-react";

interface ProfileAnalytics {
  profileViews: number;
  searchAppearances: number;
  profileStrength: number;
  jobMatches: number;
  lastUpdated: string;
}

interface ProfileInsight {
  type: 'improvement' | 'achievement' | 'trend';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  actionable?: boolean;
}

interface ProfileAnalyticsSectionProps {
  profileId: string;
  completionPercentage: number;
}

export default function ProfileAnalyticsSection({ profileId, completionPercentage }: ProfileAnalyticsSectionProps) {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<ProfileAnalytics>({
    profileViews: 0,
    searchAppearances: 0,
    profileStrength: completionPercentage,
    jobMatches: 0,
    lastUpdated: new Date().toISOString(),
  });
  const [insights, setInsights] = useState<ProfileInsight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    generateInsights();
    // Simulate analytics data - in a real app, this would come from the backend
    setTimeout(() => {
      setAnalytics({
        profileViews: Math.floor(Math.random() * 50) + 10,
        searchAppearances: Math.floor(Math.random() * 100) + 20,
        profileStrength: completionPercentage,
        jobMatches: Math.floor(Math.random() * 15) + 5,
        lastUpdated: new Date().toISOString(),
      });
      setLoading(false);
    }, 1000);
  }, [completionPercentage]);

  const generateInsights = () => {
    const newInsights: ProfileInsight[] = [];

    // Profile completion insights
    if (completionPercentage < 60) {
      newInsights.push({
        type: 'improvement',
        title: 'Complete Your Profile',
        description: 'Profiles with 60%+ completion get 3x more views. Add work experience and skills to boost visibility.',
        priority: 'high',
        actionable: true,
      });
    } else if (completionPercentage < 80) {
      newInsights.push({
        type: 'improvement',
        title: 'Almost There!',
        description: 'You\'re doing great! Add a professional photo and portfolio documents to reach 80% completion.',
        priority: 'medium',
        actionable: true,
      });
    } else {
      newInsights.push({
        type: 'achievement',
        title: 'Profile Looking Great!',
        description: 'Your profile is comprehensive and professional. You\'re likely to appear in more search results.',
        priority: 'low',
        actionable: false,
      });
    }

    // Professional summary insight
    newInsights.push({
      type: 'improvement',
      title: 'Optimize Your Summary',
      description: 'Include keywords related to your target roles to improve job matching and search visibility.',
      priority: 'medium',
      actionable: true,
    });

    // Skills insight
    newInsights.push({
      type: 'improvement',
      title: 'Highlight Technical Skills',
      description: 'UN organizations often search for specific technical competencies. Consider adding relevant certifications.',
      priority: 'medium',
      actionable: true,
    });

    // UN experience insight
    newInsights.push({
      type: 'trend',
      title: 'UN Experience Valued',
      description: 'Candidates with UN system experience receive 40% more profile views. Highlight your UN connections.',
      priority: 'high',
      actionable: true,
    });

    setInsights(newInsights);
  };

  const getStrengthColor = (strength: number) => {
    if (strength >= 80) return 'text-green-600';
    if (strength >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStrengthLabel = (strength: number) => {
    if (strength >= 80) return 'Excellent';
    if (strength >= 60) return 'Good';
    if (strength >= 40) return 'Fair';
    return 'Needs Work';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'improvement': return Lightbulb;
      case 'achievement': return Target;
      case 'trend': return TrendingUp;
      default: return Lightbulb;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Profile Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-20 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Analytics Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Profile Analytics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <Eye className="h-6 w-6 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">{analytics.profileViews}</div>
              <div className="text-xs text-muted-foreground">Profile Views</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <Search className="h-6 w-6 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">{analytics.searchAppearances}</div>
              <div className="text-xs text-muted-foreground">Search Results</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <Target className="h-6 w-6 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">{analytics.jobMatches}</div>
              <div className="text-xs text-muted-foreground">Job Matches</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <Users className="h-6 w-6 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">95%</div>
              <div className="text-xs text-muted-foreground">Percentile</div>
            </div>
          </div>

          {/* Profile Strength */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">Profile Strength</span>
              <div className="text-right">
                <span className={`font-bold ${getStrengthColor(analytics.profileStrength)}`}>
                  {getStrengthLabel(analytics.profileStrength)}
                </span>
                <span className="text-sm text-muted-foreground ml-2">
                  {analytics.profileStrength}%
                </span>
              </div>
            </div>
            <Progress value={analytics.profileStrength} className="h-2" />
            <p className="text-xs text-muted-foreground">
              Based on profile completeness, keyword optimization, and recent activity
            </p>
          </div>

          {/* Last Updated */}
          <div className="text-xs text-muted-foreground">
            Last updated: {new Date(analytics.lastUpdated).toLocaleDateString()}
          </div>
        </CardContent>
      </Card>

      {/* Insights & Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Profile Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {insights.map((insight, index) => {
            const IconComponent = getInsightIcon(insight.type);
            return (
              <div key={index} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <IconComponent className="h-5 w-5 mt-0.5 text-primary" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{insight.title}</h4>
                        <Badge variant={getPriorityColor(insight.priority)} className="text-xs">
                          {insight.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {insight.description}
                      </p>
                    </div>
                  </div>
                  {insight.actionable && (
                    <Button size="sm" variant="outline">
                      Take Action
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}