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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { CustomDatePicker } from '@/components/ui/date-picker';
import { Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { countries } from '@/lib/countries';

const personalDetailsSchema = z.object({
  title: z.enum(['Mr', 'Mrs', 'Ms', 'Miss']),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  middle_names: z.string().optional(),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  maiden_name: z.string().optional(),
  date_of_birth: z.date().nullable().optional(),
  place_of_birth: z.string().optional(),
  country_of_birth: z.string().optional(),
  present_nationality: z.string().optional(),
  nationality_changed: z.boolean(),
  nationality_change_details: z.string().optional(),
  marital_status: z.enum(['Single', 'Married', 'Divorced', 'Widowed', 'Separated']),
  present_address_line1: z.string().optional(),
  present_address_line2: z.string().optional(),
  present_city: z.string().optional(),
  present_country: z.string().optional(),
  present_address_same_as_permanent: z.boolean(),
  permanent_address_line1: z.string().optional(),
  permanent_address_line2: z.string().optional(),
  permanent_city: z.string().optional(),
  permanent_country: z.string().optional(),
  us_green_card: z.boolean(),
  us_green_card_details: z.string().optional(),
  // Privacy settings - optional with defaults
  email_public: z.boolean().optional(),
  phone_public: z.boolean().optional(),
});

type PersonalDetailsFormData = z.infer<typeof personalDetailsSchema>;

interface PersonalDetailsSectionProps {
  candidateId: string;
  initialData?: Partial<PersonalDetailsFormData & { 
    title?: string;
    first_name?: string;
    last_name?: string;
    middle_names?: string;
    email?: string;
    phone?: string;
    maiden_name?: string;
    date_of_birth?: string | Date;
    present_address_line1?: string;
    present_address_line2?: string;
    present_city?: string;
    present_country?: string;
    present_address_same_as_permanent?: boolean;
    permanent_address_line1?: string;
    permanent_address_line2?: string;
    permanent_city?: string;
    permanent_country?: string;
    email_public?: boolean;
    phone_public?: boolean;
  }>;
  onUpdate?: (data: PersonalDetailsFormData) => void;
}

export function PersonalDetailsSection({ candidateId, initialData, onUpdate }: PersonalDetailsSectionProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<PersonalDetailsFormData>({
    resolver: zodResolver(personalDetailsSchema),
    defaultValues: {
      title: initialData?.title || 'Mr',
      first_name: initialData?.first_name || '',
      last_name: initialData?.last_name || '',
      middle_names: initialData?.middle_names || '',
      email: initialData?.email || '',
      phone: initialData?.phone || '',
      maiden_name: initialData?.maiden_name || '',
      date_of_birth: initialData?.date_of_birth ? 
        (initialData.date_of_birth instanceof Date ? 
          initialData.date_of_birth : 
          new Date(initialData.date_of_birth)) : 
        null,
      place_of_birth: initialData?.place_of_birth || '',
      country_of_birth: initialData?.country_of_birth || '',
      present_nationality: initialData?.present_nationality || '',
      nationality_changed: initialData?.nationality_changed || false,
      nationality_change_details: initialData?.nationality_change_details || '',
      marital_status: initialData?.marital_status || 'Single',
      present_address_line1: initialData?.present_address_line1 || '',
      present_address_line2: initialData?.present_address_line2 || '',
      present_city: initialData?.present_city || '',
      present_country: initialData?.present_country || '',
      present_address_same_as_permanent: initialData?.present_address_same_as_permanent || false,
      permanent_address_line1: initialData?.permanent_address_line1 || '',
      permanent_address_line2: initialData?.permanent_address_line2 || '',
      permanent_city: initialData?.permanent_city || '',
      permanent_country: initialData?.permanent_country || '',
      us_green_card: initialData?.us_green_card || false,
      us_green_card_details: initialData?.us_green_card_details || '',
      // Set default values for privacy settings
      email_public: initialData?.email_public || false,
      phone_public: initialData?.phone_public || false,
    },
  });

  const onSubmit = async (data: PersonalDetailsFormData) => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('candidates')
        .update({
          title: data.title,
          first_name: data.first_name,
          last_name: data.last_name,
          middle_names: data.middle_names || null,
          email: data.email,
          phone: data.phone || null,
          maiden_name: data.maiden_name || null,
          date_of_birth: data.date_of_birth ? data.date_of_birth.toISOString().split('T')[0] : null,
          place_of_birth: data.place_of_birth || null,
          country_of_birth: data.country_of_birth || null,
          present_nationality: data.present_nationality || null,
          nationality_changed: data.nationality_changed,
          nationality_change_details: data.nationality_change_details || null,
          marital_status: data.marital_status,
          present_address_line1: data.present_address_line1 || null,
          present_address_line2: data.present_address_line2 || null,
          present_city: data.present_city || null,
          present_country: data.present_country || null,
          present_address_same_as_permanent: data.present_address_same_as_permanent,
          permanent_address_line1: data.permanent_address_line1 || null,
          permanent_address_line2: data.permanent_address_line2 || null,
          permanent_city: data.permanent_city || null,
          permanent_country: data.permanent_country || null,
          us_green_card: data.us_green_card,
          us_green_card_details: data.us_green_card_details || null,
          // Save privacy settings
          email_public: data.email_public || false,
          phone_public: data.phone_public || false,
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
        <p className="text-sm text-muted-foreground">
          Only your name and current location will be shared on your public profile by default. Use the checkboxes below to make additional information visible.
        </p>
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
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Last name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Email address" {...field} />
                    </FormControl>
                    <div className="flex items-center space-x-2 mt-2">
                      <FormField
                        control={form.control}
                        name="email_public"
                        render={({ field: checkboxField }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={checkboxField.value}
                                onCheckedChange={checkboxField.onChange}
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal">
                              It's okay to display this on my public profile
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Phone number" {...field} />
                    </FormControl>
                    <div className="flex items-center space-x-2 mt-2">
                      <FormField
                        control={form.control}
                        name="phone_public"
                        render={({ field: checkboxField }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={checkboxField.value}
                                onCheckedChange={checkboxField.onChange}
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal">
                              It's okay to display this on my public profile
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>
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
                  <FormItem className="space-y-2">
                    <FormLabel>Date of Birth</FormLabel>
                    <FormControl>
                      <div className="w-full">
                        <CustomDatePicker
                          selected={field.value}
                          onChange={field.onChange}
                          placeholderText="Select date of birth"
                          className="w-full"
                        />
                      </div>
                    </FormControl>
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

            <div className="space-y-6">
              <h3 className="text-lg font-medium">Permanent Address</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="permanent_address_line1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First line of address</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Street address"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            if (form.watch("present_address_same_as_permanent")) {
                              form.setValue("present_address_line1", e.target.value);
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
                  name="permanent_address_line2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Second line of address (optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Apt, suite, building, floor, etc."
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            if (form.watch("present_address_same_as_permanent")) {
                              form.setValue("present_address_line2", e.target.value);
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="permanent_city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="City"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            if (form.watch("present_address_same_as_permanent")) {
                              form.setValue("present_city", e.target.value);
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
                  name="permanent_country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          if (form.watch("present_address_same_as_permanent")) {
                            form.setValue("present_country", value);
                          }
                        }} 
                        defaultValue={field.value}
                      >
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
              </div>
            </div>

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
                          form.setValue("present_address_line1", form.getValues("permanent_address_line1"));
                          form.setValue("present_address_line2", form.getValues("permanent_address_line2"));
                          form.setValue("present_city", form.getValues("permanent_city"));
                          form.setValue("present_country", form.getValues("permanent_country"));
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

            <div className="space-y-6">
              <h3 className="text-lg font-medium">Present Address</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="present_address_line1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First line of address</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Street address"
                          {...field}
                          disabled={form.watch("present_address_same_as_permanent")}
                          value={form.watch("present_address_same_as_permanent") ? 
                            form.watch("permanent_address_line1") || '' : field.value}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="present_address_line2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Second line of address (optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Apt, suite, building, floor, etc."
                          {...field}
                          disabled={form.watch("present_address_same_as_permanent")}
                          value={form.watch("present_address_same_as_permanent") ? 
                            form.watch("permanent_address_line2") || '' : field.value}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="present_city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="City"
                          {...field}
                          disabled={form.watch("present_address_same_as_permanent")}
                          value={form.watch("present_address_same_as_permanent") ? 
                            form.watch("permanent_city") || '' : field.value}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="present_country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                        disabled={form.watch("present_address_same_as_permanent")}
                        value={form.watch("present_address_same_as_permanent") ? 
                          form.watch("permanent_country") || '' : field.value}
                      >
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
              </div>

            </div>

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