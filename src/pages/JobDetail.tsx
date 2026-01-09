import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, MapPin, Calendar, Briefcase, Users, ExternalLink, Share2 } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';
import { fixMarkdownFormatting } from '@/lib/utils';

interface Job {
  id: string;
  title: string;
  slug: string;
  notice_no: string;
  category: string;
  type: string;
  grade: string;
  salary_estimate: string;
  location: string;
  org_unit: string;
  positions: number;
  issue_date: string;
  closing_date: string;
  description_md: string;
  requirements_md: string;
  language_requirements: string;
  competencies: string;
  eligibility_note: string;
  privacy_notice_url: string;
  branding: any;
  attachments_required: any;
  created_at: string;
  internal_only: boolean;
}

interface JobCompetency {
  id: string;
  competency_name: string;
  competency_type: string;
  description: string;
  order_index: number;
}

export default function JobDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [competencies, setCompetencies] = useState<JobCompetency[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (slug) {
      fetchJob();
    }
  }, [slug]);

  const fetchJob = async () => {
    try {
      // Check if user is authenticated and get their email
      const { data: { user } } = await supabase.auth.getUser();
      const isInternalUser = user?.email?.endsWith('@unicc.org');

      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'active')
        .maybeSingle();

      if (error) throw error;
      
      // If job is internal-only and user is not internal, show access restricted
      if (data && data.internal_only && !isInternalUser) {
        setJob(data);
        toast({
          title: "Internal Position",
          description: "This position is only open to internal UNICC staff. Sign in with your @unicc.org email to apply.",
          variant: "default"
        });
      } else {
        setJob(data);
      }

      // Fetch competencies for this job
      if (data?.id) {
        const { data: compData, error: compError } = await supabase
          .from('job_competencies')
          .select('*')
          .eq('job_id', data.id)
          .order('order_index', { ascending: true });
        
        if (!compError && compData) {
          setCompetencies(compData);
        }
      }
    } catch (error) {
      console.error('Error fetching job:', error);
      toast({
        title: "Job not found",
        description: "The job you're looking for could not be found or is no longer active.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: job?.title,
          text: `Check out this job opportunity at UNICC: ${job?.title}`,
          url: window.location.href,
        });
      } catch (error) {
        // User cancelled sharing
      }
    } else {
      // Fallback to copying URL
      await navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copied",
        description: "Job link has been copied to your clipboard.",
      });
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <Skeleton className="h-8 w-32 mb-6" />
            <Card>
              <CardHeader>
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
    );
  }

  if (!job) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-2xl font-bold mb-4">Job Not Found</h1>
            <p className="text-muted-foreground mb-6">
              The job you're looking for could not be found or is no longer active.
            </p>
            <Link to="/jobs">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Jobs
              </Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  const isClosingSoon = job.closing_date && new Date(job.closing_date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const isClosed = job.closing_date && new Date(job.closing_date) < new Date();

  // Structured Data for SEO
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    "title": job.title,
    "description": job.description_md || "Join UNICC and make a difference in international cooperation.",
    "identifier": {
      "@type": "PropertyValue",
      "name": "UNICC",
      "value": job.notice_no || job.id
    },
    "datePosted": job.created_at,
    "validThrough": job.closing_date,
    "employmentType": job.type || "FULL_TIME",
    "hiringOrganization": {
      "@type": "Organization",
      "name": "United Nations International Computing Centre (UNICC)",
      "sameAs": "https://www.unicc.org"
    },
    "jobLocation": {
      "@type": "Place",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": job.location
      }
    },
    "baseSalary": job.salary_estimate ? {
      "@type": "MonetaryAmount",
      "currency": "USD",
      "value": {
        "@type": "QuantitativeValue",
        "description": job.salary_estimate
      }
    } : undefined,
    "qualifications": job.requirements_md,
    "responsibilities": job.description_md
  };

  return (
    <Layout>
      {/* SEO Head */}
      <title>{job.title} - UNICC Career Opportunities</title>
      <meta name="description" content={job.description_md?.substring(0, 160) || `${job.title} at UNICC. Join our international team.`} />
      <meta property="og:title" content={`${job.title} - UNICC`} />
      <meta property="og:description" content={job.description_md?.substring(0, 160) || `${job.title} at UNICC. Join our international team.`} />
      <meta property="og:type" content="article" />
      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>

      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            {/* Back Button */}
            <Link to="/jobs" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Jobs
            </Link>

            {/* Job Header */}
            <Card className="mb-8">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-3xl mb-2">{job.title}</CardTitle>
                    {job.notice_no && (
                      <p className="text-muted-foreground mb-4">Notice No: {job.notice_no}</p>
                    )}
                  </div>
                  <Button variant="outline" size="sm" onClick={handleShare}>
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                  {job.location && (
                    <div className="flex items-center text-muted-foreground">
                      {(() => {
                        // Handle both JSON array format and string format for location
                        let locations = [];
                        
                        if (typeof job.location === 'string') {
                          try {
                            // Try to parse as JSON first (for converted jobs)
                            const parsed = JSON.parse(job.location);
                            if (Array.isArray(parsed)) {
                              // Map common locations to countries for converted jobs
                              const locationMap: Record<string, string> = {
                                'Geneva': 'Switzerland',
                                'Valencia': 'Spain',
                                'New York': 'USA',
                                'Brindisi': 'Italy',
                                'Rome': 'Italy'
                              };
                              
                              locations = parsed.map(city => ({
                                city: city,
                                country: locationMap[city] || 'International'
                              }));
                            } else {
                              // Single location from JSON
                              const city = String(parsed);
                              const locationMap: Record<string, string> = {
                                'Geneva': 'Switzerland',
                                'Valencia': 'Spain',
                                'New York': 'USA',
                                'Brindisi': 'Italy',
                                'Rome': 'Italy'
                              };
                              locations = [{ city: city, country: locationMap[city] || 'International' }];
                            }
                          } catch {
                            // Check if it's a single city name (for converted jobs)
                            const locationMap: Record<string, string> = {
                              'Geneva': 'Switzerland',
                              'Valencia': 'Spain',
                              'New York': 'USA',
                              'Brindisi': 'Italy',
                              'Rome': 'Italy'
                            };
                            
                            if (locationMap[job.location]) {
                              locations = [{ city: job.location, country: locationMap[job.location] }];
                            } else {
                              // Parse as comma-separated string of cities
                              const cities = job.location.split(',').map(city => city.trim()).filter(Boolean);
                              locations = cities.map(city => ({
                                city: city,
                                country: locationMap[city] || 'International'
                              }));
                            }
                          }
                        }

                        // Map countries to ISO country codes for flag API
                        const getCountryCode = (country: string) => {
                          const countryMap: Record<string, string> = {
                            'USA': 'us',
                            'Switzerland': 'ch',
                            'Spain': 'es',
                            'Italy': 'it',
                            'France': 'fr',
                            'Germany': 'de',
                            'UK': 'gb',
                            'United Kingdom': 'gb',
                            'Netherlands': 'nl',
                            'Belgium': 'be',
                            'Austria': 'at',
                            'Canada': 'ca',
                            'Australia': 'au',
                            'Japan': 'jp',
                            'South Korea': 'kr',
                            'Brazil': 'br',
                            'Mexico': 'mx',
                            'India': 'in',
                            'China': 'cn',
                            'Russia': 'ru',
                            'Norway': 'no',
                            'Sweden': 'se',
                            'Denmark': 'dk',
                            'Finland': 'fi'
                          };
                          return countryMap[country] || null;
                        };

                        return locations.map((location, index) => {
                          const countryCode = getCountryCode(location.country);
                          return (
                            <span key={index} className="flex items-center">
                              {countryCode ? (
                                <img 
                                  src={`https://flagcdn.com/w20/${countryCode}.png`}
                                  alt={`${location.country} flag`}
                                  className="w-4 h-3 mr-1 object-cover rounded-sm"
                                  onError={(e) => {
                                    // Hide flag if it fails to load
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              ) : (
                                <span className="w-4 mr-1">🌍</span>
                              )}
                              <span>{location.city}</span>
                              {index < locations.length - 1 && <span className="mx-2">•</span>}
                            </span>
                          );
                        });
                      })()}
                    </div>
                  )}

                  {job.org_unit && (
                    <div className="flex items-center text-muted-foreground">
                      <Briefcase className="h-4 w-4 mr-2" />
                      {job.org_unit}
                    </div>
                  )}

                  {job.positions > 1 && (
                    <div className="flex items-center text-muted-foreground">
                      <Users className="h-4 w-4 mr-2" />
                      {job.positions} positions
                    </div>
                  )}

                  {job.issue_date && (
                    <div className="flex items-center text-muted-foreground">
                      <Calendar className="h-4 w-4 mr-2" />
                      Posted {format(new Date(job.issue_date), 'dd/MM/yyyy')}
                    </div>
                  )}

                  {job.closing_date && (
                    <div className="flex items-center text-muted-foreground">
                      <Calendar className="h-4 w-4 mr-2" />
                      {isClosed ? 'Closed' : `Closes ${formatDistanceToNow(new Date(job.closing_date), { addSuffix: true })}`}
                    </div>
                  )}

                  {job.salary_estimate && (
                    <div className="flex items-center text-muted-foreground">
                      <span>Salary: {job.salary_estimate}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 mt-4">
                  {job.internal_only && <Badge variant="default">Internal Only</Badge>}
                  {job.type && <Badge variant="outline">{job.type}</Badge>}
                  {job.grade && <Badge variant="outline">{job.grade}</Badge>}
                  {isClosingSoon && !isClosed && <Badge variant="destructive">Closing Soon</Badge>}
                  {isClosed && <Badge variant="secondary">Closed</Badge>}
                </div>
              </CardHeader>

              <CardContent>
                {job.internal_only && (
                  <div className="bg-muted p-4 rounded-lg mb-4">
                    <p className="text-sm text-muted-foreground">
                      <strong>Internal Position:</strong> This position is only open to UNICC staff members. 
                      You must sign in with your @unicc.org email address to apply.
                    </p>
                  </div>
                )}
                {!isClosed && (
                  <Button 
                    size="lg" 
                    className="w-full mb-6"
                    onClick={() => navigate(`/apply/${job.id}`)}
                  >
                    Apply for this Position
                  </Button>
                )}

                {isClosed && (
                  <div className="bg-muted p-4 rounded-lg mb-6 text-center">
                    <p className="text-muted-foreground">
                      This position is no longer accepting applications.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Job Details */}
            <div className="space-y-8">
              {job.description_md && (
                <Card>
                  <CardHeader>
                    <CardTitle>Job Description</CardTitle>
                  </CardHeader>
                  <CardContent className="overflow-hidden">
                    <div className="prose prose-sm max-w-none break-words overflow-hidden">
                      <ReactMarkdown 
                        components={{
                          h1: ({ children }) => <h1 className="text-lg font-semibold mb-2 border-b pb-1 break-words">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-base font-semibold mb-2 border-b pb-1 break-words">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 break-words">{children}</h3>,
                          ul: ({ children }) => <ul className="list-disc ml-4 space-y-1">{children}</ul>,
                          li: ({ children }) => <li className="text-sm break-words">{children}</li>,
                          p: ({ children }) => <p className="mb-2 text-sm break-words">{children}</p>,
                          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                          code: ({ children }) => <span className="font-sans text-sm break-words">{children}</span>,
                          pre: ({ children }) => <div className="font-sans text-sm break-words whitespace-pre-wrap">{children}</div>
                        }}
                      >
                        {fixMarkdownFormatting(job.description_md)}
                      </ReactMarkdown>
                    </div>
                  </CardContent>
                </Card>
              )}

              {job.requirements_md && (
                <Card>
                  <CardHeader>
                    <CardTitle>Requirements</CardTitle>
                  </CardHeader>
                  <CardContent className="overflow-hidden">
                    <div className="prose prose-sm max-w-none break-words overflow-hidden">
                      <ReactMarkdown 
                        components={{
                          h1: ({ children }) => <h1 className="text-lg font-semibold mb-2 border-b pb-1 break-words">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-base font-semibold mb-2 border-b pb-1 break-words">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 break-words">{children}</h3>,
                          ul: ({ children }) => <ul className="list-disc ml-4 space-y-1">{children}</ul>,
                          li: ({ children }) => <li className="text-sm break-words">{children}</li>,
                          p: ({ children }) => <p className="mb-2 text-sm break-words">{children}</p>,
                          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                          code: ({ children }) => <span className="font-sans text-sm break-words">{children}</span>,
                          pre: ({ children }) => <div className="font-sans text-sm break-words whitespace-pre-wrap">{children}</div>
                        }}
                      >
                        {fixMarkdownFormatting(job.requirements_md)}
                      </ReactMarkdown>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Competencies */}
              {competencies.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Competencies</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {(() => {
                        // Group competencies by type
                        const grouped = competencies.reduce((acc, comp) => {
                          if (!acc[comp.competency_type]) {
                            acc[comp.competency_type] = [];
                          }
                          acc[comp.competency_type].push(comp);
                          return acc;
                        }, {} as Record<string, JobCompetency[]>);

                        // Define order for competency types
                        const typeOrder = ['Core', 'Management', 'Leadership'];
                        
                        return typeOrder
                          .filter(type => grouped[type])
                          .map(type => (
                            <div key={type}>
                              <h3 className="text-base font-semibold mb-3 border-b pb-1">{type} Competencies</h3>
                              <ul className="space-y-2">
                                {grouped[type].map(comp => (
                                  <li key={comp.id} className="text-sm">
                                    <strong>{comp.competency_name}</strong>
                                    {comp.description && (
                                      <span className="text-muted-foreground">: {comp.description}</span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ));
                      })()}
                    </div>
                  </CardContent>
                </Card>
              )}

              {job.language_requirements && (
                <Card>
                  <CardHeader>
                    <CardTitle>Language Requirements</CardTitle>
                  </CardHeader>
                  <CardContent className="overflow-hidden">
                    <div className="prose prose-sm max-w-none break-words overflow-hidden">
                      {(() => {
                        const lines = job.language_requirements
                          .replace(/<br\s*\/?>/gi, '\n')
                          .split('\n')
                          .map(line => line.trim())
                          .filter(line => {
                            if (!line) return false;
                            const cleanLine = line.replace(/^[•\-#\s]+/, '').toLowerCase().trim();
                            // Filter out internal field names, boolean values, headers, and section labels
                            return !cleanLine.includes('additional_languages') &&
                                   !cleanLine.includes('local_language_advantage') &&
                                   !cleanLine.includes('un_language_advantage') &&
                                   !cleanLine.match(/^(true|false)$/i) &&
                                   cleanLine !== 'language requirements' &&
                                   cleanLine !== 'language requirements:' &&
                                   cleanLine !== 'required language skills' &&
                                   cleanLine !== 'additional language skills';
                          })
                          .map(line => {
                            // Remove markdown headers and ensure bullet
                            line = line.replace(/^#+\s*/, '').replace(/^-\s*/, '').trim();
                            
                            // Format language entries: convert "Language: level" to "Language: Level knowledge is required"
                            const langMatch = line.match(/^([^:]+):\s*(.+)$/);
                            if (langMatch) {
                              const [, lang, level] = langMatch;
                              const langName = lang.replace(/\*\*/g, '').trim();
                              const levelText = level.trim().toLowerCase();
                              
                              // Check if already formatted
                              if (levelText.includes('knowledge is required') || levelText.includes('would be an advantage')) {
                                return `• ${langName}: ${level.trim().charAt(0).toUpperCase() + level.trim().slice(1)}`;
                              }
                              
                              // Format the level
                              let formattedLevel = '';
                              if (levelText === 'expert') {
                                formattedLevel = 'Expert knowledge is required';
                              } else if (levelText === 'intermediate' || levelText === 'working') {
                                formattedLevel = 'Intermediate knowledge is required';
                              } else if (levelText === 'basic' || levelText === 'beginner') {
                                formattedLevel = 'Basic knowledge is required';
                              } else {
                                formattedLevel = level.trim().charAt(0).toUpperCase() + level.trim().slice(1);
                              }
                              
                              return `• ${langName}: ${formattedLevel}`;
                            }
                            
                            return line.startsWith('•') ? line : `• ${line}`;
                          });

                        // Add duty station language requirement for G positions
                        if (job.grade && job.grade.match(/^G[-\s]?\d+$/i)) {
                          lines.push('• Knowledge of the local language of the Duty Station would be an advantage');
                        }

                        return (
                          <div 
                            dangerouslySetInnerHTML={{ 
                              __html: lines
                                .join('<br>')
                                .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
                                .replace(/(<br>\s*){3,}/g, '<br><br>')
                            }}
                          />
                        );
                      })()}
                    </div>
                  </CardContent>
                </Card>
              )}

              {job.eligibility_note && (
                <Card>
                  <CardHeader>
                    <CardTitle>Eligibility</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{job.eligibility_note}</p>
                  </CardContent>
                </Card>
              )}

              {job.attachments_required && Object.keys(job.attachments_required).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Required Documents</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      {Object.entries(job.attachments_required).map(([key, required]) => 
                        required && (
                          <li key={key} className="capitalize">
                            {key.replace('_', ' ')}
                          </li>
                        )
                      )}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Privacy Notice */}
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-4">
                      By applying for this position, you acknowledge that you have read and understood our privacy notice.
                    </p>
                    <a
                      href={job.privacy_notice_url || 'https://www.unicc.org/unicc-privacy-notice-for-applicants/'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-primary hover:underline"
                    >
                      Privacy Notice for Applicants
                      <ExternalLink className="h-4 w-4 ml-1" />
                    </a>
                  </div>
                </CardContent>
              </Card>

              {/* Apply Button Bottom */}
              {!isClosed && (
                <div className="text-center">
                  <Button 
                    size="lg" 
                    className="px-12"
                    onClick={() => navigate(`/apply/${job.id}`)}
                  >
                    Apply for this Position
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}