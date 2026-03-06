import './ProductSpec.print.css';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UNICCLogo } from '@/components/UNICCLogo';
import {
  Download, Briefcase, Video, ClipboardList, Users, Brain,
  BarChart3, Settings, Target, GitBranch, Shield, Globe,
  Server, Code, Layers, CheckCircle2, ArrowRight
} from 'lucide-react';

const modules = [
  {
    icon: Briefcase,
    title: 'Recruitment & Hiring',
    desc: 'End-to-end recruitment lifecycle from requisition to offer, with AI-powered candidate scoring.',
    features: [
      'Job requisition workflow with multi-level approval (Hiring Manager → HR → Chief HR → Director)',
      'Customizable job postings with structured screening questions',
      'Automated AI scoring against job criteria with detailed breakdowns',
      'Configurable review committees and evaluation forms',
      'Application status pipeline (Applied → Longlisted → Shortlisted → Interview → Offer)',
      'Manual and bulk application import (PHF format support)',
      'Longlist/shortlist management with batch operations',
    ],
  },
  {
    icon: Video,
    title: 'Video Interviews',
    desc: 'Asynchronous and panel-based video interviews with AI-assisted analysis.',
    features: [
      'Async video interview assignments with configurable question sets',
      'Token-based secure access for candidates (no account required)',
      'Panel interview scheduling with multi-evaluator feedback forms',
      'AI-powered response analysis and transcription via Gemini',
      'Customizable email templates for interview invitations',
      'Interview slot booking system for candidates',
    ],
  },
  {
    icon: ClipboardList,
    title: 'Written Assessments',
    desc: 'Multi-format assessment builder with timed exercises and automated scoring.',
    features: [
      'Email-simulation assessments with realistic inbox scenarios',
      'Multiple-choice question builder with automatic grading',
      'Assessment series for multi-stage evaluation processes',
      'Timed assessment slots with curveball email injection',
      'Candidate portal with secure token-based access',
      'Detailed scoring rubrics (communication, prioritization, risk awareness)',
      'Research assessment support for academic evaluations',
    ],
  },
  {
    icon: Users,
    title: 'Talent Pool',
    desc: 'Centralized candidate database with advanced search, flags, and notes.',
    features: [
      'Searchable database of all candidates across job postings',
      'Candidate flagging system (talent watch, do-not-hire, etc.)',
      'Private and shared notes per candidate',
      'Full candidate profile with education, experience, skills, and certifications',
      'Cross-application history view',
      'Profile completion tracking',
    ],
  },
  {
    icon: Brain,
    title: 'Skills Framework',
    desc: '679-skill taxonomy with AI-powered categorization and organizational skills tracking.',
    features: [
      '679 standardized skills across 8 categories',
      'AI-powered skill categorization (Established, Emerging, New)',
      'OSS (Occupational Skills Standard) tracking per staff member',
      'Skills gap analysis across teams and divisions',
      'Bulk import capabilities for organizational skill data',
      'WHED (World Higher Education Database) integration for education verification',
    ],
  },
  {
    icon: BarChart3,
    title: 'Analytics & Reporting',
    desc: 'Comprehensive dashboards with real-time charts and data export capabilities.',
    features: [
      'Recruitment pipeline analytics with conversion funnels',
      'Time-to-hire and time-to-fill metrics',
      'Diversity and nationality distribution reports',
      'Application source tracking and effectiveness analysis',
      'Interactive charts (Recharts) with drill-down capability',
      'Exportable data for external reporting',
    ],
  },
  {
    icon: Settings,
    title: 'HR Operations',
    desc: 'Complete HR operations management for appointments, separations, and contract lifecycle.',
    features: [
      'Appointment lifecycle tracking with configurable checklists',
      'Separation management (resignation, end-of-contract, retirement)',
      'Contract extensions and renewals workflow',
      'Loans & secondments, UNV, intern, and STDA tracking',
      'PD revisions, part-time arrangements, SLWOP management',
      'Protocol services and home leave tracking',
      'Document repository with categorized templates',
      'Local admin dashboards per duty station',
    ],
  },
  {
    icon: Target,
    title: 'Performance Management',
    desc: 'Cycle-based performance reviews with workplan tracking and goal alignment.',
    features: [
      'Configurable performance review cycles',
      'Individual workplan creation and tracking',
      'Manager and self-assessment workflows',
      'Team performance overview for supervisors',
      'Goal-setting and competency evaluation',
    ],
  },
  {
    icon: GitBranch,
    title: 'Organization Chart',
    desc: 'Interactive organizational hierarchy visualization.',
    features: [
      'Dynamic org tree rendering with react-d3-tree',
      'Drill-down navigation through divisions and units',
      'Staff count and reporting line visualization',
      'Integration with staff data imports',
    ],
  },
  {
    icon: Globe,
    title: 'Affiliate Personnel',
    desc: 'Non-staff workforce management with contract history and lifecycle tracking.',
    features: [
      'Affiliate personnel database with demographics',
      'Contract history tracking (Samsaran/GSM references)',
      'Lifecycle checklists per contract cycle',
      'Bulk import from spreadsheets',
      'Contract document management',
    ],
  },
];

