import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Trash2, GraduationCap, ChevronDown, ChevronUp, Edit2 } from "lucide-react";

interface PHFEducation {
  from_month: string;
  from_year: string;
  to_month?: string;
  to_year?: string;
  is_present: boolean;
  institution_name: string;
  institution_place?: string;
  institution_country?: string;
  degree_type: string;
  degree_or_certificate_title?: string;
  main_course_of_study?: string;
  is_completed: boolean;
  certificate_url?: string;
}

interface EnhancedEducationSectionProps {
  education: PHFEducation[];
  onChange: (education: PHFEducation[]) => void;
}

const MONTHS = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

const YEARS = Array.from({ length: 60 }, (_, i) => {
  const year = new Date().getFullYear() - i;
  return { value: year.toString(), label: year.toString() };
});

const DEGREE_TYPES = [
  { value: 'High School Diploma', label: 'High School Diploma' },
  { value: 'Secondary Education Certificate', label: 'Secondary Education Certificate' },
  { value: 'A-Levels', label: 'A-Levels' },
  { value: 'International Baccalaureate', label: 'International Baccalaureate' },
  { value: 'Bachelor\'s Degree', label: 'Bachelor\'s Degree' },
  { value: 'Bachelor\'s Degree (Honors)', label: 'Bachelor\'s Degree (Honors)' },
  { value: 'Master\'s Degree', label: 'Master\'s Degree' },
  { value: 'PhD', label: 'PhD' },
  { value: 'Post-Doctoral', label: 'Post-Doctoral' },
  { value: 'Professional Certificate', label: 'Professional Certificate' },
  { value: 'Technical Diploma', label: 'Technical Diploma' },
  { value: 'Professional License', label: 'Professional License' },
  { value: 'Other', label: 'Other' },
];

const COUNTRIES = [
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda', 'Argentina', 'Armenia', 'Australia', 'Austria', 'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan', 'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi', 'Cabo Verde', 'Cambodia', 'Cameroon', 'Canada', 'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros', 'Congo', 'Costa Rica', 'Croatia', 'Cuba', 'Cyprus', 'Czech Republic', 'Democratic Republic of the Congo', 'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic', 'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Eswatini', 'Ethiopia', 'Fiji', 'Finland', 'France', 'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada', 'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana', 'Haiti', 'Honduras', 'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati', 'Kuwait', 'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico', 'Micronesia', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar', 'Namibia', 'Nauru', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'North Korea', 'North Macedonia', 'Norway', 'Oman', 'Pakistan', 'Palau', 'Palestine', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal', 'Qatar', 'Romania', 'Russia', 'Rwanda', 'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa', 'San Marino', 'Sao Tome and Principe', 'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia', 'South Africa', 'South Korea', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Sweden', 'Switzerland', 'Syria', 'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Timor-Leste', 'Togo', 'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan', 'Tuvalu', 'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan', 'Vanuatu', 'Vatican City', 'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe'
];

