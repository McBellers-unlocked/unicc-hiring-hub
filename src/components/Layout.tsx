import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Users, LogOut, Settings, Briefcase, UserCheck, BarChart3, FileText, ChevronDown, Building, FileCheck } from 'lucide-react';
import { UNICCLogo } from '@/components/UNICCLogo';

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const { user, userRoles, userName, signOut } = useAuth();

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
                <span className="text-xl font-bold">UNICConnect</span>
              </Link>
              
              {user && (
                <nav className="hidden md:flex items-center space-x-6 ml-8">
                  <Link to="/jobs" className="flex items-center hover:text-accent transition-colors py-2">
                    <Briefcase className="w-4 h-4 mr-1" />
                    Jobs
                  </Link>
                  
                  {(isAdmin || isHR || isHiringManager) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger className="flex items-center hover:text-accent transition-colors py-2 focus:outline-none">
                        <Building className="w-4 h-4 mr-1" />
                        Pipeline
                        <ChevronDown className="w-3 h-3 ml-1" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="bg-popover border border-border shadow-lg">
                        <DropdownMenuItem asChild>
                          <Link to="/requisitions" className="flex items-center w-full">
                            <FileText className="w-4 h-4 mr-2" />
                            PD Pipeline
                          </Link>
                        </DropdownMenuItem>
                        {(isAdmin || isHR) && (
                          <DropdownMenuItem asChild>
                            <Link to="/admin/requisitions" className="flex items-center w-full">
                              <FileCheck className="w-4 h-4 mr-2" />
                              Manage PD Pipeline
                            </Link>
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  
                  {(isAdmin || isHR) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger className="flex items-center hover:text-accent transition-colors py-2 focus:outline-none">
                        <Settings className="w-4 h-4 mr-1" />
                        Manage
                        <ChevronDown className="w-3 h-3 ml-1" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="bg-popover border border-border shadow-lg">
                        <DropdownMenuItem asChild>
                          <Link to="/admin/jobs" className="flex items-center w-full">
                            <Briefcase className="w-4 h-4 mr-2" />
                            Manage Jobs
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/admin/phf-import" className="flex items-center w-full">
                            <FileText className="w-4 h-4 mr-2" />
                            PHF Import
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link to="/users" className="flex items-center w-full">
                            <Users className="w-4 h-4 mr-2" />
                            Users
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/analytics" className="flex items-center w-full">
                            <BarChart3 className="w-4 h-4 mr-2" />
                            Analytics
                          </Link>
                        </DropdownMenuItem>
                        {isAdmin && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                              <Link to="/settings" className="flex items-center w-full">
                                <Settings className="w-4 h-4 mr-2" />
                                Settings
                              </Link>
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  
                  {(isAdmin || isHR || isHiringManager || isPanelMember) && (
                    <Link to="/applications" className="flex items-center hover:text-accent transition-colors py-2">
                      <UserCheck className="w-4 h-4 mr-1" />
                      Applications
                    </Link>
                  )}
                  
                  {isCandidate && (
                    <Link to="/my-applications" className="flex items-center hover:text-accent transition-colors py-2">
                      <UserCheck className="w-4 h-4 mr-1" />
                      My Applications
                    </Link>
                  )}
                </nav>
              )}
            </div>
            
            <div className="flex items-center space-x-4 ml-auto">{/* rest of header content */}
              {user ? (
                <div className="flex items-center space-x-4">
                  <span className="text-sm">
                    {userName || user.email}
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
              <span className="font-semibold">UNICConnect</span>
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