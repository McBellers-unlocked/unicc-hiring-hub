import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserMinus } from 'lucide-react';

const Separations = () => {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <UserMinus className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Separations</h1>
              <p className="text-muted-foreground mt-1">
                Manage staff separations and offboarding processes
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
              This page is under development. It will include tools for managing staff separations, exit processes, and related documentation.
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Separations;
