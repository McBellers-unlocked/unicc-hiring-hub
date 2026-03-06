import { Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Globe, 
  Heart, 
  Users, 
  GraduationCap, 
  Clock, 
  Home, 
  Plane, 
  BookOpen, 
  Shield, 
  Baby,
  Briefcase,
  ArrowRight,
  Quote,
  Sparkles,
  Target,
  Award,
  Building2,
  Laptop,
  Coffee,
  TreePine
} from 'lucide-react';

export default function LifeAtUNICC() {
  const coreValues = [
    {
      icon: Target,
      title: "Make Real Impact",
      description: "Deliver innovative technology solutions to the UN system that drive positive social impact and advance the Sustainable Development Goals.",
      color: "bg-blue-50 text-blue-600 border-blue-100"
    },
    {
      icon: Globe,
      title: "Global Career",
      description: "Work in a truly multicultural environment with colleagues from 100+ nationalities across 5 global offices.",
      color: "bg-purple-50 text-purple-600 border-purple-100"
    },
    {
      icon: Award,
      title: "Competitive Benefits",
      description: "Enjoy competitive salaries, tax exemption, UN pension, comprehensive health insurance, and generous leave policies.",
      color: "bg-emerald-50 text-emerald-600 border-emerald-100"
    },
    {
      icon: Heart,
      title: "Work-Life Balance",
      description: "Flexible working hours, remote work options, and up to 90 days of teleworking abroad per year.",
      color: "bg-yellow-50 text-yellow-600 border-yellow-100"
    }
  ];

  const howWeWork = [
    {
      icon: Sparkles,
      title: "Expertise",
      description: "Join a team of world-class experts delivering cutting-edge technology solutions to international organizations."
    },
    {
      icon: Laptop,
      title: "Work Environment",
      description: "Modern, flexible work arrangements with state-of-the-art tools and infrastructure."
    },
    {
      icon: GraduationCap,
      title: "Staff Development",
      description: "Continuous learning through training platforms, language courses, and up to 10 days study leave annually."
    },
    {
      icon: Users,
      title: "Culture & DEI",
      description: "Gender, diversity, and inclusiveness are central to our mission. Everyone has a voice."
    }
  ];

  const quickBenefits = [
    { icon: Home, label: "Remote work options" },
    { icon: Plane, label: "90 days telework abroad" },
    { icon: BookOpen, label: "10 days study leave" },
    { icon: Building2, label: "5 global offices" },
    { icon: Clock, label: "Flexible hours" },
    { icon: Coffee, label: "Work-life balance" }
  ];

  const generalStaffBenefits = {
    compensation: [
      "Competitive salaries",
      "Tax exemption",
      "Annual or bi-annual within-grade salary increase",
      "Active promotion system (4.5% promoted in 2022)",
      "Staff Health Insurance",
      "UN pension",
      "Accident coverage at workplace"
    ],
    development: [
      "Continuous career development attention",
      "Buddy system for onboarding",
      "Access to wide range of training platforms",
      "Language courses and allowance",
      "Up to 10 days study leave annually"
    ],
    workLife: [
      "Flexible working hours",
      "Work from home options",
      "Up to 90 calendar days teleworking outside duty station",
      "30 days annual leave (pro rata)",
      "Paid certified and uncertified sick leave",
      "In-house staff counselor"
    ],
    family: [
      "26 weeks parental leave for birth mothers (30 for multiple births)",
      "16 weeks parental leave for non-birth parents (18 for multiple births)",
      "Dependent's allowances"
    ]
  };

  const professionalStaffBenefits = {
    compensation: [
      "Competitive salaries",
      "Tax exemption",
      "Active promotion system (4.5% promoted in 2022)",
      "Worldwide staff health insurance for staff and family",
      "UN pension",
      "Relocation grant and rental subsidy",
      "Repatriation grant"
    ],
    development: [
      "Continuous career development attention",
      "Buddy system for onboarding",
      "Access to wide range of training platforms",
      "Up to 10 days study leave annually"
    ],
    workLife: [
      "Flexible working hours",
      "Work from home options",
      "90 calendar days teleworking outside duty station",
      "30 days annual leave (pro rata)",
      "Paid home leave for internationally recruited staff and family",
      "Paid certified and uncertified sick leave",
      "In-house staff counselor"
    ],
    family: [
      "26 weeks parental leave for birth mothers (30 for multiple births)",
      "16 weeks parental leave for non-birth parents (18 for multiple births)",
      "Education grants for children",
      "Dependency allowances for children and spouse"
    ]
  };

  const internBenefits = {
    compensation: [
      "Paid internship",
      "Accident coverage at workplace"
    ],
    development: [
      "Continuous career development attention",
      "Support with onboarding and knowledge sharing",
      "Access to wide range of training platforms"
    ],
    workLife: [
      "Flexible working hours",
      "Working from home options",
      "Part-time modality (depending on requirements)",
      "Paid leave",
      "Paid certified sick leave"
    ],
    culture: [
      "Rewarding work with real impact",
      "Multicultural environment",
      "Kickstart your global career",
      "Work with a truly diverse group of people"
    ]
  };

  const BenefitSection = ({ title, items, icon: Icon }: { title: string; items: string[]; icon: React.ElementType }) => (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5 text-primary" />
        <h4 className="font-semibold text-foreground">{title}</h4>
      </div>
      <ul className="space-y-2">
        {items.map((item, idx) => (
          <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
            <span className="text-primary mt-1">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-primary via-primary to-primary/90 text-primary-foreground py-20 overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDJ2LTJoMzR6bTAtNHYySDF2LTJoMzV6bTAtNHYySDB2LTJoMzZ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30"></div>
          <div className="container mx-auto px-4 relative">
            <div className="max-w-4xl mx-auto text-center">
              <Badge variant="secondary" className="mb-6 bg-primary-foreground/20 text-primary-foreground border-0">
                <Sparkles className="w-3 h-3 mr-1" />
                Join Our Team
              </Badge>
              <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
                Technology for a Better World
              </h1>
              <p className="text-xl text-primary-foreground/90 mb-8 leading-relaxed max-w-3xl mx-auto">
                At UNICC we believe that technology can change the world for the better. Our mission is to empower people 
                and UN organizations with innovative technology solutions that drive positive social impact and advance 
                the agenda of the Sustainable Development Goals.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" variant="secondary" asChild>
                  <Link to="/jobs" className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5" />
                    Explore Open Positions
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10" asChild>
                  <Link to="/hiring-guide">
                    Learn About Our Hiring Process
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Benefits Bar */}
        <section className="bg-muted/50 border-b">
          <div className="container mx-auto px-4 py-6">
            <div className="flex flex-wrap justify-center gap-6 md:gap-10">
              {quickBenefits.map((benefit, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <benefit.icon className="h-4 w-4 text-primary" />
                  <span>{benefit.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Core Values */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-foreground mb-4">Why Work with UNICC</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                We are committed to creating a work environment that supports our employees in achieving their personal 
                and professional goals, while also contributing to our shared purpose.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {coreValues.map((value, idx) => (
                <Card key={idx} className={`${value.color} border-2 hover:shadow-lg transition-shadow`}>
                  <CardHeader className="pb-3">
                    <div className="p-3 rounded-lg bg-white/50 w-fit mb-3">
                      <value.icon className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-lg">{value.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm opacity-80">{value.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* How We Work */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-foreground mb-4">How We Work</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                In service of humanity and the planet, we foster an environment where innovation thrives.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {howWeWork.map((item, idx) => (
                <Card key={idx} className="text-center hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="mx-auto p-4 rounded-full bg-primary/10 w-fit mb-2">
                      <item.icon className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{item.description}</CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits by Role - Tabbed */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-foreground mb-4">Benefits by Role</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                We offer comprehensive benefits packages tailored to different staff categories.
              </p>
            </div>
            
            <Tabs defaultValue="general" className="max-w-5xl mx-auto">
              <TabsList className="grid w-full grid-cols-3 mb-8">
                <TabsTrigger value="general" className="text-sm">General Staff (G)</TabsTrigger>
                <TabsTrigger value="professional" className="text-sm">Professional (P/D)</TabsTrigger>
                <TabsTrigger value="intern" className="text-sm">Interns</TabsTrigger>
              </TabsList>
              
              <TabsContent value="general">
                <Card>
                  <CardHeader>
                    <CardTitle>General Services Staff Benefits</CardTitle>
                    <CardDescription>
                      Comprehensive benefits for our General Services category staff members.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-8">
                      <BenefitSection title="Compensation" items={generalStaffBenefits.compensation} icon={Award} />
                      <BenefitSection title="Career Development" items={generalStaffBenefits.development} icon={GraduationCap} />
                      <BenefitSection title="Work-Life Balance" items={generalStaffBenefits.workLife} icon={Clock} />
                      <BenefitSection title="Family Support" items={generalStaffBenefits.family} icon={Baby} />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="professional">
                <Card>
                  <CardHeader>
                    <CardTitle>Professional & Higher Categories Benefits</CardTitle>
                    <CardDescription>
                      Enhanced benefits for Professional (P) and Director (D) level staff.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-8">
                      <BenefitSection title="Compensation" items={professionalStaffBenefits.compensation} icon={Award} />
                      <BenefitSection title="Career Development" items={professionalStaffBenefits.development} icon={GraduationCap} />
                      <BenefitSection title="Work-Life Balance" items={professionalStaffBenefits.workLife} icon={Clock} />
                      <BenefitSection title="Family Support" items={professionalStaffBenefits.family} icon={Baby} />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="intern">
                <Card>
                  <CardHeader>
                    <CardTitle>Internship Benefits</CardTitle>
                    <CardDescription>
                      Kickstart your international career with our paid internship programme.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-8">
                      <BenefitSection title="Compensation" items={internBenefits.compensation} icon={Award} />
                      <BenefitSection title="Career Development" items={internBenefits.development} icon={GraduationCap} />
                      <BenefitSection title="Flexibility" items={internBenefits.workLife} icon={Clock} />
                      <BenefitSection title="Culture" items={internBenefits.culture} icon={Users} />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </section>

        {/* Leadership Quote */}
        <section className="py-16 bg-gradient-to-br from-primary/5 to-primary/10">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <Card className="border-0 shadow-xl bg-card">
                <CardContent className="p-8 md:p-12">
                  <div className="flex flex-col md:flex-row gap-8 items-center">
                    <div className="shrink-0">
                      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                        <Quote className="h-10 w-10 text-primary" />
                      </div>
                    </div>
                    <div>
                      <blockquote className="text-lg md:text-xl text-foreground italic mb-6 leading-relaxed">
                        "At UNICC people know they belong because they are seen and heard. We engage with staff, 
                        we run participative sessions; everyone can have a say in our open, interactive and honest 
                        all-personnel meetings."
                      </blockquote>
                      <div>
                        <p className="font-semibold text-foreground">Milena Grecuccio</p>
                        <p className="text-sm text-muted-foreground">Chief of Staff and Chief, Management and Strategy Division</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Diversity & Inclusion */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-6">
                <TreePine className="h-4 w-4" />
                <span className="text-sm font-medium">Diversity & Inclusion</span>
              </div>
              <h2 className="text-3xl font-bold text-foreground mb-6">
                UNICC has made gender, diversity, and inclusiveness central to its mission
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                We believe that diverse teams drive innovation and better outcomes. Our commitment to inclusion 
                ensures that everyone has an equal opportunity to contribute and grow.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Badge variant="outline" className="text-sm py-2 px-4">Equal Opportunity Employer</Badge>
                <Badge variant="outline" className="text-sm py-2 px-4">100+ Nationalities</Badge>
                <Badge variant="outline" className="text-sm py-2 px-4">Gender Initiatives</Badge>
                <Badge variant="outline" className="text-sm py-2 px-4">Inclusive Workplace</Badge>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl font-bold mb-6">Ready to Make an Impact?</h2>
              <p className="text-xl text-primary-foreground/90 mb-8">
                Join our team and help shape the future of technology for the United Nations system.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" variant="secondary" asChild>
                  <Link to="/jobs" className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5" />
                    View Open Positions
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10" asChild>
                  <a href="mailto:personnel@unicc.org">
                    Contact HR Team
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}
