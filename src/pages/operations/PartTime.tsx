import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock3 } from 'lucide-react';

const PartTime = () => {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <Clock3 className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Part Time</h1>
              <p className="text-muted-foreground mt-1">
                Part-time work arrangements management
              </p>
            </div>
          </div>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Coming Soon</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This page is under development. It will include tools for managing part-time work arrangements and flexible scheduling.
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default PartTime;
