import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { CalendarIcon, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { countries } from '@/lib/countries';

const personalDetailsSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  middle_names: z.string().optional(),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  title: z.enum(['Mr', 'Mrs', 'Ms', 'Miss']),
  maiden_name: z.string().optional(),
  date_of_birth: z.union([z.date(), z.string()]).optional(),
  place_of_birth: z.string().optional(),
  country_of_birth: z.string().optional(),
  present_nationality: z.string().optional(),
  nationality_changed: z.boolean(),
  nationality_change_details: z.string().optional(),
  marital_status: z.enum(['Single', 'Married', 'Divorced', 'Widowed', 'Separated']),
  present_address: z.string().optional(),
  present_address_same_as_permanent: z.boolean(),
  permanent_address: z.string().optional(),
  us_green_card: z.boolean(),
  us_green_card_details: z.string().optional(),
});

type PersonalDetailsFormData = z.infer<typeof personalDetailsSchema>;

interface PersonalDetailsSectionProps {
  candidateId: string;
  initialData?: Partial<PersonalDetailsFormData & { 
    first_name?: string;
    middle_names?: string;
    email?: string;
    phone?: string;
    present_address?: string;
    present_address_same_as_permanent?: boolean;
  }>;
  onUpdate?: (data: PersonalDetailsFormData) => void;
}

export function PersonalDetailsSection({ candidateId, initialData, onUpdate }: PersonalDetailsSectionProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<PersonalDetailsFormData>({
    resolver: zodResolver(personalDetailsSchema),
    defaultValues: {
      first_name: initialData?.first_name || '',
      middle_names: initialData?.middle_names || '',
      email: initialData?.email || '',
      phone: initialData?.phone || '',
      title: initialData?.title || 'Mr',
      maiden_name: initialData?.maiden_name || '',
      date_of_birth: initialData?.date_of_birth ? 
        (typeof initialData.date_of_birth === 'string' ? new Date(initialData.date_of_birth) : initialData.date_of_birth) : 
        undefined,
      place_of_birth: initialData?.place_of_birth || '',
      country_of_birth: initialData?.country_of_birth || '',
      present_nationality: initialData?.present_nationality || '',
      nationality_changed: initialData?.nationality_changed || false,
      nationality_change_details: initialData?.nationality_change_details || '',
      marital_status: initialData?.marital_status || 'Single',
      present_address: initialData?.present_address || '',
      present_address_same_as_permanent: initialData?.present_address_same_as_permanent || false,
      permanent_address: initialData?.permanent_address || '',
      us_green_card: initialData?.us_green_card || false,
      us_green_card_details: initialData?.us_green_card_details || '',
    },
  });

  const onSubmit = async (data: PersonalDetailsFormData) => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('candidates')
        .update({
          first_name: data.first_name,
          middle_names: data.middle_names || null,
          email: data.email,
          phone: data.phone || null,
          title: data.title,
          maiden_name: data.maiden_name || null,
          date_of_birth: data.date_of_birth ? 
            (data.date_of_birth instanceof Date ? data.date_of_birth.toISOString().split('T')[0] : data.date_of_birth) : 
            null,
          place_of_birth: data.place_of_birth || null,
          country_of_birth: data.country_of_birth || null,
          present_nationality: data.present_nationality || null,
          nationality_changed: data.nationality_changed,
          nationality_change_details: data.nationality_change_details || null,
          marital_status: data.marital_status,
          present_address: data.present_address || null,
          present_address_same_as_permanent: data.present_address_same_as_permanent,
          permanent_address: data.permanent_address || null,
          us_green_card: data.us_green_card,
          us_green_card_details: data.us_green_card_details || null,
        })
        .eq('id', candidateId);

      if (error) throw error;

      toast({
        title: "Personal details updated",
        description: "Your personal information has been saved successfully.",
      });

      onUpdate?.(data);
    } catch (error) {
      console.error('Error updating personal details:', error);
      toast({
        title: "Update failed",
        description: "There was an error updating your personal details.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Personal Details</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select title" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Mr">Mr</SelectItem>
                        <SelectItem value="Mrs">Mrs</SelectItem>
                        <SelectItem value="Ms">Ms</SelectItem>
                        <SelectItem value="Miss">Miss</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="First name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="middle_names"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Middle Names (if any)</FormLabel>
                    <FormControl>
                      <Input placeholder="Middle names" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Email address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Phone number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maiden_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Maiden Name (if applicable)</FormLabel>
                    <FormControl>
                      <Input placeholder="Maiden name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select title" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Mr">Mr</SelectItem>
                        <SelectItem value="Mrs">Mrs</SelectItem>
                        <SelectItem value="Ms">Ms</SelectItem>
                        <SelectItem value="Miss">Miss</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maiden_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Maiden Name (if applicable)</FormLabel>
                    <FormControl>
                      <Input placeholder="Maiden name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date_of_birth"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date of Birth</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "dd/MM/yyyy")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value instanceof Date ? field.value : undefined}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                          captionLayout="dropdown-buttons"
                          fromYear={1900}
                          toYear={new Date().getFullYear()}
                          className="pointer-events-auto"
                          classNames={{
                            dropdown_month: "flex items-center space-x-2",
                            dropdown_year: "flex items-center space-x-2",
                            caption_dropdowns: "flex justify-center gap-2 mb-4",
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="place_of_birth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Place of Birth</FormLabel>
                    <FormControl>
                      <Input placeholder="City, State/Province" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="country_of_birth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country of Birth</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {countries.map((country) => (
                          <SelectItem key={country} value={country}>
                            {country}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="present_nationality"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Present Nationality</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select nationality" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {countries.map((country) => (
                          <SelectItem key={country} value={country}>
                            {country}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="nationality_changed"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Have you ever changed your nationality?
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />

            {form.watch("nationality_changed") && (
              <FormField
                control={form.control}
                name="nationality_change_details"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nationality Change Details</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Please explain the details of your nationality change"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="marital_status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Marital Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select marital status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Single">Single</SelectItem>
                      <SelectItem value="Married">Married</SelectItem>
                      <SelectItem value="Divorced">Divorced</SelectItem>
                      <SelectItem value="Widowed">Widowed</SelectItem>
                      <SelectItem value="Separated">Separated</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <FormField
                control={form.control}
                name="present_address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Present Address</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Your present address"
                        {...field}
                        disabled={form.watch("present_address_same_as_permanent")}
                        value={form.watch("present_address_same_as_permanent") ? 
                          form.watch("permanent_address") : field.value}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="present_address_same_as_permanent"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) => {
                          field.onChange(checked);
                          if (checked) {
                            form.setValue("present_address", form.getValues("permanent_address"));
                          }
                        }}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Present address is same as permanent address
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="permanent_address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Permanent Address</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Your permanent address"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        if (form.watch("present_address_same_as_permanent")) {
                          form.setValue("present_address", e.target.value);
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="us_green_card"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Do you hold a US Green Card or US citizenship?
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />

            {form.watch("us_green_card") && (
              <FormField
                control={form.control}
                name="us_green_card_details"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>US Green Card/Citizenship Details</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Please provide details about your US status"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <Button type="submit" disabled={loading}>
              <Save className="w-4 h-4 mr-2" />
              {loading ? 'Saving...' : 'Save Personal Details'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}