const ProductSpec = () => {
  const handleDownload = () => {
    window.print();
  };

  return (
    <div className="product-spec-doc min-h-screen bg-background">
      {/* Download button - hidden in print */}
      <div className="no-print sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <UNICCLogo size="sm" />
          <span className="font-semibold text-foreground">Product Specification</span>
        </div>
        <Button onClick={handleDownload} className="gap-2">
          <Download className="h-4 w-4" />
          Download PDF
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-12">
        {/* Cover / Executive Summary */}
        <section className="text-center space-y-6 pb-8 border-b border-border">
          <div className="flex justify-center">
            <UNICCLogo size="lg" />
          </div>
          <h1 className="text-4xl font-bold text-foreground tracking-tight">
            UNIQTalent
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Integrated Human Resources Management Platform
          </p>
          <div className="bg-primary/5 rounded-lg p-6 max-w-3xl mx-auto text-left space-y-3">
            <h2 className="text-lg font-semibold text-foreground">Executive Summary</h2>
            <p className="text-muted-foreground leading-relaxed">
              UNIQTalent is a comprehensive, web-based HR management platform purpose-built for international organizations. 
              It covers the full employee lifecycle — from job requisition and recruitment through onboarding, performance management, 
              and separation — in a single, integrated system. The platform replaces fragmented spreadsheets and manual processes 
              with structured workflows, AI-powered automation, and real-time analytics.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Designed with UN system requirements in mind, UNIQTalent supports multi-level approval chains, 
              PHF (Personal History Form) compliance, duty station management across global offices, and 
              role-based access control with full audit logging.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto pt-4">
            {[
              { label: 'Platform Modules', value: '10+' },
              { label: 'Skills in Framework', value: '679' },
              { label: 'Duty Stations', value: '5+' },
              { label: 'Open Source Stack', value: '100%' },
            ].map((stat) => (
              <div key={stat.label} className="bg-card border border-border rounded-lg p-4">
                <div className="text-2xl font-bold text-primary">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Platform Modules */}
        <section className="print-page-break">
          <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
            <Layers className="h-6 w-6 text-primary" />
            Platform Modules
          </h2>
          <div className="space-y-6">
            {modules.map((mod) => (
              <Card key={mod.title} className="print-avoid-break">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <mod.icon className="h-5 w-5 text-primary flex-shrink-0" />
                    {mod.title}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">{mod.desc}</p>
                </CardHeader>
                <CardContent>
                  <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
                    {mod.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                        <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Technical Architecture */}
        <section className="print-page-break space-y-6">
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Server className="h-6 w-6 text-primary" />
            Technical Architecture
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="print-avoid-break">
              <CardHeader>
                <CardTitle className="text-base">Frontend</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p><strong className="text-foreground">Framework:</strong> React 18 with TypeScript</p>
                <p><strong className="text-foreground">Build Tool:</strong> Vite 5 (sub-second HMR)</p>
                <p><strong className="text-foreground">Styling:</strong> Tailwind CSS with custom design system</p>
                <p><strong className="text-foreground">Components:</strong> shadcn/ui (Radix UI primitives)</p>
                <p><strong className="text-foreground">State:</strong> TanStack React Query (server state caching)</p>
                <p><strong className="text-foreground">Routing:</strong> React Router v6</p>
                <p><strong className="text-foreground">Charts:</strong> Recharts (data visualization)</p>
              </CardContent>
            </Card>
            <Card className="print-avoid-break">
              <CardHeader>
                <CardTitle className="text-base">Backend & Infrastructure</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p><strong className="text-foreground">Database:</strong> PostgreSQL (via Supabase)</p>
                <p><strong className="text-foreground">Auth:</strong> Supabase Auth with MFA support</p>
                <p><strong className="text-foreground">API:</strong> Auto-generated REST + Realtime subscriptions</p>
                <p><strong className="text-foreground">Serverless:</strong> Supabase Edge Functions (Deno)</p>
                <p><strong className="text-foreground">Storage:</strong> Supabase Storage (S3-compatible)</p>
                <p><strong className="text-foreground">Email:</strong> Resend API for transactional email</p>
                <p><strong className="text-foreground">AI:</strong> Google Gemini for scoring & analysis</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Security & Compliance */}
        <section className="print-page-break space-y-6">
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Security & Compliance
          </h2>
          <Card className="print-avoid-break">
            <CardContent className="pt-6">
              <div className="grid sm:grid-cols-2 gap-6">
                {[
                  { title: 'Authentication', items: ['Email/password with MFA (TOTP)', 'Session management with JWT', 'Password reset with secure token flow', 'Role-based access control (RBAC)'] },
                  { title: 'Data Protection', items: ['Row-Level Security (RLS) on all tables', 'Data isolation between organizations', 'Encrypted storage for sensitive documents', 'HTTPS everywhere with TLS 1.3'] },
                  { title: 'Audit & Logging', items: ['Full audit trail for all data changes', 'Actor, action, before/after state capture', 'Email send logging with delivery status', 'Session and login event tracking'] },
                  { title: 'Access Control', items: ['Role hierarchy: Candidate → Staff → HR → Admin → Director', 'Duty-station-scoped local admin access', 'Review committee membership controls', 'Token-based access for external participants'] },
                ].map((section) => (
                  <div key={section.title} className="space-y-2">
                    <h3 className="font-semibold text-foreground">{section.title}</h3>
                    <ul className="space-y-1">
                      {section.items.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <ArrowRight className="h-3 w-3 mt-1 text-primary flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Open Source Foundation */}
        <section className="print-page-break space-y-6">
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Code className="h-6 w-6 text-primary" />
            Open Source Foundation
          </h2>
          <p className="text-muted-foreground">
            The platform is built entirely on open-source technologies, ensuring transparency, community support, and freedom from vendor lock-in.
          </p>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { cat: 'Core Framework', libs: ['React 18', 'TypeScript', 'Vite 5', 'React Router 6'] },
              { cat: 'UI & Design', libs: ['Tailwind CSS', 'Radix UI', 'shadcn/ui', 'Lucide Icons'] },
              { cat: 'Data & State', libs: ['TanStack React Query', 'Supabase JS', 'Zod', 'React Hook Form'] },
              { cat: 'Visualization', libs: ['Recharts', 'react-d3-tree', 'react-simple-maps'] },
              { cat: 'Documents', libs: ['SheetJS (xlsx)', 'react-pdf', 'html-to-image', 'DOMPurify'] },
              { cat: 'Utilities', libs: ['date-fns', 'Turndown', 'react-markdown', 'diff'] },
            ].map((group) => (
              <Card key={group.cat} className="print-avoid-break">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">{group.cat}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1">
                    {group.libs.map((lib) => (
                      <li key={lib} className="text-sm text-muted-foreground">{lib}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Deployment */}
        <section className="space-y-6 print-avoid-break">
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Globe className="h-6 w-6 text-primary" />
            Deployment & Scalability
          </h2>
          <Card>
            <CardContent className="pt-6 space-y-4 text-sm text-muted-foreground">
              <div>
                <h3 className="font-semibold text-foreground mb-1">Current Deployment</h3>
                <p>Hosted on AWS Amplify with Supabase cloud backend. Automatic CI/CD from GitHub with preview deployments per branch.</p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">Planned Migration</h3>
                <p>Migration to AWS EKS (Elastic Kubernetes Service) for containerized deployment with horizontal auto-scaling, blue/green deployments, and multi-region failover capabilities.</p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">Scalability</h3>
                <p>PostgreSQL with connection pooling supports thousands of concurrent users. Edge Functions scale to zero when idle and auto-scale under load. Static assets served via CDN for global low-latency access.</p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Footer */}
        <footer className="border-t border-border pt-6 text-center text-sm text-muted-foreground no-print">
          <p>UNIQTalent — Product Specification Document</p>
          <p className="mt-1">For questions, contact the HR Technology team.</p>
        </footer>
      </div>
    </div>
  );
};

export default ProductSpec;
