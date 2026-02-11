import { Link } from 'react-router-dom';
import { ArrowLeft, Building2, FileText, Video, Users, Clock, Star, Mail, HelpCircle, Lightbulb, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { Layout } from '@/components/Layout';

export default function HiringProcessGuide() {
  const [openSections, setOpenSections] = useState<string[]>(['process']);

  const toggleSection = (section: string) => {
    setOpenSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const stages = [
    { 
      key: 'applied', 
      label: 'Applied', 
      icon: FileText, 
      color: 'bg-slate-100 text-slate-700 border-slate-200',
      description: 'Your application is received and under review'
    },
    { 
      key: 'video', 
      label: 'Video Interview/Written Assessment', 
      icon: Video, 
      color: 'bg-blue-100 text-blue-700 border-blue-200',
      description: 'Complete a short recorded video interview'
    },
    { 
      key: 'interview', 
      label: 'Interview', 
      icon: Users, 
      color: 'bg-purple-100 text-purple-700 border-purple-200',
      description: 'Meet with our panel for a live interview'
    }
  ];

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="sm"
            asChild
          >
            <Link to="/my-applications" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Hiring Process Guide</h1>
            <p className="text-muted-foreground">Everything you need to know about our selection process</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* About UNICC */}
          <Collapsible open={openSections.includes('about')} onOpenChange={() => toggleSection('about')}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-100">
                        <Building2 className="h-5 w-5 text-blue-600" />
                      </div>
                      <CardTitle className="text-lg">About UNICC</CardTitle>
                    </div>
                    <HelpCircle className={`h-5 w-5 text-muted-foreground transition-transform ${openSections.includes('about') ? 'rotate-180' : ''}`} />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <p className="text-muted-foreground leading-relaxed">
                    The United Nations International Computing Centre (UNICC) provides shared ICT services to the United Nations system organizations. 
                    We are committed to finding talented individuals who share our values and can contribute to our mission of supporting global development goals through technology.
                  </p>
                  <p className="text-muted-foreground leading-relaxed mt-3">
                    Discover more about our work at{' '}
                    <a href="https://www.unicc.org" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      www.unicc.org
                    </a>
                  </p>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Selection Process */}
          <Collapsible open={openSections.includes('process')} onOpenChange={() => toggleSection('process')}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-purple-100">
                        <FileText className="h-5 w-5 text-purple-600" />
                      </div>
                      <CardTitle className="text-lg">Our Selection Process</CardTitle>
                    </div>
                    <HelpCircle className={`h-5 w-5 text-muted-foreground transition-transform ${openSections.includes('process') ? 'rotate-180' : ''}`} />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 space-y-6">
                  <p className="text-muted-foreground">
                    Our hiring process consists of three main stages designed to help us get to know you better:
                  </p>
                  
                  {/* Visual Timeline */}
                  <div className="flex items-center justify-between relative">
                    
                    
                    {stages.map((stage, index) => (
                      <div key={stage.key} className="flex flex-col items-center relative z-10 flex-1">
                        <div className={`w-12 h-12 rounded-full ${stage.color} border-2 flex items-center justify-center mb-2 bg-white`}>
                          <stage.icon className="h-5 w-5" />
                        </div>
                        <span className="font-medium text-sm text-center">{stage.label}</span>
                        <span className="text-xs text-muted-foreground text-center mt-1 max-w-[120px]">{stage.description}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Video Interview/Written Assessment */}
          <Collapsible open={openSections.includes('video')} onOpenChange={() => toggleSection('video')}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-100">
                        <Video className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Video Interview/Written Assessment</CardTitle>
                        <CardDescription>What to expect and how to prepare</CardDescription>
                      </div>
                    </div>
                    <HelpCircle className={`h-5 w-5 text-muted-foreground transition-transform ${openSections.includes('video') ? 'rotate-180' : ''}`} />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Clock className="h-4 w-4 text-blue-600" />
                        What is an Asynchronous Interview?
                      </h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• You will record your responses at your own convenience — it is not a real-time interview</li>
                        <li>• Questions are presented one at a time on screen</li>
                        <li>• You will have a restricted reading/preparation time before recording</li>
                        <li>• Each answer has a specific recording time (typically 2–3 minutes)</li>
                      </ul>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-green-600" />
                        Recording Your Responses — Do's
                      </h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Dress appropriately as you would for an in-person interview</li>
                        <li>• Ensure you are in a quiet space with good lighting</li>
                        <li>• Look directly at the camera when speaking</li>
                        <li>• Be clear, concise and structured in your answers</li>
                        <li>• Relax, breathe, and take a moment before you begin recording</li>
                      </ul>
                    </div>
                    <div className="p-4 bg-red-50 rounded-lg border border-red-100">
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        Recording Your Responses — Don'ts
                      </h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Do not use your monitor as a light source — use natural or overhead lighting</li>
                        <li>• Do not click pens, tap fingers, or create distracting background noise</li>
                        <li>• Do not feel obligated to use the full allotted time if you've answered the question</li>
                        <li>• Do not rely on AI or chat tools such as ChatGPT to generate your responses</li>
                      </ul>
                    </div>
                    <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-100">
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-yellow-600" />
                        Preparation and Tips
                      </h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Find a quiet, well-lit space and test your camera and microphone beforehand</li>
                        <li>• Review the job description and competencies required for the role</li>
                        <li>• Complete the interview within the specified timeframe provided in your invitation</li>
                        <li>• Plan accordingly — you may not be able to pause or restart once you begin</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Panel Interview */}
          <Collapsible open={openSections.includes('panel')} onOpenChange={() => toggleSection('panel')}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-purple-100">
                        <Users className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Panel Interview</CardTitle>
                        <CardDescription>Meet our interview panel</CardDescription>
                      </div>
                    </div>
                    <HelpCircle className={`h-5 w-5 text-muted-foreground transition-transform ${openSections.includes('panel') ? 'rotate-180' : ''}`} />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 space-y-4">
                  <p className="text-muted-foreground">
                    Our panel interviews are competency-based — past behaviors and experience are the best indicators of future performance. You'll be asked to draw from real-life examples to demonstrate specific competencies.
                  </p>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Clock className="h-4 w-4 text-purple-600" />
                        Format
                      </h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• 45–60 minutes duration</li>
                        <li>• Typically 3–4 panel members</li>
                        <li>• Competency-based and behavioral questions</li>
                        <li>• Video conference or in-person</li>
                      </ul>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-blue-600" />
                        Tips: Before Your Interview
                      </h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Prepare an introduction that emphasizes your background and why you're a strong fit for the role</li>
                        <li>• Prepare real-life examples of accomplishments related to the competencies in the vacancy announcement</li>
                        <li>• Ask a friend to do a mock interview and give feedback, or record yourself practising</li>
                        <li>• Review the competencies in the job opening — these will be probed during your interview</li>
                        <li>• Research the department and office you're applying to</li>
                        <li>• Ensure a reliable internet connection, working camera and sound, and a suitable background</li>
                      </ul>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-green-600" />
                        Tips: During Your Interview
                      </h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Listen to the question carefully — keep to the point and be as specific as possible</li>
                        <li>• Structure your answers using the STAR method (Situation, Task, Action, Result)</li>
                        <li>• Be ready to discuss your strengths and your ability to learn from past experiences</li>
                        <li>• Be mindful of time — aim for around 3 minutes per response to maintain the panel's attention</li>
                        <li>• Stay relaxed and composed — take deep breaths to ease any nervousness</li>
                      </ul>
                    </div>
                    <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                        Common Pitfalls to Avoid
                      </h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Being too vague or theoretical — use specific, recent, relevant examples</li>
                        <li>• Describing what the team did instead of your personal role and contribution</li>
                        <li>• Forgetting the "Result" part of your STAR answer</li>
                        <li>• Giving generic examples that don't relate to the competencies</li>
                      </ul>
                    </div>
                    <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100 md:col-span-2">
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <HelpCircle className="h-4 w-4 text-indigo-600" />
                        Example Competency-Based Questions
                      </h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Can you give an example of a time when you used your problem-solving abilities to resolve an issue?</li>
                        <li>• Can you tell us about a time where you had a number of demands being made on you at the same time? How did you handle it?</li>
                        <li>• Can you tell us about a challenging assignment, when you went above and beyond your manager's expectations?</li>
                        <li>• Can you give an example of a time when you used your teamworking abilities to resolve an issue between staff members?</li>
                        <li>• Can you give an example of a time when you handled conflicting deadlines?</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* STAR Method */}
          <Collapsible open={openSections.includes('star')} onOpenChange={() => toggleSection('star')}>
            <Card className="border-amber-200 bg-amber-50/50">
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-amber-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-amber-100">
                        <Star className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Interview Tip: The STAR Method</CardTitle>
                        <CardDescription>Structure your answers for impact</CardDescription>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-amber-100 text-amber-700">Recommended</Badge>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 space-y-4">
                  <p className="text-muted-foreground">
                    Use the STAR method to structure your responses to behavioral questions:
                  </p>
                  <div className="grid gap-3">
                    {[
                      { letter: 'S', word: 'Situation', description: 'Describe the context and background' },
                      { letter: 'T', word: 'Task', description: 'Explain your responsibility or goal' },
                      { letter: 'A', word: 'Action', description: 'Detail the specific steps you took' },
                      { letter: 'R', word: 'Result', description: 'Share the outcome and what you learned' }
                    ].map((item) => (
                      <div key={item.letter} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-amber-100">
                        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center font-bold text-amber-700 shrink-0">
                          {item.letter}
                        </div>
                        <div>
                          <span className="font-medium">{item.word}</span>
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Timelines */}
          <Collapsible open={openSections.includes('timelines')} onOpenChange={() => toggleSection('timelines')}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-green-100">
                        <Clock className="h-5 w-5 text-green-600" />
                      </div>
                      <CardTitle className="text-lg">Typical Timelines</CardTitle>
                    </div>
                    <HelpCircle className={`h-5 w-5 text-muted-foreground transition-transform ${openSections.includes('timelines') ? 'rotate-180' : ''}`} />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 font-medium">Stage</th>
                          <th className="text-left py-2 font-medium">Typical Duration</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b">
                          <td className="py-2">Application Review</td>
                          <td className="py-2 text-muted-foreground">2-4 weeks after closing date</td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-2">Video Interview/Written Assessment Deadline</td>
                          <td className="py-2 text-muted-foreground">Usually 7 days from invitation</td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-2">Panel Interview Scheduling</td>
                          <td className="py-2 text-muted-foreground">1-2 weeks after video review</td>
                        </tr>
                        <tr>
                          <td className="py-2">Final Decision</td>
                          <td className="py-2 text-muted-foreground">2-4 weeks after interviews</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-muted-foreground mt-4">
                    Note: Timelines may vary depending on the position and number of applicants.
                  </p>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Contact */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Questions?</CardTitle>
                  <CardDescription>We're here to help</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-3">
                If you have any questions about the recruitment process, please contact our HR team:
              </p>
              <a 
                href="mailto:personnel@unicc.org" 
                className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
              >
                <Mail className="h-4 w-4" />
                personnel@unicc.org
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
