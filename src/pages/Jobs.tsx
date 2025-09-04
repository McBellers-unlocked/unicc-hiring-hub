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
import { Search, MapPin, Calendar, Briefcase, Filter } from 'lucide-react';
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
  created_at: string;
}

export default function Jobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('id, title, slug, location, closing_date, category, type, grade, notice_no, positions, created_at')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

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
      // Extract cities from the location string (City, Country pattern)
      const parts = job.location.split(',').map(part => part.trim());
      const jobCities = [];
      for (let i = 0; i < parts.length; i += 2) {
        if (parts[i]) {
          jobCities.push(parts[i]);
        }
      }
      return jobCities.includes(selectedLoc);
    });
    const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(job.category);
    const matchesType = selectedTypes.length === 0 || selectedTypes.includes(getDisplayType(job.type));
    
    return matchesSearch && matchesLocation && matchesCategory && matchesType;
  });

  const getAllLocations = () => {
    const allLocations: string[] = [];
    jobs.forEach(job => {
      if (job.location) {
        // Split by comma and extract cities (assuming City, Country, City, Country pattern)
        const parts = job.location.split(',').map(part => part.trim());
        for (let i = 0; i < parts.length; i += 2) {
          if (parts[i]) {
            allLocations.push(parts[i]);
          }
        }
      }
    });
    return [...new Set(allLocations)].sort();
  };

  const uniqueLocations = getAllLocations();
  const uniqueCategories = [...new Set(jobs.map(job => job.category).filter(Boolean))];
  const uniqueTypes = [...new Set(jobs.map(job => job.type).filter(Boolean))];

  const getDisplayType = (type: string) => {
    if (!type) return '';
    if (type.toLowerCase().includes('fixed') || type.toLowerCase().includes('term')) {
      return 'Staff - Fixed term';
    }
    if (type.toLowerCase().includes('temporary') || type.toLowerCase().includes('temp')) {
      return 'Staff - Temporary';
    }
    if (type.toLowerCase().includes('consultant')) {
      return 'Consultant';
    }
    if (type.toLowerCase().includes('intern')) {
      return 'Intern';
    }
    return type; // fallback to original
  };

  const uniqueDisplayTypes = [...new Set(jobs.map(job => getDisplayType(job.type)).filter(Boolean))];

  const getLocationCount = (location: string) => {
    return jobs.filter(job => {
      if (!job.location) return false;
      // Extract cities from the location string (City, Country pattern)
      const parts = job.location.split(',').map(part => part.trim());
      const jobCities = [];
      for (let i = 0; i < parts.length; i += 2) {
        if (parts[i]) {
          jobCities.push(parts[i]);
        }
      }
      return jobCities.includes(location);
    }).length;
  };
  const getCategoryCount = (category: string) => jobs.filter(job => job.category === category).length;
  const getTypeCount = (displayType: string) => jobs.filter(job => getDisplayType(job.type) === displayType).length;

  const handleLocationChange = (location: string, checked: boolean) => {
    if (checked) {
      setSelectedLocations([...selectedLocations, location]);
    } else {
      setSelectedLocations(selectedLocations.filter(l => l !== location));
    }
  };

  const handleCategoryChange = (category: string, checked: boolean) => {
    if (checked) {
      setSelectedCategories([...selectedCategories, category]);
    } else {
      setSelectedCategories(selectedCategories.filter(c => c !== category));
    }
  };

  const handleTypeChange = (displayType: string, checked: boolean) => {
    if (checked) {
      setSelectedTypes([...selectedTypes, displayType]);
    } else {
      setSelectedTypes(selectedTypes.filter(t => t !== displayType));
    }
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setSelectedLocations([]);
    setSelectedCategories([]);
    setSelectedTypes([]);
  };

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        {/* SEO Head */}
        <title>Career Opportunities - UNICC</title>
        <meta name="description" content="Explore career opportunities at UNICC. Find international jobs in technology, procurement, and shared services." />
        <meta property="og:title" content="Career Opportunities - UNICC" />
        <meta property="og:description" content="Explore career opportunities at UNICC. Find international jobs in technology, procurement, and shared services." />
        <meta property="og:type" content="website" />

        {/* Hero Section */}
        <div className="bg-primary text-primary-foreground py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-4xl font-bold mb-4">Career Opportunities</h1>
              <p className="text-xl text-primary-foreground/90 mb-8">
                Join UNICC and make a difference in international cooperation through technology and shared services.
              </p>
              <div className="flex items-center justify-center space-x-2 text-primary-foreground/80">
                <Briefcase className="h-5 w-5" />
                <span>{jobs.length} open positions</span>
              </div>
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

                  {/* Category Filter */}
                  <div className="mb-6">
                    <label className="text-sm font-medium mb-3 block">Category</label>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {uniqueCategories.map(category => (
                        <div key={category} className="flex items-center space-x-2">
                          <Checkbox
                            id={`category-${category}`}
                            checked={selectedCategories.includes(category)}
                            onCheckedChange={(checked) => handleCategoryChange(category, checked as boolean)}
                          />
                          <label 
                            htmlFor={`category-${category}`} 
                            className="text-sm font-normal flex-1 cursor-pointer"
                          >
                            {category} ({getCategoryCount(category)})
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Type Filter */}
                  <div className="mb-6">
                    <label className="text-sm font-medium mb-3 block">Type</label>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {uniqueDisplayTypes.map(displayType => (
                        <div key={displayType} className="flex items-center space-x-2">
                          <Checkbox
                            id={`type-${displayType}`}
                            checked={selectedTypes.includes(displayType)}
                            onCheckedChange={(checked) => handleTypeChange(displayType, checked as boolean)}
                          />
                          <label 
                            htmlFor={`type-${displayType}`} 
                            className="text-sm font-normal flex-1 cursor-pointer"
                          >
                            {displayType} ({getTypeCount(displayType)})
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Clear Filters */}
                  {(searchTerm || selectedLocations.length > 0 || selectedCategories.length > 0 || selectedTypes.length > 0) && (
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
                {(searchTerm || selectedLocations.length > 0 || selectedCategories.length > 0 || selectedTypes.length > 0) && (
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
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <CardTitle className="text-lg leading-tight">{job.title}</CardTitle>
                            {job.positions > 1 && (
                              <Badge variant="secondary">{job.positions} positions</Badge>
                            )}
                          </div>
                          {job.notice_no && (
                            <p className="text-sm text-muted-foreground">Notice No: {job.notice_no}</p>
                          )}
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {job.location && (
                              <div className="flex items-center text-sm text-muted-foreground">
                                <MapPin className="h-4 w-4 mr-2" />
                                {(() => {
                                  // Extract just the city names from "City, Country, City, Country" format
                                  const parts = job.location.split(',').map(part => part.trim());
                                  const cities = [];
                                  for (let i = 0; i < parts.length; i += 2) {
                                    if (parts[i]) {
                                      cities.push(parts[i]);
                                    }
                                  }
                                  return cities.join(', ');
                                })()}
                              </div>
                            )}
                            
                            {job.closing_date && (
                              <div className="flex items-center text-sm text-muted-foreground">
                                <Calendar className="h-4 w-4 mr-2" />
                                Closes {formatDistanceToNow(new Date(job.closing_date), { addSuffix: true })}
                              </div>
                            )}

                            <div className="flex flex-wrap gap-2">
                              {job.type && (
                                <Badge variant="default" className="bg-primary text-primary-foreground">
                                  {getDisplayType(job.type)}
                                </Badge>
                              )}
                              {job.category && <Badge variant="outline">{job.category}</Badge>}
                              {job.grade && <Badge variant="outline">{job.grade}</Badge>}
                            </div>

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
                  selectedCategories={selectedCategories}
                  selectedTypes={selectedTypes}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}