import { useAuth } from '@/hooks/useAuth';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link, useNavigate } from 'react-router-dom';
import { Briefcase, Users, UserCheck, Settings, FileText, Calendar } from 'lucide-react';
import { UNICCLogo } from '@/components/UNICCLogo';
import CandidateDashboard from '@/components/CandidateDashboard';
import HRAdminDashboard from '@/components/dashboard/HRAdminDashboard';
import HiringManagerDashboard from '@/components/dashboard/HiringManagerDashboard';
import ChiefHRDashboard from '@/components/dashboard/ChiefHRDashboard';
import PanelMemberDashboard from '@/components/dashboard/PanelMemberDashboard';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const Index = () => {
  const { user, userRoles, loading, needsProfileSetup } = useAuth();
  const navigate = useNavigate();

  // Redirect candidates who need profile setup
  useEffect(() => {
    if (!loading && user && needsProfileSetup && userRoles.includes('Candidate')) {
      // Get the candidate's ID and redirect to profile edit
      const getCandidateProfile = async () => {
        try {
          const { data } = await supabase
            .from('candidates')
            .select('id')
            .eq('email', user.email)
            .single();
          
          if (data?.id) {
            navigate(`/candidate-profile/${data.id}/edit`);
          }
        } catch (error) {
          console.error('Error finding candidate profile:', error);
        }
      };
      getCandidateProfile();
    }
  }, [user, userRoles, loading, needsProfileSetup, navigate]);

  // Redirect Chief of Division to their dashboard
  useEffect(() => {
    if (!loading && user && userRoles.includes('Chief of Division')) {
      navigate('/chief-of-division');
    }
  }, [user, userRoles, loading, navigate]);

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <UNICCLogo size="md" className="text-primary mx-auto mb-4" />
            <p>Loading...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-muted/20">
          <div className="text-center max-w-2xl px-4">
            <UNICCLogo size="lg" className="text-primary mx-auto mb-8" />
            <h1 className="text-4xl font-bold mb-4">Welcome to UNICConnect</h1>
            <p className="text-xl text-muted-foreground mb-8">
              Streamlined recruitment and applicant management platform for UNICC
            </p>
            <div className="space-y-4">
              <Link to="/auth">
                <Button size="lg" className="mr-4">
                  Sign In
                </Button>
              </Link>
              <Link to="/jobs">
                <Button variant="outline" size="lg">
                  View Open Positions
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const isAdmin = userRoles.includes('Admin');
  const isHR = userRoles.includes('HR Assistant');
  const isHiringManager = userRoles.includes('Hiring Manager');
  const isPanelMember = userRoles.includes('Panel Member');
  const isCandidate = userRoles.includes('Candidate');
  const isChiefHR = userRoles.includes('Chief of HR');
  const isChiefOfDivision = userRoles.includes('Chief of Division');
  const isDirector = userRoles.includes('Director');

  // Render appropriate dashboard based on primary role
  const renderDashboard = () => {
    if (isCandidate) {
      return <CandidateDashboard />;
    }
    
    if (isAdmin || isHR || isChiefHR) {
      return (
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">
              {isChiefHR ? 'Chief HR Dashboard' : 'HR Admin Dashboard'}
            </h1>
            <p className="text-muted-foreground mt-2">
              {isChiefHR 
                ? 'Manage Chief HR reviews and position descriptions' 
                : 'Manage recruitment pipeline and applications'}
            </p>
          </div>
          {isChiefHR ? <ChiefHRDashboard /> : <HRAdminDashboard />}
        </div>
      );
    }
    
    if (isChiefOfDivision) {
      navigate('/chief-of-division');
      return null;
    }
    
    if (isDirector) {
      navigate('/director-view');
      return null;
    }
    
    if (isHiringManager) {
      return (
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Hiring Manager Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Manage your jobs and position descriptions
            </p>
          </div>
          <HiringManagerDashboard />
        </div>
      );
    }
    
    if (isPanelMember) {
      return (
        <div className="container mx-auto px-4 py-8">
          <PanelMemberDashboard />
        </div>
      );
    }
    
    // Fallback: Generic dashboard
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Welcome back! Here's what you can do today.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

          {/* Staff Dashboard */}
          {(isAdmin || isHR || isHiringManager) && (
            <>
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Briefcase className="w-5 h-5 mr-2 text-primary" />
                    Manage Jobs
                  </CardTitle>
                  <CardDescription>
                    Create and manage job postings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link to="/jobs">
                    <Button className="w-full">Manage Jobs</Button>
                  </Link>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <UserCheck className="w-5 h-5 mr-2 text-primary" />
                    Review Applications
                  </CardTitle>
                  <CardDescription>
                    Process and evaluate candidates
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link to="/applications">
                    <Button className="w-full">View Applications</Button>
                  </Link>
                </CardContent>
              </Card>
            </>
          )}

          {/* Panel Member Dashboard */}
          {isPanelMember && (
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="w-5 h-5 mr-2 text-primary" />
                  My Interviews
                </CardTitle>
                <CardDescription>
                  View scheduled interviews
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link to="/interviews">
                  <Button className="w-full">View Schedule</Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Admin/HR Dashboard */}
          {(isAdmin || isHR) && (
            <>
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="w-5 h-5 mr-2 text-primary" />
                    User Management
                  </CardTitle>
                  <CardDescription>
                    Manage user accounts and roles
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link to="/users">
                    <Button className="w-full">Manage Users</Button>
                  </Link>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-primary" />
                    Reports
                  </CardTitle>
                  <CardDescription>
                    View recruitment analytics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link to="/reports">
                    <Button className="w-full">View Reports</Button>
                  </Link>
                </CardContent>
              </Card>
            </>
          )}

          {/* Admin Settings */}
          {isAdmin && (
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="w-5 h-5 mr-2 text-primary" />
                  System Settings
                </CardTitle>
                <CardDescription>
                  Configure ATS preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link to="/settings">
                  <Button className="w-full">Manage Settings</Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  };

  return (
    <Layout>
      {renderDashboard()}
    </Layout>
  );
};

export default Index;
