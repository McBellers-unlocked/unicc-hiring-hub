import React from 'react';
import { Layout } from '@/components/Layout';
import { HiringFunnelDashboard } from '@/components/HiringFunnelDashboard';
import { AuditLogViewer } from '@/components/AuditLogViewer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Activity, TrendingUp } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';

export const Analytics: React.FC = () => {
  const { userRoles } = useAuth();

  // Check if user has access to analytics
  const hasAccess = userRoles.includes('Admin') || userRoles.includes('HR Assistant');

  if (!hasAccess) {
    return <Navigate to="/" />;
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Analytics & Reports</h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive insights into your hiring process, performance metrics, and system activity.
          </p>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Hiring Dashboard
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Performance
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Audit Log
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <HiringFunnelDashboard />
          </TabsContent>

          <TabsContent value="performance">
            <div className="space-y-6">
              {/* Performance metrics will be expanded here */}
              <div className="text-center py-12 text-muted-foreground">
                Advanced performance analytics coming soon...
              </div>
            </div>
          </TabsContent>

          <TabsContent value="audit">
            <AuditLogViewer />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};