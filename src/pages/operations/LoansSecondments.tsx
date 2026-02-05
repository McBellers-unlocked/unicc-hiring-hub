import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeftRight } from 'lucide-react';

const LoansSecondments = () => {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <ArrowLeftRight className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Loans and Secondments</h1>
              <p className="text-muted-foreground mt-1">
                Manage staff loans and secondment arrangements
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
              This page is under development. It will include tools for managing staff loans, secondments, and inter-agency transfers.
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default LoansSecondments;
