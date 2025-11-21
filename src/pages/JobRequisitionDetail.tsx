import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, FileText, Briefcase, CheckCircle, Clock, MessageSquare, Download, Mail } from "lucide-react";
import { format } from "date-fns";
import { InlineTrackChanges } from "@/components/InlineTrackChanges";

interface JobRequisition {
  id: string;
  reference_number: string;
  position_title: string;
  grade: string;
  unit_section_division: string;
  duty_station: string;
  nature_of_position: string;
  intern_modality: string;
  start_date: string;
  positions_available: number;
  purpose_of_position: string;
  objectives_of_programme: string;
  main_duties_responsibilities: string;
  essential_experience: string;
  desirable_experience: string;
  essential_education: string;
  desirable_education: string;
  language_requirements: any;
  global_competencies: string[] | any;
  core_competencies: string[] | any;
  leadership_competencies: string[] | any;
  management_competencies: string[] | any;
  status: string;
  created_at: string;
  finance_controller_approval: boolean;
  chief_of_division_approval: boolean;
  deputy_director_approval: boolean;
  director_approval: boolean;
  hr_reviewed: boolean;
  hr_reviewed_by: string;
  hr_reviewed_at: string;
  hr_comments: string;
  hr_final_review_completed: boolean;
  hiring_manager_confirmed_hr_changes: boolean;
  hiring_manager_confirmed_at: string;
  pdf_url: string;
  converted_to_job_id: string;
  comments: any;
  created_by: string;
  hr_original_data: any;
  hr_changes: any;
  hr_change_summary: string;
}

