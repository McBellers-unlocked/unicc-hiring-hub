import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { JobMatchingService } from "@/lib/jobMatching";
import { Briefcase, Target, TrendingUp, ExternalLink, CheckCircle, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface JobMatch {
  jobId: string;
  title: string;
  matchPercentage: number;
  matchedSkills: string[];
  missingSkills: string[];
  strengths: string[];
  recommendations: string[];
}

interface JobRecommendationsSectionProps {
  candidateProfile: any;
}

export default function JobRecommendationsSection({ candidateProfile }: JobRecommendationsSectionProps) {
  const [jobMatches, setJobMatches] = useState<JobMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadJobRecommendations = async () => {
      if (!candidateProfile) return;
      
      setLoading(true);
      try {
        const recommendations = await JobMatchingService.getJobRecommendations(candidateProfile);
        setJobMatches(recommendations.slice(0, 5)); // Show top 5 matches
      } catch (error) {
        console.error('Error loading job recommendations:', error);
      } finally {
        setLoading(false);
      }
    };

    loadJobRecommendations();
  }, [candidateProfile]);

  const getMatchColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getMatchVariant = (percentage: number) => {
    if (percentage >= 80) return 'default';
    if (percentage >= 60) return 'secondary';
    return 'outline';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Job Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border rounded-lg p-4">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Job Recommendations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {jobMatches.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No job matches found</p>
            <p className="text-sm">Complete your profile to get personalized job recommendations</p>
          </div>
        ) : (
          <>
            <div className="text-sm text-muted-foreground mb-4">
              Based on your skills, experience, and preferences
            </div>
            
            {jobMatches.map((match) => (
              <div key={match.jobId} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm mb-1">{match.title}</h4>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={getMatchVariant(match.matchPercentage)}>
                        {match.matchPercentage}% Match
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        • {match.matchedSkills.length} skills matched
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/jobs/${match.jobId}`)}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    View
                  </Button>
                </div>

                <Progress value={match.matchPercentage} className="h-1" />

                {/* Strengths */}
                {match.strengths.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-xs font-medium text-green-600">
                      <CheckCircle className="h-3 w-3" />
                      Strengths
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {match.strengths.slice(0, 2).join(' • ')}
                      {match.strengths.length > 2 && ` • +${match.strengths.length - 2} more`}
                    </div>
                  </div>
                )}

                {/* Missing Skills */}
                {match.missingSkills.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-xs font-medium text-yellow-600">
                      <AlertCircle className="h-3 w-3" />
                      Skills to Develop
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {match.missingSkills.slice(0, 3).map((skill) => (
                        <Badge key={skill} variant="outline" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                      {match.missingSkills.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{match.missingSkills.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            <div className="pt-2">
              <Button
                variant="outline"
                onClick={() => navigate('/jobs')}
                className="w-full"
              >
                <Briefcase className="h-4 w-4 mr-2" />
                View All Jobs
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}