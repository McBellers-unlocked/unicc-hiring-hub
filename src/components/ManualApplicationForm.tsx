import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, User, GraduationCap, Briefcase, Save } from 'lucide-react';
import { z } from 'zod';

const manualApplicationSchema = z.object({
  // Personal Information
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  
  // Education
  degreeType: z.string().min(1, "Degree type is required"),
  fieldOfStudy: z.string().min(1, "Field of study is required"),
  institution: z.string().min(1, "Institution is required"),
  dateAwarded: z.string().min(1, "Date awarded is required"),
  
  // Most Recent Job
  mostRecentJobTitle: z.string().min(1, "Most recent job title is required"),
  mostRecentOrganization: z.string().min(1, "Most recent organization is required"),
  mostRecentStartDate: z.string().min(1, "Start date is required"),
  mostRecentEndDate: z.string().optional(),
  mostRecentIsCurrent: z.boolean().default(false),
  
  // Previous Job (optional)
  previousJobTitle: z.string().optional(),
  previousOrganization: z.string().optional(),
  previousStartDate: z.string().optional(),
  previousEndDate: z.string().optional(),
});

type ManualApplicationData = z.infer<typeof manualApplicationSchema>;

export default function ManualApplicationForm() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { userRoles } = useAuth();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState<ManualApplicationData>({
    name: '',
    email: '',
    phone: '',
    degreeType: '',
    fieldOfStudy: '',
    institution: '',
    dateAwarded: '',
    mostRecentJobTitle: '',
    mostRecentOrganization: '',
    mostRecentStartDate: '',
    mostRecentEndDate: '',
    mostRecentIsCurrent: false,
    previousJobTitle: '',
    previousOrganization: '',
    previousStartDate: '',
    previousEndDate: '',
  });
  
  const [loading, setLoading] = useState(false);
  const [job, setJob] = useState<any>(null);

  // Check access permissions
  const hasAccess = userRoles.includes('Admin') || userRoles.includes('HR Assistant');

  // Ensure this is only for the Associate Policy (Legal) Officer role
  const ASSOCIATE_POLICY_JOB_ID = 'aacafec6-4d2b-4a3b-826a-5608ec28418e';
  
  useEffect(() => {
    if (hasAccess && jobId === ASSOCIATE_POLICY_JOB_ID) {
      fetchJob();
    }
  }, [hasAccess, jobId]);

  const fetchJob = async () => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('id, title, org_unit')
        .eq('id', jobId)
        .single();

      if (error) throw error;
      setJob(data);
    } catch (error) {
      console.error('Error fetching job:', error);
      toast({
        title: "Error",
        description: "Failed to load job details",
        variant: "destructive",
      });
    }
  };

  if (!hasAccess) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-destructive mb-4">Access Denied</h1>
            <p className="text-muted-foreground">You don't have permission to access this page.</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (jobId !== ASSOCIATE_POLICY_JOB_ID) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-destructive mb-4">Invalid Job</h1>
            <p className="text-muted-foreground">Manual application entry is only available for the Associate Policy (Legal) Officer role.</p>
            <Button onClick={() => navigate('/admin/applications')} className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Applications
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  const handleInputChange = (field: keyof ManualApplicationData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validate form data
      const validatedData = manualApplicationSchema.parse(formData);
      setLoading(true);

      // Create candidate record
      const candidateData = {
        name: validatedData.name,
        email: validatedData.email,
        phone: validatedData.phone || null,
        
        // Education data
        education: [{
          degree_type: validatedData.degreeType,
          field_of_study: validatedData.fieldOfStudy,
          institution: validatedData.institution,
          year_awarded: validatedData.dateAwarded,
          end_date: validatedData.dateAwarded
        }],
        
        // Work experience data
        work_experience: [
          // Most recent job
          {
            title: validatedData.mostRecentJobTitle,
            company: validatedData.mostRecentOrganization,
            start_date: validatedData.mostRecentStartDate,
            end_date: validatedData.mostRecentIsCurrent ? null : validatedData.mostRecentEndDate,
            is_present: validatedData.mostRecentIsCurrent
          },
          // Previous job (if provided)
          ...(validatedData.previousJobTitle ? [{
            title: validatedData.previousJobTitle,
            company: validatedData.previousOrganization,
            start_date: validatedData.previousStartDate,
            end_date: validatedData.previousEndDate
          }] : [])
        ].filter(job => job.title), // Remove empty jobs
        
        // Additional fields
        professional_summary: 'Manually entered application',
        availability_status: 'available'
      };

      const { data: candidate, error: candidateError } = await supabase
        .from('candidates')
        .insert(candidateData)
        .select()
        .single();

      if (candidateError) throw candidateError;

      // Create application record
      const applicationData = {
        job_id: jobId,
        candidate_id: candidate.id,
        status: 'Application' as const,
        phf_completed: true,
        source: 'manual_entry',
        phf_data: {
          personal_info: {
            name: validatedData.name,
            email: validatedData.email,
            phone: validatedData.phone
          },
          education: {
            degree_type: validatedData.degreeType,
            field_of_study: validatedData.fieldOfStudy,
            institution: validatedData.institution,
            date_awarded: validatedData.dateAwarded
          },
          work_experience: {
            most_recent: {
              job_title: validatedData.mostRecentJobTitle,
              organization: validatedData.mostRecentOrganization,
              start_date: validatedData.mostRecentStartDate,
              end_date: validatedData.mostRecentIsCurrent ? 'Present' : validatedData.mostRecentEndDate,
              is_current: validatedData.mostRecentIsCurrent
            },
            previous: validatedData.previousJobTitle ? {
              job_title: validatedData.previousJobTitle,
              organization: validatedData.previousOrganization,
              start_date: validatedData.previousStartDate,
              end_date: validatedData.previousEndDate
            } : null
          }
        }
      };

      const { data: application, error: applicationError } = await supabase
        .from('applications')
        .insert(applicationData)
        .select()
        .single();

      if (applicationError) throw applicationError;

      toast({
        title: "Success",
        description: "Manual application created successfully",
      });

      navigate(`/admin/applications/${application.id}`);
    } catch (error) {
      console.error('Error creating application:', error);
      
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        toast({
          title: "Validation Error",
          description: firstError.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to create application",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={() => navigate('/admin/applications')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Create Manual Application</h1>
              <p className="text-muted-foreground">{job?.title || 'Associate Policy (Legal) Officer'}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Enter full name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="Enter email address"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="Enter phone number (optional)"
                />
              </div>
            </CardContent>
          </Card>

          {/* Education */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5" />
                Education (Most Recent Degree)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="degreeType">Degree Type *</Label>
                  <Select value={formData.degreeType} onValueChange={(value) => handleInputChange('degreeType', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select degree type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bachelor's">Bachelor's</SelectItem>
                      <SelectItem value="Master's">Master's</SelectItem>
                      <SelectItem value="PhD">PhD</SelectItem>
                      <SelectItem value="JD">JD (Juris Doctor)</SelectItem>
                      <SelectItem value="LLB">LLB (Bachelor of Laws)</SelectItem>
                      <SelectItem value="LLM">LLM (Master of Laws)</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fieldOfStudy">Field of Study *</Label>
                  <Input
                    id="fieldOfStudy"
                    value={formData.fieldOfStudy}
                    onChange={(e) => handleInputChange('fieldOfStudy', e.target.value)}
                    placeholder="e.g., Law, Political Science"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="institution">Institution *</Label>
                  <Input
                    id="institution"
                    value={formData.institution}
                    onChange={(e) => handleInputChange('institution', e.target.value)}
                    placeholder="University/Institution name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateAwarded">Date Awarded *</Label>
                  <Input
                    id="dateAwarded"
                    type="month"
                    value={formData.dateAwarded}
                    onChange={(e) => handleInputChange('dateAwarded', e.target.value)}
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Most Recent Job */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                Most Recent Job Experience
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mostRecentJobTitle">Job Title *</Label>
                  <Input
                    id="mostRecentJobTitle"
                    value={formData.mostRecentJobTitle}
                    onChange={(e) => handleInputChange('mostRecentJobTitle', e.target.value)}
                    placeholder="Current/most recent position"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mostRecentOrganization">Organization *</Label>
                  <Input
                    id="mostRecentOrganization"
                    value={formData.mostRecentOrganization}
                    onChange={(e) => handleInputChange('mostRecentOrganization', e.target.value)}
                    placeholder="Company/Organization name"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mostRecentStartDate">Start Date *</Label>
                  <Input
                    id="mostRecentStartDate"
                    type="month"
                    value={formData.mostRecentStartDate}
                    onChange={(e) => handleInputChange('mostRecentStartDate', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mostRecentEndDate">End Date</Label>
                  <Input
                    id="mostRecentEndDate"
                    type="month"
                    value={formData.mostRecentEndDate}
                    onChange={(e) => handleInputChange('mostRecentEndDate', e.target.value)}
                    disabled={formData.mostRecentIsCurrent}
                    placeholder={formData.mostRecentIsCurrent ? "Present" : ""}
                  />
                </div>
                <div className="space-y-2 flex items-end">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.mostRecentIsCurrent}
                      onChange={(e) => {
                        handleInputChange('mostRecentIsCurrent', e.target.checked);
                        if (e.target.checked) {
                          handleInputChange('mostRecentEndDate', '');
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm">Current position</span>
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Previous Job (Optional) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                Previous Job Experience (Optional)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="previousJobTitle">Job Title</Label>
                  <Input
                    id="previousJobTitle"
                    value={formData.previousJobTitle}
                    onChange={(e) => handleInputChange('previousJobTitle', e.target.value)}
                    placeholder="Previous position title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="previousOrganization">Organization</Label>
                  <Input
                    id="previousOrganization"
                    value={formData.previousOrganization}
                    onChange={(e) => handleInputChange('previousOrganization', e.target.value)}
                    placeholder="Previous company/organization"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="previousStartDate">Start Date</Label>
                  <Input
                    id="previousStartDate"
                    type="month"
                    value={formData.previousStartDate}
                    onChange={(e) => handleInputChange('previousStartDate', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="previousEndDate">End Date</Label>
                  <Input
                    id="previousEndDate"
                    type="month"
                    value={formData.previousEndDate}
                    onChange={(e) => handleInputChange('previousEndDate', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/admin/applications')}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Create Application
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}