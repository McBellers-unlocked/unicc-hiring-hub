import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, XCircle, AlertCircle, Search, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WHEDMatch {
  id: string;
  name: string;
  alternative_names: string[];
  country: string;
  similarity_score: number;
}

interface EducationEntry {
  degree_type?: string;
  institution?: string;
  school?: string;
  field_of_study?: string;
  field?: string;
}

interface WHEDVerificationStatusProps {
  education: EducationEntry[];
  onVerificationChange?: (verified: boolean) => void;
  readOnly?: boolean;
}

export default function WHEDVerificationStatus({ 
  education, 
  onVerificationChange,
  readOnly = false 
}: WHEDVerificationStatusProps) {
  const [verificationResults, setVerificationResults] = useState<Map<string, WHEDMatch | null>>(new Map());
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<WHEDMatch[]>([]);
  const [searching, setSearching] = useState(false);

  // Auto-verify education entries on mount
  useEffect(() => {
    if (education.length > 0) {
      verifyAllEducation();
    }
  }, [education]);

  const verifyAllEducation = async () => {
    setLoading(true);
    const results = new Map<string, WHEDMatch | null>();

    for (const edu of education) {
      const institution = edu.institution || edu.school;
      if (!institution) continue;

      try {
        const { data } = await supabase.rpc('search_whed_universities', {
          search_term: institution,
          max_results: 1
        });

        if (data && data.length > 0 && data[0].similarity_score >= 0.5) {
          results.set(institution, data[0] as WHEDMatch);
        } else {
          results.set(institution, null);
        }
      } catch (error) {
        console.error('Error verifying institution:', error);
        results.set(institution, null);
      }
    }

    setVerificationResults(results);
    setLoading(false);

    // Notify parent if all have high-confidence matches
    const allVerified = education.every(edu => {
      const institution = edu.institution || edu.school;
      if (!institution) return false;
      const match = results.get(institution);
      return match && match.similarity_score >= 0.7;
    });
    onVerificationChange?.(allVerified);
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    
    setSearching(true);
    try {
      const { data, error } = await supabase.rpc('search_whed_universities', {
        search_term: searchTerm,
        max_results: 10
      });

      if (error) throw error;
      setSearchResults((data || []) as WHEDMatch[]);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const getVerificationBadge = (institution: string) => {
    const match = verificationResults.get(institution);

    if (loading) {
      return (
        <Badge variant="outline" className="gap-1 text-xs">
          <Loader2 className="h-3 w-3 animate-spin" />
          Checking...
        </Badge>
      );
    }

    if (!match) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="gap-1 text-xs bg-destructive/10 text-destructive border-destructive/30">
                <XCircle className="h-3 w-3" />
                Not in WHED
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Institution not found in WHED database</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    if (match.similarity_score >= 0.8) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="gap-1 text-xs bg-green-500/10 text-green-600 border-green-500/30">
                <CheckCircle2 className="h-3 w-3" />
                WHED Verified
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-medium">{match.name}</p>
              <p className="text-muted-foreground">{match.country}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="gap-1 text-xs bg-amber-500/10 text-amber-600 border-amber-500/30">
              <AlertCircle className="h-3 w-3" />
              Possible Match
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-medium">Similar: {match.name}</p>
            <p className="text-muted-foreground">{match.country}</p>
            <p className="text-xs">Confidence: {Math.round(match.similarity_score * 100)}%</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const verifiedCount = Array.from(verificationResults.values()).filter(
    match => match && match.similarity_score >= 0.7
  ).length;

  return (
    <div className="space-y-4">
      {/* Education entries with verification status */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Education WHED Verification</Label>
        {education.length === 0 ? (
          <p className="text-sm text-muted-foreground">No education records to verify</p>
        ) : (
          <div className="space-y-2">
            {education.map((edu, index) => {
              const institution = edu.institution || edu.school;
              if (!institution) return null;
              
              return (
                <div key={index} className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/50">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{institution}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {edu.degree_type} {edu.field_of_study || edu.field ? `in ${edu.field_of_study || edu.field}` : ''}
                    </p>
                  </div>
                  {getVerificationBadge(institution)}
                </div>
              );
            })}
          </div>
        )}
        
        {/* Summary */}
        {education.length > 0 && !loading && (
          <div className={cn(
            "text-xs p-2 rounded-md",
            verifiedCount === education.length 
              ? "bg-green-500/10 text-green-600" 
              : verifiedCount > 0 
                ? "bg-amber-500/10 text-amber-600"
                : "bg-destructive/10 text-destructive"
          )}>
            {verifiedCount === education.length 
              ? `All ${verifiedCount} institution(s) verified in WHED`
              : verifiedCount > 0
                ? `${verifiedCount} of ${education.length} institution(s) verified`
                : `No institutions verified in WHED`
            }
          </div>
        )}
      </div>

      {/* Manual search */}
      {!readOnly && (
        <div className="space-y-2 pt-2 border-t">
          <Label className="text-xs text-muted-foreground">Search WHED Database</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Search for university..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="text-sm"
            />
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSearch}
              disabled={searching || !searchTerm.trim()}
            >
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>

          {/* Search results */}
          {searchResults.length > 0 && (
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {searchResults.map((result) => (
                <div 
                  key={result.id}
                  className="p-2 text-sm bg-muted/50 rounded-md hover:bg-muted cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{result.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {Math.round(result.similarity_score * 100)}%
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">{result.country}</span>
                  {result.alternative_names.length > 0 && (
                    <p className="text-xs text-muted-foreground italic">
                      Also: {result.alternative_names.join(', ')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
