import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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

export default function JobsContent() {
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
      
      let jobCities: string[] = [];
      try {
        const parsed = JSON.parse(job.location);
        if (Array.isArray(parsed)) {
          jobCities = parsed;
        } else {
          jobCities = [String(parsed)];
        }
      } catch {
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
          jobCities = job.location.split(',').map(city => city.trim()).filter(Boolean);
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
        try {
          const parsed = JSON.parse(job.location);
          if (Array.isArray(parsed)) {
            allLocations.push(...parsed);
          } else {
            allLocations.push(String(parsed));
          }
        } catch {
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
            const cities = job.location.split(',').map(city => city.trim()).filter(Boolean);
            allLocations.push(...cities);
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
    return type;
  };

  const uniqueDisplayTypes = [...new Set(jobs.map(job => getDisplayType(job.type)).filter(Boolean))];

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
    <div className="flex gap-6">
      {/* Filters Sidebar */}
      <div className="w-64 shrink-0">
        <Card className="sticky top-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Filter className="h-4 w-4" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search */}
            <div>
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
            <div>
              <label className="text-sm font-medium mb-2 block">Location</label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {uniqueLocations.slice(0, 5).map(location => (
                  <div key={location} className="flex items-center space-x-2">
                    <Checkbox
                      id={`location-${location}`}
                      checked={selectedLocations.includes(location)}
                      onCheckedChange={(checked) => handleLocationChange(location, checked as boolean)}
                    />
                    <label 
                      htmlFor={`location-${location}`} 
                      className="text-sm cursor-pointer flex-1"
                    >
                      {location}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Category</label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {uniqueCategories.slice(0, 5).map(category => (
                  <div key={category} className="flex items-center space-x-2">
                    <Checkbox
                      id={`category-${category}`}
                      checked={selectedCategories.includes(category)}
                      onCheckedChange={(checked) => handleCategoryChange(category, checked as boolean)}
                    />
                    <label 
                      htmlFor={`category-${category}`} 
                      className="text-sm cursor-pointer flex-1"
                    >
                      {category}
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
                Clear filters
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Jobs List */}
      <div className="flex-1">
        <div className="mb-4">
          <p className="text-sm text-muted-foreground">
            {filteredJobs.length} {filteredJobs.length === 1 ? 'job' : 'jobs'} found
          </p>
        </div>

        {loading ? (
          <div className="space-y-4">
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
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No jobs found</h3>
              <p className="text-muted-foreground text-center">
                Try adjusting your search criteria or check back later for new opportunities.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredJobs.map((job) => (
              <Card key={job.id} className="hover:shadow-md transition-shadow">
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
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {job.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {job.location}
                        </div>
                      )}
                      {job.closing_date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Closes {formatDistanceToNow(new Date(job.closing_date), { addSuffix: true })}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {job.category && (
                          <Badge variant="outline">{job.category}</Badge>
                        )}
                        {job.type && (
                          <Badge variant="outline">{getDisplayType(job.type)}</Badge>
                        )}
                        {job.grade && (
                          <Badge variant="outline">{job.grade}</Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/jobs/${job.slug}`}>
                            View Details
                          </Link>
                        </Button>
                        <Button size="sm" asChild>
                          <Link to={`/apply/${job.id}`}>
                            Apply Now
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}