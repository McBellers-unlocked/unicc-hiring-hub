import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { JobEmailAlert } from '@/components/JobEmailAlert';
import { Search, MapPin, Calendar, Briefcase, Filter, Globe, Heart, GraduationCap, Award, ArrowRight, Home, Plane, BookOpen, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';

interface Job {
  id: string;
  title: string;
  slug: string;
  location: string;
  closing_date: string;
  category: string;
  type: string;
  grade: string;
  notice_no: string;
  positions: number;
  salary_estimate: string;
  created_at: string;
  internal_only: boolean;
}

export default function Jobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedPositionLevels, setSelectedPositionLevels] = useState<string[]>([]);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      // Check if user is authenticated and get their email
      const { data: { user } } = await supabase.auth.getUser();
      const isInternalUser = user?.email?.endsWith('@unicc.org');

      let query = supabase
        .from('jobs')
        .select('id, title, slug, location, closing_date, category, type, grade, notice_no, positions, salary_estimate, created_at, internal_only')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      // If not an internal user, filter out internal-only jobs
      if (!isInternalUser) {
        query = query.or('internal_only.is.null,internal_only.eq.false');
      }

      const { data, error } = await query;

      if (error) throw error;
      setJobs(data || []);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.notice_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.location?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLocation = selectedLocations.length === 0 || selectedLocations.some(selectedLoc => {
      if (!job.location) return false;
      
      let jobCities: string[] = [];
      try {
        // Try to parse as JSON first (for converted jobs)
        const parsed = JSON.parse(job.location);
        if (Array.isArray(parsed)) {
          jobCities = parsed;
        } else {
          jobCities = [String(parsed)];
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
          jobCities = [job.location];
        } else {
          // Parse as comma-separated string of cities
          jobCities = job.location.split(',').map(city => city.trim()).filter(Boolean);
        }
      }
      return jobCities.includes(selectedLoc);
    });
    const matchesPositionLevel = selectedPositionLevels.length === 0 || selectedPositionLevels.includes(getPositionLevel(job));
    
    return matchesSearch && matchesLocation && matchesPositionLevel;
  });

  const getAllLocations = () => {
    const allLocations: string[] = [];
    jobs.forEach(job => {
      if (job.location) {
        try {
          // Try to parse as JSON first (for converted jobs)
          const parsed = JSON.parse(job.location);
          if (Array.isArray(parsed)) {
            allLocations.push(...parsed);
          } else {
            allLocations.push(String(parsed));
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
            allLocations.push(job.location);
          } else {
            // Parse as comma-separated string of cities
            const cities = job.location.split(',').map(city => city.trim()).filter(Boolean);
            allLocations.push(...cities);
          }
        }
      }
    });
    return [...new Set(allLocations)].sort();
  };

  const uniqueLocations = getAllLocations();
  const POSITION_LEVELS = ['Consultancy', 'Internship', 'P4', 'P3', 'P2', 'P1', 'G4', 'G5', 'G6', 'G7'];

  const getPositionLevel = (job: Job): string => {
    const type = (job.type || '').toLowerCase();
    const category = (job.category || '').toLowerCase();
    const grade = (job.grade || '').toUpperCase();
    if (type.includes('consultant') || category.includes('consultancy') || category.includes('consultant')) return 'Consultancy';
    if (type.includes('intern') || category.includes('intern')) return 'Internship';
    for (const lvl of ['P4', 'P3', 'P2', 'P1', 'G4', 'G5', 'G6', 'G7']) {
      if (grade === lvl) return lvl;
    }
    return '';
  };

  const getLocationCount = (location: string) => {
    return jobs.filter(job => {
      if (!job.location) return false;
      
      let jobCities: string[] = [];
      try {
        // Try to parse as JSON first (for converted jobs)
        const parsed = JSON.parse(job.location);
        if (Array.isArray(parsed)) {
          jobCities = parsed;
        } else {
          jobCities = [String(parsed)];
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
          jobCities = [job.location];
        } else {
          // Parse as comma-separated string of cities
          jobCities = job.location.split(',').map(city => city.trim()).filter(Boolean);
        }
      }
      return jobCities.includes(location);
    }).length;
  };
  const getPositionLevelCount = (level: string) => jobs.filter(job => getPositionLevel(job) === level).length;

  const handleLocationChange = (location: string, checked: boolean) => {
    if (checked) {
      setSelectedLocations([...selectedLocations, location]);
    } else {
      setSelectedLocations(selectedLocations.filter(l => l !== location));
    }
  };

  const handlePositionLevelChange = (level: string, checked: boolean) => {
    if (checked) {
      setSelectedPositionLevels([...selectedPositionLevels, level]);
    } else {
      setSelectedPositionLevels(selectedPositionLevels.filter(l => l !== level));
    }
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setSelectedLocations([]);
    setSelectedPositionLevels([]);
  };

  const valueProps = [
    { icon: Globe, title: "Global Impact", description: "Advance the UN Sustainable Development Goals" },
    { icon: Award, title: "Competitive Benefits", description: "UN pension, health insurance, tax exemption" },
    { icon: Heart, title: "Work-Life Balance", description: "Flexible hours, remote work, 30 days leave" },
    { icon: GraduationCap, title: "Career Growth", description: "Training, mentoring, promotion opportunities" }
  ];

  const quickBenefits = [
    { icon: Home, label: "Remote work" },
    { icon: Plane, label: "90 days telework abroad" },
    { icon: BookOpen, label: "10 days study leave" },
    { icon: Clock, label: "Flexible hours" }
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        {/* SEO Head */}
        <title>Career Opportunities - UNICC</title>
        <meta name="description" content="Explore career opportunities at UNICC. Find international jobs in technology, procurement, and shared services." />
        <meta property="og:title" content="Career Opportunities - UNICC" />
        <meta property="og:description" content="Explore career opportunities at UNICC. Find international jobs in technology, procurement, and shared services." />
        <meta property="og:type" content="website" />

        {/* Enhanced Hero Section with EVP */}
        <div className="bg-gradient-to-br from-primary via-primary to-primary/90 text-primary-foreground py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-10">
                <h1 className="text-4xl md:text-5xl font-bold mb-4">
                  Join UNICC to shape the future of technology, for a better world
                </h1>
                <p className="text-xl text-primary-foreground/90 mb-6 max-w-3xl mx-auto">
                  Empower UN organizations with innovative technology solutions that drive positive social impact 
                  and advance the Sustainable Development Goals.
                </p>
                <div className="flex items-center justify-center gap-6 text-primary-foreground/80 mb-8">
                  <span className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5" />
                    {jobs.length} open positions
                  </span>
                  <span className="hidden sm:block">•</span>
                  <span className="hidden sm:block">5 global offices</span>
                  <span className="hidden sm:block">•</span>
                  <span className="hidden sm:block">100+ nationalities</span>
                </div>
              </div>

              {/* Value Proposition Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {valueProps.map((prop, idx) => (
                  <div key={idx} className="bg-primary-foreground/10 backdrop-blur-sm rounded-lg p-4 text-center border border-primary-foreground/20">
                    <prop.icon className="h-8 w-8 mx-auto mb-2 text-primary-foreground" />
                    <h3 className="font-semibold text-sm mb-1">{prop.title}</h3>
                    <p className="text-xs text-primary-foreground/80">{prop.description}</p>
                  </div>
                ))}
              </div>

              {/* Learn More CTA */}
              <div className="text-center">
                <Button variant="secondary" size="sm" asChild>
                  <Link to="/life-at-unicc" className="flex items-center gap-2">
                    Discover Life at UNICC
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Benefits Bar */}
        <div className="bg-muted/50 border-b">
          <div className="container mx-auto px-4 py-4">
            <div className="flex flex-wrap justify-center gap-6 md:gap-10">
              {quickBenefits.map((benefit, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <benefit.icon className="h-4 w-4 text-primary" />
                  <span>{benefit.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content with Sidebar */}
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex gap-8">
              {/* Sidebar Filters */}
              <div className="w-80 shrink-0">
                <div className="bg-card rounded-lg shadow-lg p-6 sticky top-8">
                  <div className="flex items-center gap-2 mb-6">
                    <Filter className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-lg">Filters</h3>
                  </div>

                  {/* Search */}
                  <div className="mb-6">
                    <label className="text-sm font-medium mb-2 block">Search</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search jobs..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {/* Location Filter */}
                  <div className="mb-6">
                    <label className="text-sm font-medium mb-3 block">Location</label>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {uniqueLocations.map(location => (
                        <div key={location} className="flex items-center space-x-2">
                          <Checkbox
                            id={`location-${location}`}
                            checked={selectedLocations.includes(location)}
                            onCheckedChange={(checked) => handleLocationChange(location, checked as boolean)}
                          />
                          <label 
                            htmlFor={`location-${location}`} 
                            className="text-sm font-normal flex-1 cursor-pointer"
                          >
                            {location} ({getLocationCount(location)})
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Position Level Filter */}
                  <div className="mb-6">
                    <label className="text-sm font-medium mb-3 block">Position Level</label>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {POSITION_LEVELS.map(level => (
                        <div key={level} className="flex items-center space-x-2">
                          <Checkbox
                            id={`level-${level}`}
                            checked={selectedPositionLevels.includes(level)}
                            onCheckedChange={(checked) => handlePositionLevelChange(level, checked as boolean)}
                          />
                          <label 
                            htmlFor={`level-${level}`} 
                            className="text-sm font-normal flex-1 cursor-pointer"
                          >
                            {level} ({getPositionLevelCount(level)})
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Clear Filters */}
                  {(searchTerm || selectedLocations.length > 0 || selectedPositionLevels.length > 0) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearAllFilters}
                      className="w-full"
                    >
                      Clear all filters
                    </Button>
                  )}
                </div>
              </div>

              {/* Jobs Content */}
              <div className="flex-1">
                {(searchTerm || selectedLocations.length > 0 || selectedPositionLevels.length > 0) && (
                  <div className="mb-6">
                    <p className="text-sm text-muted-foreground">
                      {filteredJobs.length} {filteredJobs.length === 1 ? 'job' : 'jobs'} found
                    </p>
                  </div>
                )}

                {/* Jobs Grid */}
                {loading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[...Array(6)].map((_, i) => (
                      <Card key={i}>
                        <CardHeader>
                          <Skeleton className="h-6 w-3/4" />
                          <Skeleton className="h-4 w-1/2" />
                        </CardHeader>
                        <CardContent>
                          <Skeleton className="h-4 w-full mb-2" />
                          <Skeleton className="h-4 w-2/3" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : filteredJobs.length === 0 ? (
                  <div className="text-center py-12">
                    <Briefcase className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No jobs found</h3>
                    <p className="text-muted-foreground">Try adjusting your search criteria or check back later for new opportunities.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredJobs.map((job) => (
                      <Card key={job.id} className="hover:shadow-lg transition-shadow">
                        <CardHeader className="pb-3">
                          <div className="space-y-3">
                            <div className="flex justify-between items-start gap-2">
                              <CardTitle className="text-lg leading-tight">{job.title}</CardTitle>
                              {job.positions > 1 && (
                                <Badge variant="secondary" className="shrink-0">{job.positions} positions</Badge>
                              )}
                            </div>
                            
                            {job.notice_no && (
                              <p className="text-sm text-muted-foreground">Notice No: {job.notice_no}</p>
                            )}
                            
                            {/* Contract Type and Grade - prominently displayed */}
                            <div className="flex flex-wrap gap-2">
                              {job.internal_only && <Badge variant="default">Internal Only</Badge>}
                              {getPositionLevel(job) && (
                                <Badge variant="default" className="bg-primary text-primary-foreground">
                                  {getPositionLevel(job)}
                                </Badge>
                              )}
                              {job.grade && <Badge variant="outline">{job.grade}</Badge>}
                            </div>
                            
                            {/* Salary */}
                            {job.salary_estimate && (
                              <div className="text-sm font-semibold text-foreground">
                                {job.salary_estimate}
                              </div>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="space-y-3">
                            {job.location && (
                              <div className="space-y-1">
                                {(() => {
                                  let locations = [];
                                  
                                   // Handle both JSON array format and string format
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
                                       
                                       // If it matches a known city, treat it as a single location
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
                                       <div key={index} className="flex items-center text-sm text-muted-foreground">
                                        {countryCode ? (
                                          <img 
                                            src={`https://flagcdn.com/w20/${countryCode}.png`}
                                            alt={`${location.country} flag`}
                                            className="w-4 h-3 mr-2 object-cover rounded-sm"
                                            onError={(e) => {
                                              // Hide flag if it fails to load
                                              e.currentTarget.style.display = 'none';
                                            }}
                                          />
                                        ) : (
                                          <span className="w-4 mr-2">🌍</span>
                                        )}
                                        <span>{location.city}</span>
                                      </div>
                                    );
                                  });
                                })()}
                              </div>
                            )}
                            
                            {job.closing_date && (
                              <div className="flex items-center text-sm text-muted-foreground">
                                <Calendar className="h-4 w-4 mr-2" />
                                Closes {new Date(job.closing_date).toLocaleDateString('en-GB')}
                              </div>
                            )}

                            <Link to={`/jobs/${job.slug || job.id}`} className="block mt-4">
                              <Button className="w-full">
                                View Details
                              </Button>
                            </Link>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Email Alert Component */}
                <JobEmailAlert
                  searchTerm={searchTerm}
                  selectedLocations={selectedLocations}
                  selectedCategories={selectedPositionLevels}
                  selectedTypes={[]}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}