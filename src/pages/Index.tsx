import { useAuth } from '@/hooks/useAuth';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Briefcase, Users, UserCheck, Settings, FileText, Calendar } from 'lucide-react';
import { UNICCLogo } from '@/components/UNICCLogo';

const Index = () => {
  const { user, userRoles, loading } = useAuth();

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
            <h1 className="text-4xl font-bold mb-4">Welcome to UNICC ATS</h1>
            <p className="text-xl text-muted-foreground mb-8">
              Streamlined applicant tracking system for UNICC recruitment processes
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

  const isAdmin = userRoles.includes('admin');
  const isHR = userRoles.includes('hr_assistant');
  const isHiringManager = userRoles.includes('hiring_manager');
  const isPanelMember = userRoles.includes('panel_member');
  const isCandidate = userRoles.includes('candidate');

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Welcome back! Here's what you can do today.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Candidate Dashboard */}
          {isCandidate && (
            <>
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Briefcase className="w-5 h-5 mr-2 text-primary" />
                    Browse Jobs
                  </CardTitle>
                  <CardDescription>
                    Explore available positions and apply
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link to="/jobs">
                    <Button className="w-full">View Open Positions</Button>
                  </Link>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <UserCheck className="w-5 h-5 mr-2 text-primary" />
                    My Applications
                  </CardTitle>
                  <CardDescription>
                    Track your application status
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link to="/my-applications">
                    <Button className="w-full">View Applications</Button>
                  </Link>
                </CardContent>
              </Card>
            </>
          )}

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
    </Layout>
  );
};

export default Index;
