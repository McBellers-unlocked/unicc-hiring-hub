import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Users, LogOut, Settings, Briefcase, UserCheck, BarChart3, FileText } from 'lucide-react';
import { UNICCLogo } from '@/components/UNICCLogo';

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const { user, userRoles, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  const isAdmin = userRoles.includes('Admin');
  const isHR = userRoles.includes('HR Assistant');
  const isHiringManager = userRoles.includes('Hiring Manager');
  const isPanelMember = userRoles.includes('Panel Member');
  const isCandidate = userRoles.includes('Candidate');

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex items-center h-16">
            <div className="flex items-center space-x-4">
              <Link to="/" className="flex items-center space-x-3">
                <UNICCLogo size="md" variant="blue" className="text-primary-foreground" />
                <span className="text-xl font-bold">UNiConnect</span>
              </Link>
              
              {user && (
                <nav className="hidden md:flex space-x-4 ml-8">
                  <Link to="/jobs" className="hover:text-accent transition-colors">
                    <Briefcase className="w-4 h-4 inline mr-1" />
                    Jobs
                  </Link>
                  
                  {(isAdmin || isHR || isHiringManager) && (
                    <Link to="/requisitions" className="hover:text-accent transition-colors">
                      <FileText className="w-4 h-4 inline mr-1" />
                      PD Pipeline
                    </Link>
                  )}
                  
                   {(isAdmin || isHR) && (
                     <Link to="/admin/jobs" className="hover:text-accent transition-colors">
                       <Settings className="w-4 h-4 inline mr-1" />
                       Manage Jobs
                     </Link>
                   )}
                   
                   {(isAdmin || isHR) && (
                     <Link to="/admin/phf-import" className="hover:text-accent transition-colors">
                       <FileText className="w-4 h-4 inline mr-1" />
                       PHF Import
                     </Link>
                   )}
                  
                  {(isAdmin || isHR) && (
                    <Link to="/admin/requisitions" className="hover:text-accent transition-colors">
                      <FileText className="w-4 h-4 inline mr-1" />
                      Manage PD Pipeline
                    </Link>
                  )}
                  
                  {(isAdmin || isHR || isHiringManager || isPanelMember) && (
                    <Link to="/applications" className="hover:text-accent transition-colors">
                      <UserCheck className="w-4 h-4 inline mr-1" />
                      Applications
                    </Link>
                  )}
                  
                  {isCandidate && (
                    <Link to="/my-applications" className="hover:text-accent transition-colors">
                      <UserCheck className="w-4 h-4 inline mr-1" />
                      My Applications
                    </Link>
                  )}
                  
                  {(isAdmin || isHR) && (
                    <Link to="/users" className="hover:text-accent transition-colors">
                      <Users className="w-4 h-4 inline mr-1" />
                      Users
                    </Link>
                   )}
                   
                   {(isAdmin || isHR) && (
                     <Link to="/analytics" className="hover:text-accent transition-colors">
                       <BarChart3 className="w-4 h-4 inline mr-1" />
                       Analytics
                     </Link>
                   )}
                   
                   {isAdmin && (
                     <Link to="/settings" className="hover:text-accent transition-colors">
                       <Settings className="w-4 h-4 inline mr-1" />
                       Settings
                     </Link>
                   )}
                </nav>
              )}
            </div>
            
            <div className="flex items-center space-x-4">{/* rest of header content */}
              {user ? (
                <div className="flex items-center space-x-4">
                  <span className="text-sm">
                    {user.email}
                    {userRoles.length > 0 && (
                      <span className="ml-2 text-xs bg-accent text-accent-foreground px-2 py-1 rounded">
                        {userRoles.join(', ')}
                      </span>
                    )}
                  </span>
                  <Link to="/account/security" className="text-sm hover:text-accent transition-colors">
                    <Settings className="w-4 h-4 inline mr-1" />
                    Security
                  </Link>
                  <Button variant="ghost" size="sm" onClick={handleSignOut}>
                    <LogOut className="w-4 h-4 mr-1" />
                    Sign Out
                  </Button>
                </div>
              ) : (
                <Link to="/auth">
                  <Button variant="secondary">Sign In</Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-muted text-muted-foreground py-8 mt-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-3">
              <UNICCLogo size="sm" className="text-primary" />
              <span className="font-semibold">UNiConnect</span>
              <span className="text-sm">© 2024</span>
            </div>
            
            <div className="flex space-x-6 text-sm">
              <a 
                href="https://www.unicc.org/unicc-privacy-notice-for-applicants/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors"
              >
                Privacy Notice
              </a>
              <Link to="/support" className="hover:text-primary transition-colors">
                Support
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};