import React, { useState } from 'react';
import { Layout } from '@/components/Layout';
import { HiringFunnelDashboard } from '@/components/HiringFunnelDashboard';
import { UnifiedActivityViewer } from '@/components/UnifiedActivityViewer';
import { WorkforceAnalytics } from '@/components/analytics/WorkforceAnalytics';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Activity, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { AnalyticsFilters, AnalyticsFilterState } from '@/components/analytics/AnalyticsFilters';
import { PerformanceMetrics } from '@/components/analytics/PerformanceMetrics';

export const Analytics: React.FC = () => {
  const { userRoles } = useAuth();
  const [filters, setFilters] = useState<AnalyticsFilterState>({
    includeProjections: true,
  });
  const [activeTab, setActiveTab] = useState('hiring');

  // Check if user has access to analytics
  const hasAccess = userRoles.includes('Admin') || userRoles.includes('HR Assistant') || userRoles.includes('Chief of HR');

  if (!hasAccess) {
    return <Navigate to="/" />;
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Analytics & Reports</h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive insights into your hiring process, workforce composition, and system activity.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="hiring" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Hiring Performance
            </TabsTrigger>
            <TabsTrigger value="workforce" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Workforce Analytics
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Audit Log
            </TabsTrigger>
          </TabsList>

          {/* Global Filters - show projections toggle only on workforce tab */}
          <AnalyticsFilters 
            filters={filters} 
            onChange={setFilters} 
            showProjectionsToggle={activeTab === 'workforce'}
          />

          <TabsContent value="hiring" className="space-y-6">
            <HiringFunnelDashboard filters={filters} />
            <PerformanceMetrics filters={filters} />
          </TabsContent>

          <TabsContent value="workforce">
            <WorkforceAnalytics filters={filters} />
          </TabsContent>

          <TabsContent value="audit">
            <UnifiedActivityViewer filters={filters} />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};
