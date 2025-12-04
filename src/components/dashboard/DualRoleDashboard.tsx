import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Briefcase, User } from 'lucide-react';
import CandidateDashboard from '@/components/CandidateDashboard';
import HRAdminDashboard from '@/components/dashboard/HRAdminDashboard';
import HiringManagerDashboard from '@/components/dashboard/HiringManagerDashboard';
import ChiefHRDashboard from '@/components/dashboard/ChiefHRDashboard';
import PanelMemberDashboard from '@/components/dashboard/PanelMemberDashboard';

const STORAGE_KEY = 'unicconnect_dashboard_tab';

const DualRoleDashboard = () => {
  const { userRoles, userName } = useAuth();
  const [activeTab, setActiveTab] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY) || 'tasks';
  });

  const isAdmin = userRoles.includes('Admin');
  const isHR = userRoles.includes('HR Assistant');
  const isHiringManager = userRoles.includes('Hiring Manager');
  const isPanelMember = userRoles.includes('Panel Member');
  const isChiefHR = userRoles.includes('Chief of HR');

  // Persist tab selection
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, activeTab);
  }, [activeTab]);

  // Determine staff dashboard title
  const getStaffDashboardTitle = () => {
    if (isChiefHR) return 'Chief HR Dashboard';
    if (isAdmin || isHR) return 'HR Admin Dashboard';
    if (isHiringManager) return 'Hiring Manager Dashboard';
    if (isPanelMember) return 'Panel Member Dashboard';
    return 'Staff Dashboard';
  };

  // Render staff dashboard based on role
  const renderStaffDashboard = () => {
    if (isChiefHR) {
      return <ChiefHRDashboard />;
    }
    if (isAdmin || isHR) {
      return <HRAdminDashboard />;
    }
    if (isHiringManager) {
      return <HiringManagerDashboard />;
    }
    if (isPanelMember) {
      return <PanelMemberDashboard />;
    }
    return null;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Welcome back, {userName?.split(' ')[0] || 'there'}</h1>
        <p className="text-muted-foreground mt-1">
          Manage your work tasks and personal career from one place
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
          <TabsTrigger value="tasks" className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            My Tasks
          </TabsTrigger>
          <TabsTrigger value="career" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            My Career
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="mt-0">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-muted-foreground">{getStaffDashboardTitle()}</h2>
          </div>
          {renderStaffDashboard()}
        </TabsContent>

        <TabsContent value="career" className="mt-0">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-muted-foreground">Personal Career Dashboard</h2>
            <p className="text-sm text-muted-foreground">
              Track your applications, manage your profile, and explore opportunities
            </p>
          </div>
          <CandidateDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DualRoleDashboard;
