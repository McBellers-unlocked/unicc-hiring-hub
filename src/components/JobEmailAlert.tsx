import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Bell, Mail } from 'lucide-react';

interface JobEmailAlertProps {
  searchTerm: string;
  selectedLocations: string[];
  selectedCategories: string[];
  selectedTypes: string[];
}

// Predefined options for all possible values
const ALL_LOCATIONS = ['Brindisi', 'Geneva', 'Lyon', 'New York', 'Rome', 'Valencia'];
const ALL_CATEGORIES = ['Human Resources', 'Information Technology', 'Procurement', 'Finance', 'Legal', 'Administration'];
const ALL_TYPES = ['Staff - Fixed term', 'Staff - Temporary', 'Consultant', 'Intern'];

export function JobEmailAlert({
  searchTerm,
  selectedLocations,
  selectedCategories,
  selectedTypes,
}: JobEmailAlertProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [customSearchTerm, setCustomSearchTerm] = useState(searchTerm);
  const [customLocations, setCustomLocations] = useState<string[]>(selectedLocations);
  const [customCategories, setCustomCategories] = useState<string[]>(selectedCategories);
  const [customTypes, setCustomTypes] = useState<string[]>(selectedTypes);
  const { toast } = useToast();

  const handleLocationChange = (location: string, checked: boolean) => {
    if (checked) {
      setCustomLocations([...customLocations, location]);
    } else {
      setCustomLocations(customLocations.filter(l => l !== location));
    }
  };

  const handleCategoryChange = (category: string, checked: boolean) => {
    if (checked) {
      setCustomCategories([...customCategories, category]);
    } else {
      setCustomCategories(customCategories.filter(c => c !== category));
    }
  };

  const handleTypeChange = (type: string, checked: boolean) => {
    if (checked) {
      setCustomTypes([...customTypes, type]);
    } else {
      setCustomTypes(customTypes.filter(t => t !== type));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "Error",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('job_email_alerts')
        .insert({
          email,
          search_term: customSearchTerm || null,
          locations: customLocations,
          categories: customCategories,
          types: customTypes,
        });

      if (error) throw error;

      toast({
        title: "Success!",
        description: "You've successfully signed up for job alerts. You'll receive emails when new jobs match your criteria.",
      });

      // Reset form
      setEmail('');
      setCustomSearchTerm('');
      setCustomLocations([]);
      setCustomCategories([]);
      setCustomTypes([]);
    } catch (error: any) {
      console.error('Error creating email alert:', error);
      toast({
        title: "Error",
        description: "Failed to set up job alert. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const hasFilters = customSearchTerm || customLocations.length > 0 || customCategories.length > 0 || customTypes.length > 0;

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          <CardTitle>Get Job Alerts</CardTitle>
        </div>
        <CardDescription>
          {hasFilters 
            ? "Receive email notifications when new jobs match your selected criteria"
            : "Receive email notifications when any new jobs are posted"
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="search">Search Term (optional)</Label>
            <Input
              id="search"
              placeholder="e.g., software engineer, analyst..."
              value={customSearchTerm}
              onChange={(e) => setCustomSearchTerm(e.target.value)}
            />
          </div>

          {ALL_LOCATIONS.length > 0 && (
            <div>
              <Label className="text-sm font-medium mb-2 block">Locations (optional)</Label>
              <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                {ALL_LOCATIONS.map(location => (
                  <div key={location} className="flex items-center space-x-2">
                    <Checkbox
                      id={`alert-location-${location}`}
                      checked={customLocations.includes(location)}
                      onCheckedChange={(checked) => handleLocationChange(location, checked as boolean)}
                    />
                    <label 
                      htmlFor={`alert-location-${location}`} 
                      className="text-sm cursor-pointer"
                    >
                      {location}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {ALL_CATEGORIES.length > 0 && (
            <div>
              <Label className="text-sm font-medium mb-2 block">Categories (optional)</Label>
              <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
                {ALL_CATEGORIES.map(category => (
                  <div key={category} className="flex items-center space-x-2">
                    <Checkbox
                      id={`alert-category-${category}`}
                      checked={customCategories.includes(category)}
                      onCheckedChange={(checked) => handleCategoryChange(category, checked as boolean)}
                    />
                    <label 
                      htmlFor={`alert-category-${category}`} 
                      className="text-sm cursor-pointer"
                    >
                      {category}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {ALL_TYPES.length > 0 && (
            <div>
              <Label className="text-sm font-medium mb-2 block">Types (optional)</Label>
              <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
                {ALL_TYPES.map(type => (
                  <div key={type} className="flex items-center space-x-2">
                    <Checkbox
                      id={`alert-type-${type}`}
                      checked={customTypes.includes(type)}
                      onCheckedChange={(checked) => handleTypeChange(type, checked as boolean)}
                    />
                    <label 
                      htmlFor={`alert-type-${type}`} 
                      className="text-sm cursor-pointer"
                    >
                      {type}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? "Setting up..." : "Set Up Job Alert"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}