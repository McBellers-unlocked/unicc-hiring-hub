import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const affiliateEmails = [
  'Rate confirmation to IC',
  'General documentation to IC',
  'One HR conformity',
];

const EmailHub = () => {
  const { toast } = useToast();

  const handleDraftEmail = (label: string) => {
    toast({ title: 'Coming soon', description: `Draft email for "${label}" is not yet implemented.` });
  };

  return (
    <Layout>
      <div className="container mx-auto py-8 space-y-6">
        <h1 className="text-3xl font-bold">Email Hub</h1>

        <Card>
          <CardHeader>
            <CardTitle>Selection</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">No items configured yet.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Staff Recruitment</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">No items configured yet.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Affiliate Recruitment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {affiliateEmails.map((label) => (
              <div key={label} className="flex items-center justify-between py-2 border-b last:border-b-0">
                <span className="text-sm font-medium">{label}</span>
                <Button variant="outline" size="sm" onClick={() => handleDraftEmail(label)}>
                  <Mail className="w-4 h-4 mr-2" />
                  Draft Email
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default EmailHub;
