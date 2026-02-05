import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarOff } from 'lucide-react';

const SLWOP = () => {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <CalendarOff className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">SLWOP</h1>
              <p className="text-muted-foreground mt-1">
                Special Leave Without Pay management
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
              This page is under development. It will include tools for managing special leave without pay requests and tracking.
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default SLWOP;
