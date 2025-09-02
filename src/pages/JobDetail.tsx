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
  eligibility_note: string;
  privacy_notice_url: string;
  branding: any;
  attachments_required: any;
  created_at: string;
}

export default function JobDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (slug) {
      fetchJob();
    }
  }, [slug]);

  const fetchJob = async () => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .or(`slug.eq.${slug},id.eq.${slug}`)
        .eq('status', 'active')
        .single();

      if (error) throw error;
      setJob(data);
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
                      <MapPin className="h-4 w-4 mr-2" />
                      {job.location}
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
                      Posted {format(new Date(job.issue_date), 'MMM d, yyyy')}
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
                  {job.category && <Badge variant="outline">{job.category}</Badge>}
                  {job.type && <Badge variant="outline">{job.type}</Badge>}
                  {job.grade && <Badge variant="outline">{job.grade}</Badge>}
                  {isClosingSoon && !isClosed && <Badge variant="destructive">Closing Soon</Badge>}
                  {isClosed && <Badge variant="secondary">Closed</Badge>}
                </div>
              </CardHeader>

              <CardContent>
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
                  <CardContent>
                    <div 
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: job.description_md.replace(/\n/g, '<br>') }}
                    />
                  </CardContent>
                </Card>
              )}

              {job.requirements_md && (
                <Card>
                  <CardHeader>
                    <CardTitle>Requirements</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div 
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: job.requirements_md.replace(/\n/g, '<br>') }}
                    />
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