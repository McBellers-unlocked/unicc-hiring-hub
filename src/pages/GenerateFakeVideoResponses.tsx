import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Video, Loader2 } from 'lucide-react';

export default function GenerateFakeVideoResponses() {
  const [emails, setEmails] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const { toast } = useToast();

  const handleGenerate = async () => {
    const emailList = emails
      .split('\n')
      .map(e => e.trim())
      .filter(e => e && e.includes('@'));

    if (emailList.length === 0) {
      toast({
        title: 'Error',
        description: 'Please enter at least one valid email address',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setResults(null);

    try {
      const { data, error } = await supabase.functions.invoke(
        'generate-fake-video-responses',
        {
          body: { emails: emailList },
        }
      );

      if (error) throw error;

      setResults(data);
      
      const successCount = data.results.filter((r: any) => r.success).length;
      
      toast({
        title: 'Success',
        description: `Created fake video responses for ${successCount}/${emailList.length} candidates`,
      });
    } catch (error: any) {
      console.error('Error generating fake video responses:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate fake video responses',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="w-6 h-6" />
              Generate Fake Video Responses
            </CardTitle>
            <CardDescription>
              Create simulated video interview responses for testing and demo purposes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Candidate Emails (one per line)
              </label>
              <Textarea
                placeholder="test.brian.white.11@example.com&#10;test.zara.taylor.34@example.com&#10;test.justin.fischer.1@example.com"
                value={emails}
                onChange={(e) => setEmails(e.target.value)}
                rows={10}
                className="font-mono text-sm"
              />
              <p className="text-sm text-muted-foreground">
                Enter one email address per line. The system will find each candidate's
                latest application and create fake video responses.
              </p>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={loading || !emails.trim()}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Video className="w-4 h-4 mr-2" />
                  Generate Fake Video Responses
                </>
              )}
            </Button>

            {results && (
              <div className="space-y-4 mt-6">
                <h3 className="font-semibold">Results</h3>
                <div className="space-y-2">
                  {results.results.map((result: any, index: number) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border ${
                        result.success
                          ? 'bg-green-50 border-green-200'
                          : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{result.email}</span>
                        {result.success ? (
                          <span className="text-green-600 text-sm">
                            ✓ {result.questionsAnswered} questions answered
                          </span>
                        ) : (
                          <span className="text-red-600 text-sm">
                            ✗ {result.error}
                          </span>
                        )}
                      </div>
                      {result.candidateName && (
                        <div className="text-sm text-muted-foreground mt-1">
                          {result.candidateName}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
