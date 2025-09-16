import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Send, FileText, Briefcase } from "lucide-react";

const requisitionSchema = z.object({
  position_title: z.string().min(1, "Position title is required"),
  grade: z.string().min(1, "Grade is required"),
  unit_section_division: z.string().min(1, "Unit/Section/Division is required"),
  duty_station: z.string().min(1, "Duty station is required"),
  nature_of_position: z.string().min(1, "Nature of position is required"),
  start_date: z.string().optional(),
  positions_available: z.number().min(1, "At least 1 position required"),
  purpose_of_position: z.string().min(1, "Purpose of position is required"),
  objectives_of_programme: z.string().optional(),
  main_duties_responsibilities: z.string().min(1, "Main duties are required"),
  essential_experience: z.string().min(1, "Essential experience is required"),
  desirable_experience: z.string().optional(),
  essential_education: z.string().min(1, "Essential education is required"),
  desirable_education: z.string().optional(),
  confirmApprovals: z.boolean().refine(val => val === true, {
    message: "You must confirm that you have the required approvals"
  }),
});

type RequisitionFormData = z.infer<typeof requisitionSchema>;

export default function JobRequisitionForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, userRoles } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const form = useForm<RequisitionFormData>({
    resolver: zodResolver(requisitionSchema),
    defaultValues: {
      position_title: "",
      grade: "",
      unit_section_division: "",
      duty_station: "",
      nature_of_position: "",
      start_date: "",
      positions_available: 1,
      purpose_of_position: "",
      objectives_of_programme: "",
      main_duties_responsibilities: "",
      essential_experience: "",
      desirable_experience: "",
      essential_education: "",
      desirable_education: "",
      confirmApprovals: false,
    },
  });

  useEffect(() => {
    if (id && id !== 'new') {
      fetchRequisition();
    }
  }, [id]);

  const fetchRequisition = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('job_requisitions')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        form.reset({
          position_title: data.position_title || "",
          grade: data.grade || "",
          unit_section_division: data.unit_section_division || "",
          duty_station: data.duty_station || "",
          nature_of_position: data.nature_of_position || "",
          start_date: data.start_date || "",
          positions_available: data.positions_available || 1,
          purpose_of_position: data.purpose_of_position || "",
          objectives_of_programme: data.objectives_of_programme || "",
          main_duties_responsibilities: data.main_duties_responsibilities || "",
          essential_experience: data.essential_experience || "",
          desirable_experience: data.desirable_experience || "",
          essential_education: data.essential_education || "",
          desirable_education: data.desirable_education || "",
          confirmApprovals: true, // Assume already confirmed for existing requisitions
        });
      }
    } catch (error) {
      console.error('Error fetching requisition:', error);
      toast({
        title: "Error",
        description: "Failed to fetch requisition data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: RequisitionFormData, submit = false) => {
    try {
      setSaving(true);
      const formData = { ...data };
      delete formData.confirmApprovals; // Remove this field before saving

      if (id && id !== 'new') {
        // Update existing requisition
        const { error } = await supabase
          .from('job_requisitions')
          .update({
            ...formData,
            status: submit ? 'submitted' : 'draft',
          })
          .eq('id', id);

        if (error) throw error;
      } else {
        // Create new requisition
        const { data: newRequisition, error } = await supabase
          .from('job_requisitions')
          .insert({
            ...formData,
            created_by: user?.id,
            status: submit ? 'submitted' : 'draft',
          })
          .select()
          .single();

        if (error) throw error;

        // Generate reference number
        const { data: refData, error: refError } = await supabase
          .rpc('generate_requisition_reference');

        if (!refError && refData) {
          await supabase
            .from('job_requisitions')
            .update({ reference_number: refData })
            .eq('id', newRequisition.id);
        }

        navigate(`/requisitions/${newRequisition.id}`);
      }

      toast({
        title: "Success",
        description: submit ? "Requisition submitted successfully" : "Requisition saved as draft",
      });

      if (submit) {
        navigate('/requisitions');
      }
    } catch (error) {
      console.error('Error saving requisition:', error);
      toast({
        title: "Error",
        description: "Failed to save requisition",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const generatePDF = async () => {
    if (!id || id === 'new') {
      toast({
        title: "Error",
        description: "Please save the requisition first",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('generate-requisition-pdf', {
        body: { requisitionId: id }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "PDF generated successfully",
      });

      if (data?.pdfUrl) {
        window.open(data.pdfUrl, '_blank');
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF",
        variant: "destructive",
      });
    }
  };

  const convertToJob = async () => {
    if (!id || id === 'new') {
      toast({
        title: "Error",
        description: "Please save the requisition first",
        variant: "destructive",
      });
      return;
    }

    navigate(`/admin/jobs/new?from_requisition=${id}`);
  };

  if (!user || !userRoles.some(role => ['Admin', 'HR Assistant', 'Hiring Manager'].includes(role))) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-lg font-semibold">Access Denied</p>
              <p className="text-muted-foreground">You don't have permission to create job requisitions.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" onClick={() => navigate('/requisitions')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Requisitions
        </Button>
        <div>
          <h1 className="text-3xl font-bold">
            {id === 'new' ? 'New Job Requisition' : 'Edit Job Requisition'}
          </h1>
          <p className="text-muted-foreground">Create a position description request</p>
        </div>
      </div>

      <Form {...form}>
        <form className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Position Information</CardTitle>
              <CardDescription>Basic details about the position you're requesting</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="position_title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Position Title *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Senior ICT Analyst" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="grade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Grade *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select grade" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="P1">P1</SelectItem>
                          <SelectItem value="P2">P2</SelectItem>
                          <SelectItem value="P3">P3</SelectItem>
                          <SelectItem value="P4">P4</SelectItem>
                          <SelectItem value="P5">P5</SelectItem>
                          <SelectItem value="D1">D1</SelectItem>
                          <SelectItem value="D2">D2</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="unit_section_division"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit/Section/Division *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Talent Unit (MSHT)" {...field} />
                    </FormControl>
                    <FormDescription>
                      Provide the lowest level of group hierarchy with acronym
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="duty_station"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duty Station *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Valencia, Spain" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="nature_of_position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nature of Position *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select nature" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Fixed Term">Fixed Term</SelectItem>
                          <SelectItem value="Temporary">Temporary</SelectItem>
                          <SelectItem value="Consultant">Consultant</SelectItem>
                          <SelectItem value="Permanent">Permanent</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="start_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="positions_available"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Number of Positions *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1" 
                          {...field} 
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Position Description</CardTitle>
              <CardDescription>Detailed description of the role and responsibilities</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="purpose_of_position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purpose of the Position *</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe briefly the context and main purpose of the position..."
                        className="min-h-[100px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      If the position is dependent on specific client/project funding, please specify it.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="objectives_of_programme"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Objectives of the Programme</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe the programme objectives and how this position contributes..."
                        className="min-h-[100px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="main_duties_responsibilities"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Main Duties and Responsibilities *</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="List the main duties and responsibilities. Use WHAT, WHY, HOW structure for each duty..."
                        className="min-h-[200px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Structure each duty to answer: WHAT (active verb), WHY (purpose and scope), HOW (process and tasks).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Requirements</CardTitle>
              <CardDescription>Qualifications and experience needed for this position</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="essential_experience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Essential Experience *</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="e.g., At least 5 years of experience in ICT systems..."
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="desirable_experience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Desirable Experience</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Additional experience that would be beneficial..."
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="essential_education"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Essential Education *</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="e.g., Advanced university degree in Computer Science..."
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="desirable_education"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Desirable Education</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Additional qualifications that would be beneficial..."
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Approval Confirmation</CardTitle>
              <CardDescription>Confirm that you have the necessary approvals before submitting</CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="confirmApprovals"
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
                        I confirm that I have obtained approval from the Chief of Division, Finance Controller, and Deputy Director before submitting this requisition.
                      </FormLabel>
                      <FormDescription>
                        This confirmation is required before the requisition can be submitted for final approval.
                      </FormDescription>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-between items-center pt-6">
            <div className="flex gap-2">
              {id && id !== 'new' && (
                <>
                  <Button type="button" variant="outline" onClick={generatePDF}>
                    <FileText className="h-4 w-4 mr-2" />
                    Generate PDF
                  </Button>
                  <Button type="button" variant="outline" onClick={convertToJob}>
                    <Briefcase className="h-4 w-4 mr-2" />
                    Convert to Job
                  </Button>
                </>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onSubmit(form.getValues(), false)}
                disabled={saving}
              >
                <Save className="h-4 w-4 mr-2" />
                Save Draft
              </Button>
              <Button
                type="button"
                onClick={() => onSubmit(form.getValues(), true)}
                disabled={saving || !form.getValues('confirmApprovals')}
              >
                <Send className="h-4 w-4 mr-2" />
                Submit for Approval
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}