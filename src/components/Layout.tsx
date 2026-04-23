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
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, LogOut, Settings, Briefcase, UserCheck, BarChart3, FileText, ChevronDown, Building, FileCheck, User, LayoutDashboard, Shield, Heart, GraduationCap, BookOpen, Target, ClipboardList, ClipboardCheck, UserCog, Network, Upload, Cog, Mail } from 'lucide-react';
import headerLogo from '@/assets/uniqtalent-header-logo.png';

interface LayoutProps {
  children: ReactNode;
}

// Get avatar background color based on user's highest-priority role
const getAvatarColorByRole = (roles: string[]) => {
  if (roles.includes('Admin')) return 'bg-rose-100 text-rose-700';
  if (roles.includes('Chief of HR')) return 'bg-purple-100 text-purple-700';
  if (roles.includes('Director')) return 'bg-indigo-100 text-indigo-700';
  if (roles.includes('HR Assistant')) return 'bg-blue-100 text-blue-700';
  if (roles.includes('Hiring Manager')) return 'bg-cyan-100 text-cyan-700';
  if (roles.includes('Panel Member')) return 'bg-emerald-100 text-emerald-700';
  if (roles.includes('Candidate')) return 'bg-amber-100 text-amber-700';
  return 'bg-gray-100 text-gray-600';
};

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
  const isChiefHR = userRoles.includes('Chief of HR');
  const isDirector = userRoles.includes('Director');
  
  // Check if user is a designated Chief of Division
  const chiefEmails = ['soni@unicc.org', 'liuzzi@unicc.org', 'sethi@unicc.org', 'negyesi@unicc.org', 'grecuccio@unicc.org'];
  const isChiefOfDivision = user?.email && chiefEmails.includes(user.email.toLowerCase());
  
  const isLocalAdmin = userRoles.includes('Local Admin');
  
  // Chief HR has same navigation access as Admin/HR
  const hasAdminAccess = isAdmin || isHR || isChiefHR;
  // Directors have hiring manager access plus their own director functions
  const hasHiringManagerAccess = isHiringManager || isDirector;
  // Staff members who might want to access career features
  const hasStaffRole = isAdmin || isHR || isChiefHR || isHiringManager || isPanelMember || isDirector;

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Header */}
      <header className="bg-[#F8FAFC] border-b border-[#E5E7EB] text-[#243B53] sticky top-0 z-50 shadow-[0_1px_3px_0_rgba(0,0,0,0.04)]">
        <div className="container mx-auto px-4">
          <div className="flex items-center h-16">
            <div className="flex items-center space-x-4">
              <Link to="/" className="flex items-center">
                <img src={headerLogo} alt="UNIQTalent" className="h-10 w-auto" />
              </Link>
              
              {user && (
                <nav className="hidden md:flex items-center space-x-6 ml-8">
                  <Link to="/dashboard" className="flex items-center hover:text-[#009EDB] transition-colors py-2">
                    <LayoutDashboard className="w-4 h-4 mr-1" />
                    Dashboard
                  </Link>
                  
                  <Link to="/jobs" className="flex items-center hover:text-[#009EDB] transition-colors py-2">
                    <Briefcase className="w-4 h-4 mr-1" />
                    Jobs
                  </Link>
                  
                  <Link to="/life-at-unicc" className="flex items-center hover:text-[#009EDB] transition-colors py-2">
                    <Heart className="w-4 h-4 mr-1" />
                    Life at UNICC
                  </Link>
                  
                  {(hasAdminAccess || hasHiringManagerAccess) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger className="flex items-center hover:text-[#009EDB] transition-colors py-2 focus:outline-none">
                        <Building className="w-4 h-4 mr-1" />
                        Pipeline
                        <ChevronDown className="w-3 h-3 ml-1" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="bg-popover border border-border shadow-lg">
                  {(hasHiringManagerAccess || isAdmin || isHR) && (
                    <DropdownMenuItem asChild>
                      <Link to="/requisitions" className="flex items-center w-full">
                        <FileText className="w-4 h-4 mr-2" />
                        PD Pipeline
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {isChiefOfDivision && (
                    <DropdownMenuItem asChild>
                      <Link to="/chief-of-division" className="flex items-center w-full">
                        <FileCheck className="w-4 h-4 mr-2" />
                        Chief Approvals
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {hasAdminAccess && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin/initial-requests" className="flex items-center w-full">
                        <FileCheck className="w-4 h-4 mr-2" />
                        Initial Requests
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {hasAdminAccess && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin/requisitions" className="flex items-center w-full">
                        <FileCheck className="w-4 h-4 mr-2" />
                        Manage PD Pipeline
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {hasAdminAccess && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin/chief-hr-review" className="flex items-center w-full">
                        <FileCheck className="w-4 h-4 mr-2" />
                        Chief HR Review
                      </Link>
                    </DropdownMenuItem>
                  )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  
            {hasAdminAccess && (
                    <DropdownMenu>
                      <DropdownMenuTrigger className="flex items-center hover:text-[#009EDB] transition-colors py-2 focus:outline-none">
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
                        <DropdownMenuItem asChild>
                          <Link to="/admin/assessments" className="flex items-center w-full">
                            <ClipboardList className="w-4 h-4 mr-2" />
                            Assessments
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/admin/talent-pool" className="flex items-center w-full">
                            <Users className="w-4 h-4 mr-2" />
                            Talent Pool
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
                          <Link to="/admin/org-chart" className="flex items-center w-full">
                            <Network className="w-4 h-4 mr-2" />
                            Organization Chart
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/admin/performance-cycles" className="flex items-center w-full">
                            <ClipboardCheck className="w-4 h-4 mr-2" />
                            Performance Cycles
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/admin/email-hub" className="flex items-center w-full">
                            <Mail className="w-4 h-4 mr-2" />
                            Email Hub
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link to="/settings" className="flex items-center w-full">
                            <Settings className="w-4 h-4 mr-2" />
                            Settings
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  
                  {(hasAdminAccess || hasHiringManagerAccess || isPanelMember) && (
                    <Link to="/applications" className="flex items-center hover:text-[#009EDB] transition-colors py-2">
                      <UserCheck className="w-4 h-4 mr-1" />
                      Applications
                    </Link>
                  )}
                  
                  {hasAdminAccess && (
                    <DropdownMenu>
                      <DropdownMenuTrigger className="flex items-center hover:text-[#009EDB] transition-colors py-2 focus:outline-none">
                        <Cog className="w-4 h-4 mr-1" />
                        HR Operations
                        <ChevronDown className="w-3 h-3 ml-1" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="bg-popover border border-border shadow-lg">
                        <DropdownMenuItem asChild>
                          <Link to="/operations/separations" className="flex items-center w-full">
                            Separations
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/operations/appointments" className="flex items-center w-full">
                            Appointments
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/operations/loans-secondments" className="flex items-center w-full">
                            Loans and Secondments
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/operations/stdas" className="flex items-center w-full">
                            STDAs
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/operations/transfers" className="flex items-center w-full">
                            Transfers
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/operations/pd-revisions" className="flex items-center w-full">
                            PD Revisions and Promotions
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/operations/part-time" className="flex items-center w-full">
                            Part Time
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/operations/slwop" className="flex items-center w-full">
                            SLWOP
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/operations/protocol-services" className="flex items-center w-full">
                            Protocol Services
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/operations/home-leave" className="flex items-center w-full">
                            Home Leave
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/operations/contract-extensions" className="flex items-center w-full">
                            Contract Extensions
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/operations/documents" className="flex items-center w-full">
                            Document Repository
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link to="/admin/affiliate-personnel" className="flex items-center w-full">
                            <UserCog className="w-4 h-4 mr-2" />
                            Affiliate Personnel
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/operations/unv" className="flex items-center w-full">
                            UNV
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/operations/interns" className="flex items-center w-full">
                            Interns
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}

                  {hasAdminAccess && (
                    <DropdownMenu>
                      <DropdownMenuTrigger className="flex items-center hover:text-[#009EDB] transition-colors py-2 focus:outline-none">
                        <BarChart3 className="w-4 h-4 mr-1" />
                        Analytics
                        <ChevronDown className="w-3 h-3 ml-1" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="bg-popover border border-border shadow-lg">
                        <DropdownMenuItem asChild>
                          <Link to="/analytics" className="flex items-center w-full">
                            <BarChart3 className="w-4 h-4 mr-2" />
                            Hiring Analytics
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/admin/import-staff-list" className="flex items-center w-full">
                            <Upload className="w-4 h-4 mr-2" />
                            Import Staff List
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}

                  {isLocalAdmin && !hasAdminAccess && (
                    <Link to="/operations/admin" className="flex items-center hover:text-[#009EDB] transition-colors py-2">
                      <Building className="w-4 h-4 mr-1" />
                      Local Admin
                    </Link>
                  )}
                  
                  {/* My Career dropdown for staff members */}
                  {hasStaffRole && (
                    <DropdownMenu>
                      <DropdownMenuTrigger className="flex items-center hover:text-[#009EDB] transition-colors py-2 focus:outline-none">
                        <GraduationCap className="w-4 h-4 mr-1" />
                        My Career
                        <ChevronDown className="w-3 h-3 ml-1" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="bg-popover border border-border shadow-lg">
                        <DropdownMenuItem asChild>
                          <Link to="/my-applications" className="flex items-center w-full">
                            <UserCheck className="w-4 h-4 mr-2" />
                            My Applications
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/my-profile" className="flex items-center w-full">
                            <User className="w-4 h-4 mr-2" />
                            My Profile
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link to="/hiring-guide" className="flex items-center w-full">
                            <BookOpen className="w-4 h-4 mr-2" />
                            Hiring Process Guide
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/skills-analysis" className="flex items-center w-full">
                            <Target className="w-4 h-4 mr-2" />
                            Skills Analysis
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link to="/performance" className="flex items-center w-full">
                            <ClipboardCheck className="w-4 h-4 mr-2" />
                            Performance
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  
                  {/* Direct link for pure candidates */}
                  {isCandidate && !hasStaffRole && (
                    <Link to="/my-applications" className="flex items-center hover:text-[#009EDB] transition-colors py-2">
                      <UserCheck className="w-4 h-4 mr-1" />
                      My Applications
                    </Link>
                  )}
                </nav>
              )}
            </div>
            
            <div className="flex items-center space-x-2 ml-auto">
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0 hover:bg-[#009EDB]/10">
                      <Avatar className="h-9 w-9 border-2 border-[#D9E6F2]">
                        <AvatarImage src="" alt={userName || ''} />
                        <AvatarFallback className={`${getAvatarColorByRole(userRoles)} font-semibold text-sm`}>
                          {userName
                            ? userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                            : user.email?.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-64" align="end" sideOffset={8}>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-2">
                        <p className="text-base font-semibold leading-none">{userName || 'User'}</p>
                        <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                        {userRoles.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {userRoles.map((role) => (
                              <span
                                key={role}
                                className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full"
                              >
                                {role}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard" className="flex items-center cursor-pointer">
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/my-profile" className="flex items-center cursor-pointer">
                        <User className="mr-2 h-4 w-4" />
                        My Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/account/security" className="flex items-center cursor-pointer">
                        <Shield className="mr-2 h-4 w-4" />
                        Security
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive cursor-pointer">
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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
              <img src={headerLogo} alt="UNIQTalent" className="h-6 w-auto" />
              <span className="text-sm">© 2025</span>
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