export default function JobRequisitionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, userRoles } = useAuth();
  const { toast } = useToast();
  const [requisition, setRequisition] = useState<JobRequisition | null>(null);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [addingComment, setAddingComment] = useState(false);

  useEffect(() => {
    if (id) {
      fetchRequisition();
    }
  }, [id]);

  const fetchRequisition = async () => {
    try {
      let query = supabase
        .from('job_requisitions')
        .select('*')
        .eq('id', id);

      // If user is only a hiring manager (not admin/HR), restrict to their own requisitions
      if (userRoles.includes('Hiring Manager') && !userRoles.includes('Admin') && !userRoles.includes('HR Assistant')) {
        query = query.eq('created_by', user?.id);
      }

      const { data, error } = await query.single();

      if (error) throw error;
      setRequisition(data);
    } catch (error) {
      console.error('Error fetching requisition:', error);
      toast({
        title: "Error",
        description: "Failed to fetch requisition details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addComment = async () => {
    if (!newComment.trim() || !requisition) return;

    try {
      setAddingComment(true);
      const comments = Array.isArray(requisition.comments) ? requisition.comments : [];
      comments.push({
        id: Date.now(),
        text: newComment,
        author: user?.email,
        timestamp: new Date().toISOString(),
      });

      const { error } = await supabase
        .from('job_requisitions')
        .update({ comments })
        .eq('id', requisition.id);

      if (error) throw error;

      setRequisition({ ...requisition, comments });
      setNewComment("");
      
      toast({
        title: "Success",
        description: "Comment added successfully",
      });
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        title: "Error",
        description: "Failed to add comment",
        variant: "destructive",
      });
    } finally {
      setAddingComment(false);
    }
  };

  const generatePDF = async () => {
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

  const testEmailNotification = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('test-email-notification', {
        body: {}
      });

      if (error) throw error;

      toast({
        title: "Test Email Sent",
        description: "Check valente@unicc.org for the test email!",
      });
    } catch (error) {
      console.error('Error sending test email:', error);
      toast({
        title: "Error",
        description: "Failed to send test email",
        variant: "destructive",
      });
    }
  };

  const convertToJob = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('convert-requisition-to-job', {
        body: { requisitionId: id }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: data.message || "Successfully converted to job posting",
      });

      if (data?.jobId) {
        navigate(`/admin/jobs/${data.jobId}/edit`);
      }
    } catch (error) {
      console.error('Error converting to job:', error);
      toast({
        title: "Error",
        description: "Failed to convert to job posting",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!requisition) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-lg font-semibold">Requisition Not Found</p>
              <p className="text-muted-foreground">The requested job requisition could not be found.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusBadge = () => {
    if (requisition.converted_to_job_id) {
      return <Badge variant="default" className="bg-green-500">Converted to Job</Badge>;
    }
    
    if (requisition.director_approval) {
      return <Badge variant="default" className="bg-blue-500">Director Approved</Badge>;
    }
    
    const approvals = [
      requisition.finance_controller_approval,
      requisition.chief_of_division_approval,
      requisition.deputy_director_approval,
    ];
    
    const approvedCount = approvals.filter(Boolean).length;
    
    if (approvedCount === 3) {
      return <Badge variant="default" className="bg-amber-500">Awaiting Director</Badge>;
    }
    
    if (approvedCount > 0) {
      return <Badge variant="secondary">Partially Approved ({approvedCount}/3)</Badge>;
    }
    
    return <Badge variant="outline">Pending Approval</Badge>;
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <Button variant="outline" onClick={() => navigate('/requisitions')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Requisitions
          </Button>
          <div className="flex gap-2">
          {/* Continue PD Button for Incomplete Drafts */}
          {(requisition.status === 'initial_request_draft' || requisition.status === 'draft' || requisition.status === 'pd_draft') &&
           user?.id === requisition.created_by && (
            <Button onClick={() => {
              if (requisition.status === 'initial_request_draft') {
                navigate(`/requisitions/initial/${requisition.id}`);
              } else {
                navigate(`/requisitions/${requisition.id}/edit`);
              }
            }}>
              <FileText className="h-4 w-4 mr-2" />
              Continue PD
            </Button>
          )}
          
          {/* HR Final Review button - for HR to review after hiring manager approval */}
          {requisition.status === 'hr_final_review' && (userRoles.includes('Admin') || userRoles.includes('HR Assistant')) && (
            <Button
              variant="default"
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => navigate(`/requisitions/${requisition.id}/hr-edit`)}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              HR Final Review & Send to Chief
            </Button>
          )}
          
          {/* Edit button - hiring managers can only edit drafts or amendments */}
          {(userRoles.includes('Admin') || userRoles.includes('HR Assistant') || 
           (userRoles.includes('Hiring Manager') && requisition.created_by === user?.id && 
            (requisition.status === 'draft' || requisition.status === 'hr_amendments'))) && (
            <Button variant="outline" onClick={() => navigate(`/requisitions/${requisition.id}/edit`)}>
              Edit
            </Button>
          )}
          
          {/* Convert to Job - only for Admin and HR Assistant */}
          {requisition.director_approval && !requisition.converted_to_job_id && 
           (userRoles.includes('Admin') || userRoles.includes('HR Assistant')) && (
            <Button onClick={convertToJob}>
              <Briefcase className="h-4 w-4 mr-2" />
              Convert to Job
            </Button>
          )}
          </div>
        </div>
        
        <div className="mt-4 space-y-2">
          <h1 className="text-3xl font-bold">{requisition.position_title}</h1>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>Ref: {requisition.reference_number}</span>
            <span>•</span>
            <span>Created {format(new Date(requisition.created_at), 'MMM dd, yyyy')}</span>
            <span>•</span>
            {getStatusBadge()}
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Position Information */}
        <Card>
          <CardHeader>
            <CardTitle>Position Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Grade</label>
                <p>{requisition.grade}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Unit/Section/Division</label>
                <p>{requisition.unit_section_division}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Duty Station</label>
                <p>{
                  (() => {
                    try {
                      const remoteRegion = requisition.comments?.remote_region;
                      if (typeof requisition.duty_station === 'string') {
                        const parsed = JSON.parse(requisition.duty_station);
                        if (Array.isArray(parsed)) {
                          // Format "Remote" with region if available
                          const formatted = parsed.map(station => 
                            station === 'Remote' && remoteRegion ? `Remote (${remoteRegion})` : station
                          );
                          return formatted.join(', ');
                        }
                        return String(parsed);
                      } else if (Array.isArray(requisition.duty_station)) {
                        const formatted = (requisition.duty_station as string[]).map(station => 
                          station === 'Remote' && remoteRegion ? `Remote (${remoteRegion})` : station
                        );
                        return formatted.join(', ');
                      } else {
                        return String(requisition.duty_station || 'Not specified');
                      }
                    } catch {
                      return String(requisition.duty_station || 'Not specified');
                    }
                  })()
                }</p>
              </div>
              {requisition.nature_of_position === 'Individual Consultant' && requisition.comments?.consultancy_level && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Consultancy Level</label>
                  <p>{requisition.comments.consultancy_level}</p>
                </div>
              )}
              {requisition.nature_of_position === 'Intern' && requisition.intern_modality && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Modality</label>
                  <p>{requisition.intern_modality}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Nature of Position</label>
                <p>{requisition.nature_of_position}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Start Date</label>
                <p>{requisition.start_date ? format(new Date(requisition.start_date), 'MMM dd, yyyy') : 'Not specified'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Number of Positions</label>
                <p>{requisition.positions_available}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Position Description */}
        <Card>
          <CardHeader>
            <CardTitle>Position Description</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Purpose of the Position</label>
              {(() => {
                const hrChange = Array.isArray(requisition.hr_changes) && 
                  requisition.hr_changes.find((c: any) => c.field === 'purpose_of_position');
                return hrChange ? (
                  <div className="mt-1">
                    <InlineTrackChanges
                      fieldLabel=""
                      originalValue={hrChange.originalValue}
                      newValue={hrChange.newValue}
                      showToggle={false}
                    />
                  </div>
                ) : (
                  <p className="mt-1 whitespace-pre-wrap">{requisition.purpose_of_position}</p>
                );
              })()}
            </div>
            
            {requisition.objectives_of_programme && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Objectives of the Programme</label>
                {(() => {
                  const hrChange = Array.isArray(requisition.hr_changes) && 
                    requisition.hr_changes.find((c: any) => c.field === 'objectives_of_programme');
                  return hrChange ? (
                    <div className="mt-1">
                      <InlineTrackChanges
                        fieldLabel=""
                        originalValue={hrChange.originalValue}
                        newValue={hrChange.newValue}
                        showToggle={false}
                      />
                    </div>
                  ) : (
                    <p className="mt-1 whitespace-pre-wrap">{requisition.objectives_of_programme}</p>
                  );
                })()}
              </div>
            )}
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Main Duties and Responsibilities</label>
              {(() => {
                const hrChange = Array.isArray(requisition.hr_changes) && 
                  requisition.hr_changes.find((c: any) => c.field === 'main_duties_responsibilities');
                return hrChange ? (
                  <div className="mt-1">
                    <InlineTrackChanges
                      fieldLabel=""
                      originalValue={hrChange.originalValue}
                      newValue={hrChange.newValue}
                      showToggle={false}
                    />
                  </div>
                ) : (
                  <p className="mt-1 whitespace-pre-wrap">{requisition.main_duties_responsibilities}</p>
                );
              })()}
            </div>
          </CardContent>
        </Card>

        {/* Requirements */}
        <Card>
          <CardHeader>
            <CardTitle>Requirements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Essential Experience</label>
                {(() => {
                  const hrChange = Array.isArray(requisition.hr_changes) && 
                    requisition.hr_changes.find((c: any) => c.field === 'essential_experience');
                  return hrChange ? (
                    <div className="mt-1">
                      <InlineTrackChanges
                        fieldLabel=""
                        originalValue={hrChange.originalValue}
                        newValue={hrChange.newValue}
                        showToggle={false}
                      />
                    </div>
                  ) : (
                    <p className="mt-1 whitespace-pre-wrap">{requisition.essential_experience}</p>
                  );
                })()}
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Desirable Experience</label>
                {(() => {
                  const hrChange = Array.isArray(requisition.hr_changes) && 
                    requisition.hr_changes.find((c: any) => c.field === 'desirable_experience');
                  return hrChange ? (
                    <div className="mt-1">
                      <InlineTrackChanges
                        fieldLabel=""
                        originalValue={hrChange.originalValue}
                        newValue={hrChange.newValue}
                        showToggle={false}
                      />
                    </div>
                  ) : (
                    <p className="mt-1 whitespace-pre-wrap">{requisition.desirable_experience || 'None specified'}</p>
                  );
                })()}
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Essential Education</label>
                {(() => {
                  const hrChange = Array.isArray(requisition.hr_changes) && 
                    requisition.hr_changes.find((c: any) => c.field === 'essential_education');
                  return hrChange ? (
                    <div className="mt-1">
                      <InlineTrackChanges
                        fieldLabel=""
                        originalValue={hrChange.originalValue}
                        newValue={hrChange.newValue}
                        showToggle={false}
                      />
                    </div>
                  ) : (
                    <p className="mt-1 whitespace-pre-wrap">{requisition.essential_education}</p>
                  );
                })()}
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Desirable Education</label>
                {(() => {
                  const hrChange = Array.isArray(requisition.hr_changes) && 
                    requisition.hr_changes.find((c: any) => c.field === 'desirable_education');
                  return hrChange ? (
                    <div className="mt-1">
                      <InlineTrackChanges
                        fieldLabel=""
                        originalValue={hrChange.originalValue}
                        newValue={hrChange.newValue}
                        showToggle={false}
                      />
                    </div>
                  ) : (
                    <p className="mt-1 whitespace-pre-wrap">{requisition.desirable_education || 'None specified'}</p>
                  );
                })()}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Language Requirements */}
        {requisition.language_requirements && (
          <Card>
            <CardHeader>
              <CardTitle>Language Requirements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {typeof requisition.language_requirements === 'string' ? (
                  <p className="whitespace-pre-wrap">{requisition.language_requirements}</p>
                ) : (
                  <div className="space-y-2">
                    {(() => {
                      const langReq = requisition.language_requirements as Record<string, any>;
                      const languageLabels: Record<string, string> = {
                        english: 'English',
                        french: 'French',
                        spanish: 'Spanish',
                        arabic: 'Arabic',
                        chinese: 'Chinese',
                        russian: 'Russian',
                      };

                      const items: JSX.Element[] = [];

                      // Main language entries (e.g. English)
                      Object.entries(langReq)
                        .filter(([key, value]) => {
                          // Skip internal / special fields
                          if (['additional_languages', 'un_language_advantage', 'local_language_advantage'].includes(key)) {
                            return false;
                          }
                          if (typeof value === 'string') {
                            const cleanValue = value.trim().toLowerCase();
                            if (
                              cleanValue === '' ||
                              cleanValue === 'not specified' ||
                              cleanValue.includes('not specified') ||
                              cleanValue === key.toLowerCase() ||
                              cleanValue.includes(key.toLowerCase())
                            ) {
                              return false;
                            }
                            return true;
                          }
                          return false;
                        })
                        .forEach(([lang, level]) => {
                          const label =
                            languageLabels[lang.toLowerCase() as keyof typeof languageLabels] ||
                            lang.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
                          items.push(
                            <div key={lang}>
                              <span className="font-medium">{label}:</span>
                              <span className="ml-2">{level}</span>
                            </div>
                          );
                        });

                      // Additional languages array
                      const additional = Array.isArray((langReq as any).additional_languages)
                        ? (langReq as any).additional_languages.filter((lang: any) => {
                            if (typeof lang === 'object' && lang?.name) {
                              const cleanName = String(lang.name).trim().toLowerCase();
                              return cleanName !== '' && !cleanName.includes('not specified');
                            }
                            if (typeof lang === 'string') {
                              const cleanLang = lang.trim().toLowerCase();
                              return cleanLang !== '' && !cleanLang.includes('not specified');
                            }
                            return false;
                          })
                        : [];

                      additional.forEach((lang: any, idx: number) => {
                        const name = typeof lang === 'object' && lang.name ? lang.name : String(lang);
                        const level = typeof lang === 'object' && lang.level ? lang.level : '';
                        
                        // Format level text to match English formatting
                        let formattedLevel = level;
                        if (level) {
                          const levelLower = level.toLowerCase();
                          if (levelLower === 'expert') {
                            formattedLevel = 'Expert knowledge is required';
                          } else if (levelLower === 'intermediate') {
                            formattedLevel = 'Intermediate knowledge is required';
                          } else if (levelLower === 'beginner') {
                            formattedLevel = 'Beginner knowledge is required';
                          }
                        }
                        
                        items.push(
                          <div key={`additional-${idx}`}>
                            <span className="font-medium">{name}:</span>
                            <span className="ml-2">{formattedLevel || 'Not specified'}</span>
                          </div>
                        );
                      });

                      // Advantage flags
                      if ((langReq as any).un_language_advantage === true) {
                        items.push(
                          <div key="un_language_advantage">
                            <span className="ml-2">Knowledge of another UN language would be an advantage</span>
                          </div>
                        );
                      }

                      if ((langReq as any).local_language_advantage === true) {
                        items.push(
                          <div key="local_language_advantage">
                            <span className="ml-2">Knowledge of the local language of the Duty Station would be an advantage</span>
                          </div>
                        );
                      }

                      return items;
                    })()}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Competencies */}
        {((Array.isArray(requisition.global_competencies) && requisition.global_competencies.length > 0) ||
          (Array.isArray(requisition.core_competencies) && requisition.core_competencies.length > 0) ||
          (Array.isArray(requisition.leadership_competencies) && requisition.leadership_competencies.length > 0) ||
          (Array.isArray(requisition.management_competencies) && requisition.management_competencies.length > 0)) && (
          <Card>
            <CardHeader>
              <CardTitle>Competencies</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Mandatory Competencies */}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Mandatory Competencies</label>
                <p className="text-xs text-muted-foreground mb-2">These competencies are automatically included for all positions:</p>
                <ul className="mt-1 space-y-1 text-sm">
                  <li>• <span className="font-bold">Teamwork:</span> Develops and promotes effective relationships with colleagues and team members. Deals constructively with conflicts.</li>
                  <li>• <span className="font-bold">Communicating:</span> Expresses oneself clearly in conversations and interactions with others; listens actively. Produces effective written communications. Ensures that information is shared.</li>
                  <li>• <span className="font-bold">Respecting and promoting individual and cultural differences:</span> Demonstrates the ability to work constructively with people of all backgrounds and orientations. Respects differences and ensures that all can contribute.</li>
                  <li>• <span className="font-bold">Creating an empowering and motivating environment</span> (for Supervisory positions only): Guides and motivates staff towards meeting challenges and achieving objectives. Promotes ownership and responsibility for desired outcomes at all levels.</li>
                </ul>
              </div>

              {Array.isArray(requisition.global_competencies) && requisition.global_competencies.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Global Competencies</label>
                  <ul className="mt-1 space-y-1">
                    {requisition.global_competencies.map((comp: any, index: number) => {
                      const getCompetencyDefinition = (compName: string) => {
                        const globalCompetencies = [
                          'Integrity: Acts in accordance with organizational values. Takes responsibility for actions and decisions',
                          'Customer orientation: Provides excellent service in a professional and caring manner'
                        ];
                        return globalCompetencies.find(def => def.startsWith(compName)) || compName;
                      };
                      
                      const competencyName = typeof comp === 'string' ? comp : comp.name || comp;
                      const definition = getCompetencyDefinition(competencyName);
                      const [name, ...description] = definition.split(':');
                      
                      return (
                        <li key={index} className="text-sm">
                          • <strong>{name}:</strong> {description.join(':').trim()}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              
              {Array.isArray(requisition.core_competencies) && requisition.core_competencies.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Core Competencies</label>
                  <ul className="mt-1 space-y-1">
                    {requisition.core_competencies.map((comp: any, index: number) => {
                      const getCoreCompetencyDefinition = (compName: string) => {
                        const coreCompetencies = [
                          'Knowing and managing yourself: Manages ambiguity and pressure in a self-reflective way. Uses criticism as a development opportunity. Seeks opportunities for continuous learning and professional growth.',
                          'Producing results: Produces and delivers quality results. Is action oriented and committed to achieving outcomes.',
                          'Moving forward in a changing environment: Is open to and proposes new approaches and ideas. Adapts and responds positively to change.',
                          'Setting an example: Acts within UNICC\'s / WHO\'s professional, ethical and legal boundaries and encourages others to adhere to these. Behaves consistently in accordance with clear personal ethics and values.'
                        ];
                        return coreCompetencies.find(def => def.startsWith(compName)) || compName;
                      };
                      
                      const competencyName = typeof comp === 'string' ? comp : comp.name || comp;
                      const definition = getCoreCompetencyDefinition(competencyName);
                      const [name, ...description] = definition.split(':');
                      
                      return (
                        <li key={index} className="text-sm">
                          • <strong>{name}:</strong> {description.join(':').trim()}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              
              {Array.isArray(requisition.leadership_competencies) && requisition.leadership_competencies.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Leadership Competencies</label>
                  <ul className="mt-1 space-y-1">
                    {requisition.leadership_competencies.map((comp: any, index: number) => {
                      const getLeadershipCompetencyDefinition = (compName: string) => {
                        const leadershipCompetencies = [
                          'Driving UNICC to a successful future: Demonstrates a broad-based understanding of the growing complexities of ICT issues and activities. Creates a compelling vision of shared goals, and develops a roadmap for successfully achieving real progress in improving ICT services.',
                          'Promoting innovation and Organizational learning: Invigorates the Organization by building a culture which encourages learning and development. Sponsors innovative approaches and solutions.',
                          'Promoting UNICC\'s position: Positions UNICC as a leader in ICT services. Gains support for UNICC\'s mission. Coordinates plans and communicates in a way that attracts support from intended audiences.'
                        ];
                        return leadershipCompetencies.find(def => def.startsWith(compName)) || compName;
                      };
                      
                      const competencyName = typeof comp === 'string' ? comp : comp.name || comp;
                      const definition = getLeadershipCompetencyDefinition(competencyName);
                      const [name, ...description] = definition.split(':');
                      
                      return (
                        <li key={index} className="text-sm">
                          • <span className="font-bold">{name}:</span> {description.join(':').trim()}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              
              {Array.isArray(requisition.management_competencies) && requisition.management_competencies.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Management Competencies</label>
                  <ul className="mt-1 space-y-1">
                    {requisition.management_competencies.map((comp: any, index: number) => {
                      const getManagementCompetencyDefinition = (compName: string) => {
                        const managementCompetencies = [
                          'Ensuring effective use of resources: Identifies priorities in accordance with UNICC\'s strategic directions. Develops and implements action plans, organizes the necessary resources and monitors outcomes.',
                          'Building and promoting partnerships across the Organization and beyond: Develops and strengthens internal and external partnerships that can provide information, assistance and support to UNICC. Identifies and uses synergies across the Organization and with external partners.'
                        ];
                        return managementCompetencies.find(def => def.startsWith(compName)) || compName;
                      };
                      
                      const competencyName = typeof comp === 'string' ? comp : comp.name || comp;
                      const definition = getManagementCompetencyDefinition(competencyName);
                      const [name, ...description] = definition.split(':');
                      
                      return (
                        <li key={index} className="text-sm">
                          • <strong>{name}:</strong> {description.join(':').trim()}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Approval Status */}
        <Card>
          <CardHeader>
            <CardTitle>Approval Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                {requisition.hr_reviewed ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <Clock className="h-5 w-5 text-gray-400" />
                )}
                <span className={requisition.hr_reviewed ? "text-green-700" : "text-gray-500"}>
                  HR Review
                </span>
              </div>
              <div className="flex items-center gap-3">
                {requisition.hiring_manager_confirmed_hr_changes ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <Clock className="h-5 w-5 text-gray-400" />
                )}
                <span className={requisition.hiring_manager_confirmed_hr_changes ? "text-green-700" : "text-gray-500"}>
                  Hiring Manager Approval
                </span>
              </div>
              <div className="flex items-center gap-3">
                {(requisition.chief_of_division_approval && requisition.hr_final_review_completed) ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <Clock className="h-5 w-5 text-gray-400" />
                )}
                <span className={(requisition.chief_of_division_approval && requisition.hr_final_review_completed) ? "text-green-700" : "text-gray-500"}>
                  Chief of Division Final Approval
                </span>
              </div>
              <div className="flex items-center gap-3">
                {requisition.director_approval ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <Clock className="h-5 w-5 text-gray-400" />
                )}
                <span className={requisition.director_approval ? "text-green-700" : "text-gray-500"}>
                  Director Approval
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* HR Review Section */}
        {requisition.hr_reviewed && (
          <Card className="border-amber-200 bg-amber-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-800">
                <MessageSquare className="h-5 w-5" />
                HR Review & Amendments
              </CardTitle>
              <CardDescription className="text-amber-700">
                Reviewed on {requisition.hr_reviewed_at ? format(new Date(requisition.hr_reviewed_at), 'MMM dd, yyyy') : 'Recently'}
                {requisition.hiring_manager_confirmed_hr_changes && (
                  <span className="ml-2 inline-flex items-center gap-1 text-green-700">
                    <CheckCircle className="h-4 w-4" />
                    Changes accepted by hiring manager
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {requisition.hr_change_summary && (
                <div className="bg-white p-4 rounded-lg border border-amber-200">
                  <h4 className="font-medium text-amber-800 mb-2">Summary of Changes:</h4>
                  <p className="whitespace-pre-wrap text-amber-700">
                    {requisition.hr_change_summary}
                  </p>
                </div>
              )}
              
              {Array.isArray(requisition.hr_changes) && requisition.hr_changes.length > 0 && (
                <div className="bg-white rounded-lg border border-amber-200 p-4 space-y-6">
                  <div>
                    <h4 className="font-medium text-amber-800 mb-1">HR Modifications ({requisition.hr_changes.length})</h4>
                    <p className="text-sm text-amber-700 mb-4">The following fields were modified by HR:</p>
                  </div>
                  {requisition.hr_changes.map((change: any, index: number) => (
                    <InlineTrackChanges
                      key={index}
                      fieldLabel={change.label}
                      originalValue={change.originalValue}
                      newValue={change.newValue}
                      showToggle={false}
                    />
                  ))}
                </div>
              )}
              
              {requisition.hr_comments && (
                <div className="bg-white p-4 rounded-lg border border-amber-200">
                  <h4 className="font-medium text-amber-800 mb-2">Additional Comments:</h4>
                  <p className="whitespace-pre-wrap text-amber-700">
                    {requisition.hr_comments}
                  </p>
                </div>
              )}
              
              {!requisition.hr_change_summary && !requisition.hr_changes && !requisition.hr_comments && (
                <div className="bg-white p-4 rounded-lg border border-amber-200">
                  <p className="text-amber-700">
                    HR has reviewed this requisition. Please confirm you are happy with any changes made and accept to proceed to the next approval stage.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Comments Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Comments & Feedback
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.isArray(requisition.comments) && requisition.comments.length > 0 && (
              <div className="space-y-3">
                {requisition.comments.map((comment: any) => (
                  <div key={comment.id} className="bg-muted p-3 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium text-sm">{comment.author}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(comment.timestamp), 'MMM dd, yyyy HH:mm')}
                      </span>
                    </div>
                    <p className="text-sm">{comment.text}</p>
                  </div>
                ))}
              </div>
            )}
            
            <div className="space-y-2">
              <Textarea
                placeholder="Add a comment or feedback..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
              />
              <Button 
                onClick={addComment} 
                disabled={!newComment.trim() || addingComment}
                size="sm"
              >
                Add Comment
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Review & Accept Changes - Hiring Manager Action */}
        {((requisition.status === 'hr_amendments') || 
          (requisition.status === 'hiring_manager_review' && requisition.hr_reviewed && !requisition.hiring_manager_confirmed_hr_changes)) && 
         requisition.created_by === user?.id && (
          <div className="flex justify-center pt-4">
            <Button 
              onClick={() => navigate(`/requisitions/${requisition.id}/hm-review`)} 
              size="lg"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Review & Accept Changes
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}