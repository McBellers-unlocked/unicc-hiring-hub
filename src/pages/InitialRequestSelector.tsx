import { useNavigate, useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserPlus, FileText, ArrowRight } from 'lucide-react';
import InitialRequestForm from './InitialRequestForm';
import ProcurementTORForm from './ProcurementTORForm';

export default function InitialRequestSelector() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const type = searchParams.get('type');

  // If a type is selected, render the appropriate form
  if (type === 'position') {
    return <InitialRequestForm />;
  }
  if (type === 'tor') {
    return <ProcurementTORForm />;
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">New Initial Request</h1>
          <p className="text-muted-foreground mt-2">
            Select the type of request you'd like to create
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group"
                onClick={() => navigate('/requisitions/initial/new?type=position')}>
            <CardHeader className="pb-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <UserPlus className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-xl">Create a Position</CardTitle>
              <CardDescription>
                Request a new staff position, consultant, intern, or STDA assignment through the HR workflow.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                Get Started <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group"
                onClick={() => navigate('/requisitions/initial/new?type=tor')}>
            <CardHeader className="pb-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-xl">Procurement TOR</CardTitle>
              <CardDescription>
                Submit a Terms of Reference for procurement of external services, consultants, or contractors.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                Get Started <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