export default function EnhancedEducationSection({ education, onChange }: EnhancedEducationSectionProps) {
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [newEducation, setNewEducation] = useState<PHFEducation>({
    from_month: "",
    from_year: "",
    to_month: "",
    to_year: "",
    is_present: false,
    institution_name: "",
    institution_place: "",
    institution_country: "",
    degree_type: "",
    degree_or_certificate_title: "",
    main_course_of_study: "",
    is_completed: true,
    certificate_url: "",
  });

  const addEducation = () => {
    if (newEducation.institution_name && newEducation.degree_type && newEducation.main_course_of_study) {
      onChange([...education, newEducation]);
      setNewEducation({
        from_month: "",
        from_year: "",
        to_month: "",
        to_year: "",
        is_present: false,
        institution_name: "",
        institution_place: "",
        institution_country: "",
        degree_type: "",
        degree_or_certificate_title: "",
        main_course_of_study: "",
        is_completed: true,
        certificate_url: "",
      });
    }
  };

  const removeEducation = (index: number) => {
    onChange(education.filter((_, i) => i !== index));
  };

  const updateEducation = (index: number, field: keyof PHFEducation, value: any) => {
    const updated = education.map((edu, i) => 
      i === index ? { ...edu, [field]: value } : edu
    );
    onChange(updated);
  };

  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedItems(newExpanded);
  };

  const formatDisplayDate = (fromMonth: string, fromYear: string, toMonth?: string, toYear?: string, isCurrent?: boolean) => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const fromDisplay = fromMonth && fromYear ? `${monthNames[parseInt(fromMonth) - 1]} ${fromYear}` : '';
    const toDisplay = isCurrent ? 'Present' : (toMonth && toYear ? `${monthNames[parseInt(toMonth) - 1]} ${toYear}` : '');
    return `${fromDisplay} - ${toDisplay}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5" />
          Enhanced Education (PHF Compatible)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Existing Education Entries */}
        {education.map((edu, index) => {
          const isExpanded = expandedItems.has(index);
          return (
            <Collapsible key={index} open={isExpanded} onOpenChange={() => toggleExpanded(index)}>
              <div className="border rounded-lg overflow-hidden">
                {/* Collapsed Summary View */}
                <div className="p-4 bg-muted/30">
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{edu.degree_type} in {edu.main_course_of_study}</h4>
                        {!edu.is_completed && (
                          <span className="px-2 py-1 text-xs bg-warning/20 text-warning rounded">
                            In Progress
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{edu.institution_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDisplayDate(edu.from_month, edu.from_year, edu.to_month, edu.to_year, edu.is_present)}
                        {edu.institution_place && edu.institution_country && ` • ${edu.institution_place}, ${edu.institution_country}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Edit2 className="h-4 w-4 mr-1" />
                          Edit
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 ml-1" />
                          ) : (
                            <ChevronDown className="h-4 w-4 ml-1" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeEducation(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Expanded Edit View */}
                <CollapsibleContent>
                  <div className="p-4 space-y-6 border-t">
                    {/* Institution Information */}
                    <div className="space-y-4">
                      <h5 className="font-medium text-sm text-muted-foreground">Institution Information</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Institution Name *</Label>
                          <Input
                            value={edu.institution_name}
                            onChange={(e) => updateEducation(index, 'institution_name', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Place</Label>
                          <Input
                            value={edu.institution_place || ""}
                            onChange={(e) => updateEducation(index, 'institution_place', e.target.value)}
                            placeholder="City"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label>Country</Label>
                          <Select
                            value={edu.institution_country || ""}
                            onValueChange={(value) => updateEducation(index, 'institution_country', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select country" />
                            </SelectTrigger>
                            <SelectContent>
                              {COUNTRIES.map(country => (
                                <SelectItem key={country} value={country}>{country}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Degree Information */}
                    <div className="space-y-4">
                      <h5 className="font-medium text-sm text-muted-foreground">Degree Information</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Degree Type *</Label>
                          <Select
                            value={edu.degree_type}
                            onValueChange={(value) => updateEducation(index, 'degree_type', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select degree type" />
                            </SelectTrigger>
                            <SelectContent>
                              {DEGREE_TYPES.map(type => (
                                <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Degree/Certificate Title</Label>
                          <Input
                            value={edu.degree_or_certificate_title || ""}
                            onChange={(e) => updateEducation(index, 'degree_or_certificate_title', e.target.value)}
                            placeholder="e.g., Bachelor of Science in Computer Science"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label>Main Course of Study *</Label>
                          <Input
                            value={edu.main_course_of_study || ""}
                            onChange={(e) => updateEducation(index, 'main_course_of_study', e.target.value)}
                            placeholder="e.g., Computer Science, Economics, Engineering"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Period */}
                    <div className="space-y-4">
                      <h5 className="font-medium text-sm text-muted-foreground">Study Period</h5>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <Label>From Month</Label>
                          <Select
                            value={edu.from_month}
                            onValueChange={(value) => updateEducation(index, 'from_month', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Month" />
                            </SelectTrigger>
                            <SelectContent>
                              {MONTHS.map(month => (
                                <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>From Year</Label>
                          <Select
                            value={edu.from_year}
                            onValueChange={(value) => updateEducation(index, 'from_year', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Year" />
                            </SelectTrigger>
                            <SelectContent>
                              {YEARS.map(year => (
                                <SelectItem key={year.value} value={year.value}>{year.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>To Month</Label>
                          <Select
                            value={edu.to_month || ""}
                            onValueChange={(value) => updateEducation(index, 'to_month', value)}
                            disabled={edu.is_present}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Month" />
                            </SelectTrigger>
                            <SelectContent>
                              {MONTHS.map(month => (
                                <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>To Year</Label>
                          <Select
                            value={edu.to_year || ""}
                            onValueChange={(value) => updateEducation(index, 'to_year', value)}
                            disabled={edu.is_present}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Year" />
                            </SelectTrigger>
                            <SelectContent>
                              {YEARS.map(year => (
                                <SelectItem key={year.value} value={year.value}>{year.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`current-study-${index}`}
                            checked={edu.is_present}
                            onCheckedChange={(checked) => updateEducation(index, 'is_present', !!checked)}
                          />
                          <Label htmlFor={`current-study-${index}`}>Currently studying here</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`completed-${index}`}
                            checked={edu.is_completed}
                            onCheckedChange={(checked) => updateEducation(index, 'is_completed', !!checked)}
                          />
                          <Label htmlFor={`completed-${index}`}>Completed successfully</Label>
                        </div>
                      </div>
                    </div>

                    {/* Certificate Upload */}
                    <div className="space-y-4">
                      <div>
                        <Label>Certificate URL (optional)</Label>
                        <Input
                          value={edu.certificate_url || ""}
                          onChange={(e) => updateEducation(index, 'certificate_url', e.target.value)}
                          placeholder="Link to certificate or diploma"
                        />
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}

        {/* Add New Education */}
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 space-y-6">
          <h4 className="font-medium text-muted-foreground">Add Enhanced Education</h4>
          
          {/* Institution Information */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Institution Name *</Label>
                <Input
                  value={newEducation.institution_name}
                  onChange={(e) => setNewEducation({ ...newEducation, institution_name: e.target.value })}
                  placeholder="University or school name"
                />
              </div>
              <div>
                <Label>Place</Label>
                <Input
                  value={newEducation.institution_place}
                  onChange={(e) => setNewEducation({ ...newEducation, institution_place: e.target.value })}
                  placeholder="City"
                />
              </div>
              <div className="md:col-span-2">
                <Label>Country</Label>
                <Select
                  value={newEducation.institution_country}
                  onValueChange={(value) => setNewEducation({ ...newEducation, institution_country: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map(country => (
                      <SelectItem key={country} value={country}>{country}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Degree Information */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Degree Type *</Label>
                <Select
                  value={newEducation.degree_type}
                  onValueChange={(value) => setNewEducation({ ...newEducation, degree_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select degree type" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEGREE_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Degree/Certificate Title</Label>
                <Input
                  value={newEducation.degree_or_certificate_title}
                  onChange={(e) => setNewEducation({ ...newEducation, degree_or_certificate_title: e.target.value })}
                  placeholder="e.g., Bachelor of Science in Computer Science"
                />
              </div>
              <div className="md:col-span-2">
                <Label>Main Course of Study *</Label>
                <Input
                  value={newEducation.main_course_of_study}
                  onChange={(e) => setNewEducation({ ...newEducation, main_course_of_study: e.target.value })}
                  placeholder="e.g., Computer Science, Economics, Engineering"
                />
              </div>
            </div>
          </div>

          {/* Period */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label>From Month</Label>
                <Select
                  value={newEducation.from_month}
                  onValueChange={(value) => setNewEducation({ ...newEducation, from_month: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map(month => (
                      <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>From Year</Label>
                <Select
                  value={newEducation.from_year}
                  onValueChange={(value) => setNewEducation({ ...newEducation, from_year: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {YEARS.map(year => (
                      <SelectItem key={year.value} value={year.value}>{year.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>To Month</Label>
                <Select
                  value={newEducation.to_month}
                  onValueChange={(value) => setNewEducation({ ...newEducation, to_month: value })}
                  disabled={newEducation.is_present}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map(month => (
                      <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>To Year</Label>
                <Select
                  value={newEducation.to_year}
                  onValueChange={(value) => setNewEducation({ ...newEducation, to_year: value })}
                  disabled={newEducation.is_present}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {YEARS.map(year => (
                      <SelectItem key={year.value} value={year.value}>{year.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="new-current-study"
                  checked={newEducation.is_present}
                  onCheckedChange={(checked) => setNewEducation({ ...newEducation, is_present: !!checked })}
                />
                <Label htmlFor="new-current-study">Currently studying here</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="new-completed"
                  checked={newEducation.is_completed}
                  onCheckedChange={(checked) => setNewEducation({ ...newEducation, is_completed: !!checked })}
                />
                <Label htmlFor="new-completed">Completed successfully</Label>
              </div>
            </div>
          </div>

          <Button onClick={addEducation} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Enhanced Education
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
