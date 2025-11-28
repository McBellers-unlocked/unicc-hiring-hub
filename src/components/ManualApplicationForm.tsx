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
import { ArrowLeft, User, GraduationCap, Briefcase, Save, Plus, Minus, FileUp } from 'lucide-react';
import { z } from 'zod';
import { EDUCATION_LEVELS } from '@/lib/educationLevels';

const educationSchema = z.object({
  degreeType: z.string().min(1, "Degree type is required"),
  fieldOfStudy: z.string().min(1, "Field of study is required"),
  institution: z.string().min(1, "Institution is required"),
  dateAwarded: z.string().min(1, "Date awarded is required"),
});

const workExperienceSchema = z.object({
  jobTitle: z.string().min(1, "Job title is required"),
  organization: z.string().min(1, "Organization is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
  isCurrent: z.boolean().default(false),
});

const manualApplicationSchema = z.object({
  // Personal Information
  name: z.string().min(1, "Name is required"),
  email: z.string().optional().refine(
    (val) => !val || val === "" || z.string().email().safeParse(val).success,
    { message: "Please enter a valid email address" }
  ),
  phone: z.string().optional(),
  
  // Education (array)
  education: z.array(educationSchema).min(1, "At least one education entry is required"),
  
  // Work Experience (array)
  workExperience: z.array(workExperienceSchema).min(1, "At least one work experience entry is required"),
});

type EducationEntry = z.infer<typeof educationSchema>;
type WorkExperienceEntry = z.infer<typeof workExperienceSchema>;

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
    education: [{
      degreeType: '',
      fieldOfStudy: '',
      institution: '',
      dateAwarded: '',
    }],
    workExperience: [{
      jobTitle: '',
      organization: '',
      startDate: '',
      endDate: '',
      isCurrent: false,
    }],
  });
  
  const [loading, setLoading] = useState(false);
  const [job, setJob] = useState<any>(null);
  const [phfFile, setPhfFile] = useState<File | null>(null);
  const [motivationFile, setMotivationFile] = useState<File | null>(null);
  const [uploadingFiles, setUploadingFiles] = useState(false);

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
        .maybeSingle();

      if (error) {
        console.error('Job fetch error:', error);
        throw error;
      }
      if (!data) {
        console.error('No job found with ID:', jobId);
        toast({
          title: "Error",
          description: "Job not found",
          variant: "destructive",
        });
        return;
      }
      console.log('Job loaded successfully:', data);
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
            <Button onClick={() => navigate('/applications')} className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Applications
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  const handleInputChange = (field: keyof ManualApplicationData, value: string | boolean | EducationEntry[] | WorkExperienceEntry[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addEducationEntry = () => {
    setFormData(prev => ({
      ...prev,
      education: [...prev.education, {
        degreeType: '',
        fieldOfStudy: '',
        institution: '',
        dateAwarded: '',
      }]
    }));
  };

  const removeEducationEntry = (index: number) => {
    if (formData.education.length > 1) {
      setFormData(prev => ({
        ...prev,
        education: prev.education.filter((_, i) => i !== index)
      }));
    }
  };

  const updateEducationEntry = (index: number, field: keyof EducationEntry, value: string) => {
    setFormData(prev => ({
      ...prev,
      education: prev.education.map((edu, i) => 
        i === index ? { ...edu, [field]: value } : edu
      )
    }));
  };

  const addWorkExperienceEntry = () => {
    setFormData(prev => ({
      ...prev,
      workExperience: [...prev.workExperience, {
        jobTitle: '',
        organization: '',
        startDate: '',
        endDate: '',
        isCurrent: false,
      }]
    }));
  };

  const removeWorkExperienceEntry = (index: number) => {
    if (formData.workExperience.length > 1) {
      setFormData(prev => ({
        ...prev,
        workExperience: prev.workExperience.filter((_, i) => i !== index)
      }));
    }
  };

  const updateWorkExperienceEntry = (index: number, field: keyof WorkExperienceEntry, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      workExperience: prev.workExperience.map((work, i) => 
        i === index ? { ...work, [field]: value } : work
      )
    }));
  };

  const uploadFile = async (file: File, folder: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    const { error } = await supabase.storage
      .from('application-files')
      .upload(filePath, file);

    if (error) throw error;

    const { data } = supabase.storage
      .from('application-files')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validate form data
      const validatedData = manualApplicationSchema.parse(formData);
      setLoading(true);

      // Upload files if provided
      let phfUrl = null;
      let motivationUrl = null;
      
      if (phfFile || motivationFile) {
        setUploadingFiles(true);
        try {
          if (phfFile) {
            phfUrl = await uploadFile(phfFile, 'phf-documents');
          }
          if (motivationFile) {
            motivationUrl = await uploadFile(motivationFile, 'motivation-statements');
          }
        } catch (uploadError) {
          console.error('File upload error:', uploadError);
          toast({
            title: "Upload Error",
            description: "Failed to upload documents. Please try again.",
            variant: "destructive",
          });
          return;
        } finally {
          setUploadingFiles(false);
        }
      }

      // Create candidate record
      const candidateData = {
        name: validatedData.name,
        email: validatedData.email || `no-email-${Date.now()}@manual-entry.local`,
        phone: validatedData.phone || null,
        
        // Education data (multiple entries)
        education: validatedData.education.map(edu => ({
          degree_type: edu.degreeType,
          field_of_study: edu.fieldOfStudy,
          institution: edu.institution,
          year_awarded: edu.dateAwarded,
          end_date: edu.dateAwarded
        })),
        
        // Work experience data
        work_experience: validatedData.workExperience.map(work => ({
          title: work.jobTitle,
          company: work.organization,
          start_date: work.startDate,
          end_date: work.isCurrent ? null : work.endDate,
          is_present: work.isCurrent
        })),
        
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
        files: {
          ...(phfUrl && { phf_document: phfUrl }),
          ...(motivationUrl && { motivation_statement: motivationUrl })
        },
        phf_data: {
          personal_info: {
            name: validatedData.name,
            email: validatedData.email,
            phone: validatedData.phone
          },
          education: validatedData.education,
          work_experience: validatedData.workExperience
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
      } else if (error?.message) {
        toast({
          title: "Database Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to create application. Please check the console for details.",
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
            <Button variant="outline" onClick={() => navigate('/applications')}>
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
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="Enter email address"
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
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5" />
                  Education
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addEducationEntry}
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Education
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {formData.education.map((edu, index) => (
                <div key={index} className="space-y-4 p-4 border rounded-lg relative">
                  {formData.education.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeEducationEntry(index)}
                      className="absolute top-2 right-2 text-destructive hover:text-destructive"
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                  )}
                  <h4 className="font-medium text-foreground">Education {index + 1}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`degreeType-${index}`}>Level of Education *</Label>
                      <Select 
                        value={edu.degreeType} 
                        onValueChange={(value) => updateEducationEntry(index, 'degreeType', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select level of education" />
                        </SelectTrigger>
                        <SelectContent>
                          {EDUCATION_LEVELS.map(level => (
                            <SelectItem key={level.value} value={level.value}>
                              {level.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`fieldOfStudy-${index}`}>Field of Study *</Label>
                      <Input
                        id={`fieldOfStudy-${index}`}
                        value={edu.fieldOfStudy}
                        onChange={(e) => updateEducationEntry(index, 'fieldOfStudy', e.target.value)}
                        placeholder="e.g., Law, Political Science"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`institution-${index}`}>Institution *</Label>
                      <Input
                        id={`institution-${index}`}
                        value={edu.institution}
                        onChange={(e) => updateEducationEntry(index, 'institution', e.target.value)}
                        placeholder="University/Institution name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`dateAwarded-${index}`}>Date Awarded *</Label>
                      <Input
                        id={`dateAwarded-${index}`}
                        type="month"
                        value={edu.dateAwarded}
                        onChange={(e) => updateEducationEntry(index, 'dateAwarded', e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Work Experience */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5" />
                  Work Experience
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addWorkExperienceEntry}
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Work Experience
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {formData.workExperience.map((work, index) => (
                <div key={index} className="space-y-4 p-4 border rounded-lg relative">
                  {formData.workExperience.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeWorkExperienceEntry(index)}
                      className="absolute top-2 right-2 text-destructive hover:text-destructive"
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                  )}
                  <h4 className="font-medium text-foreground">Work Experience {index + 1}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`jobTitle-${index}`}>Job Title *</Label>
                      <Input
                        id={`jobTitle-${index}`}
                        value={work.jobTitle}
                        onChange={(e) => updateWorkExperienceEntry(index, 'jobTitle', e.target.value)}
                        placeholder="Position title"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`organization-${index}`}>Organization *</Label>
                      <Input
                        id={`organization-${index}`}
                        value={work.organization}
                        onChange={(e) => updateWorkExperienceEntry(index, 'organization', e.target.value)}
                        placeholder="Company/Organization name"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`startDate-${index}`}>Start Date *</Label>
                      <Input
                        id={`startDate-${index}`}
                        type="month"
                        value={work.startDate}
                        onChange={(e) => updateWorkExperienceEntry(index, 'startDate', e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`endDate-${index}`}>End Date</Label>
                      <Input
                        id={`endDate-${index}`}
                        type="month"
                        value={work.endDate}
                        onChange={(e) => updateWorkExperienceEntry(index, 'endDate', e.target.value)}
                        disabled={work.isCurrent}
                        placeholder={work.isCurrent ? "Present" : ""}
                      />
                    </div>
                    <div className="space-y-2 flex items-end">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={work.isCurrent}
                          onChange={(e) => {
                            updateWorkExperienceEntry(index, 'isCurrent', e.target.checked);
                            if (e.target.checked) {
                              updateWorkExperienceEntry(index, 'endDate', '');
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-sm">Current position</span>
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Document Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileUp className="w-5 h-5" />
                Document Upload
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phf-upload">PHF Document</Label>
                  <Input
                    id="phf-upload"
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => setPhfFile(e.target.files?.[0] || null)}
                    className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/80"
                  />
                  {phfFile && (
                    <p className="text-sm text-muted-foreground">
                      Selected: {phfFile.name}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="motivation-upload">Motivation Statement</Label>
                  <Input
                    id="motivation-upload"
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => setMotivationFile(e.target.files?.[0] || null)}
                    className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/80"
                  />
                  {motivationFile && (
                    <p className="text-sm text-muted-foreground">
                      Selected: {motivationFile.name}
                    </p>
                  )}
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Accepted formats: PDF, DOC, DOCX (max 10MB per file)
              </p>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/applications')}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || uploadingFiles}>
              {loading || uploadingFiles ? (
                <>
                  <Save className="w-4 h-4 mr-2 animate-spin" />
                  {uploadingFiles ? 'Uploading...' : 'Creating...'}
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