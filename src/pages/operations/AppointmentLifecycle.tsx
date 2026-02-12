import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Check, Clock, AlertTriangle, MessageSquare, ChevronDown, ChevronUp, Calendar, MapPin, Briefcase, FileEdit, Download, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, parseISO, differenceInCalendarDays } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  APPOINTMENT_LIFECYCLE_STAGES,
  DEFAULT_APPOINTMENT_CHECKLIST_ITEMS,
  AppointmentChecklistItem,
  AppointmentStageStatus,
  getAppointmentStageStatus,
  getAppointmentStageColorClass,
  getAppointmentStageTextColorClass,
} from '@/lib/appointmentLifecycleConfig';

// Map appointment data to common placeholder names
const buildFieldMapping = (appointment: any): Record<string, string> => {
  const mapping: Record<string, string> = {};
  const set = (keys: string[], value: string | null | undefined) => {
    if (!value) return;
    keys.forEach(k => { mapping[k.toLowerCase()] = value; });
  };

  set(['first_name', 'firstname'], appointment.first_name);
  set(['last_name', 'lastname', 'surname'], appointment.last_name);
  const fullName = [appointment.first_name, appointment.last_name].filter(Boolean).join(' ');
  if (fullName) set(['name', 'full_name', 'fullname', 'staff_name'], fullName);
  set(['email'], appointment.email);
  set(['grade', 'level'], appointment.grade);
  set(['job_title', 'jobtitle', 'title', 'position'], appointment.job_title);
  set(['duty_station', 'dutystation', 'location'], appointment.duty_station);
  set(['section', 'unit', 'section_unit', 'sectionunit'], appointment.section_unit);
  set(['supervisor', 'line_manager', 'linemanager', 'manager'], appointment.supervisor);
  set(['contract_type', 'contracttype'], appointment.contract_type);
  if (appointment.effective_date) {
    const formatted = format(parseISO(appointment.effective_date), 'dd MMMM yyyy');
    set(['effective_date', 'effectivedate', 'start_date', 'startdate'], formatted);
  } else if (appointment.tentative_date) {
    const formatted = format(parseISO(appointment.tentative_date), 'dd MMMM yyyy');
    set(['effective_date', 'effectivedate', 'start_date', 'startdate'], formatted);
  }
  set(['vacancy_reference', 'vacancy_ref'], appointment.vacancy_reference);

  return mapping;
};

const AppointmentLifecycle = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeStage, setActiveStage] = useState<string>(APPOINTMENT_LIFECYCLE_STAGES[0].key);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

  // Offer letter dialog state
  const [offerLetterOpen, setOfferLetterOpen] = useState(false);
  const [offerLetterFields, setOfferLetterFields] = useState<string[]>([]);
  const [offerLetterValues, setOfferLetterValues] = useState<Record<string, string>>({});
  const [offerLetterLoading, setOfferLetterLoading] = useState(false);
  const [offerLetterGenerating, setOfferLetterGenerating] = useState(false);
  const [templateFilePath, setTemplateFilePath] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState<string>('');

  // Fetch appointment
  const { data: appointment, isLoading: loadingAppointment } = useQuery({
    queryKey: ['hr-appointment', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_appointments')
        .select('*')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch checklist items
  const { data: checklist = [], isLoading: loadingChecklist } = useQuery({
    queryKey: ['appointment-lifecycle-checklist', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointment_lifecycle_checklist' as any)
        .select('*')
        .eq('appointment_id', id!);
      if (error) throw error;
      return (data || []) as unknown as AppointmentChecklistItem[];
    },
    enabled: !!id,
  });

  // Initialize checklist if empty
  useEffect(() => {
    if (!id || loadingChecklist || checklist.length > 0) return;

    const initializeChecklist = async () => {
      const items: any[] = [];
      for (const [stageKey, stageItems] of Object.entries(DEFAULT_APPOINTMENT_CHECKLIST_ITEMS)) {
        for (const item of stageItems) {
          items.push({
            appointment_id: id,
            stage_key: stageKey,
            item_key: item.key,
            item_label: item.label,
            completed: false,
          });
        }
      }

      const { error } = await supabase
        .from('appointment_lifecycle_checklist' as any)
        .insert(items);

      if (error) {
        console.error('Failed to initialize checklist:', error);
        return;
      }

      queryClient.invalidateQueries({ queryKey: ['appointment-lifecycle-checklist', id] });
    };

    initializeChecklist();
  }, [id, loadingChecklist, checklist.length, queryClient]);

  // Toggle item mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ itemId, completed }: { itemId: string; completed: boolean }) => {
      const { error } = await supabase
        .from('appointment_lifecycle_checklist' as any)
        .update({
          completed,
          completed_at: completed ? new Date().toISOString() : null,
        })
        .eq('id', itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment-lifecycle-checklist', id] });
    },
    onError: () => toast.error('Failed to update item'),
  });

  // Update notes mutation
  const notesMutation = useMutation({
    mutationFn: async ({ itemId, notes }: { itemId: string; notes: string }) => {
      const { error } = await supabase
        .from('appointment_lifecycle_checklist' as any)
        .update({ notes })
        .eq('id', itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment-lifecycle-checklist', id] });
    },
  });

  const daysToStart = useMemo(() => {
    if (!appointment?.tentative_date) return 0;
    return differenceInCalendarDays(parseISO(appointment.tentative_date), new Date());
  }, [appointment?.tentative_date]);

  const activeStageItems = useMemo(() => {
    return checklist.filter(item => item.stage_key === activeStage);
  }, [checklist, activeStage]);

  const activeStageConfig = APPOINTMENT_LIFECYCLE_STAGES.find(s => s.key === activeStage);
  const activeStatus = getAppointmentStageStatus(activeStage, daysToStart, checklist);
  const completedCount = activeStageItems.filter(i => i.completed).length;

  const toggleNotes = (itemId: string) => {
    setExpandedNotes(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const getStageIcon = (status: AppointmentStageStatus) => {
    switch (status) {
      case 'complete': return <Check className="h-4 w-4 text-white" />;
      case 'overdue': return <AlertTriangle className="h-4 w-4 text-white" />;
      default: return <Clock className="h-4 w-4 text-white" />;
    }
  };

  const getStatusBadge = () => {
    switch (activeStatus) {
      case 'complete':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100"><Check className="h-3 w-3 mr-1" />Complete</Badge>;
      case 'overdue':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100"><AlertTriangle className="h-3 w-3 mr-1" />Overdue</Badge>;
      default:
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100"><Clock className="h-3 w-3 mr-1" />In Progress</Badge>;
    }
  };

  // Open offer letter dialog
  const handleOpenOfferLetter = async () => {
    if (!appointment) return;
    setOfferLetterOpen(true);
    setOfferLetterLoading(true);
    setOfferLetterFields([]);
    setOfferLetterValues({});

    try {
      // 1. Find the template in document_repository
      const { data: docRepo, error: docError } = await supabase
        .from('document_repository')
        .select('file_path, name')
        .ilike('name', '%Letter of Fixed-Term Appointment - G Staff%')
        .limit(1)
        .single();

      if (docError || !docRepo) {
        toast.error('Template not found in Document Repository');
        setOfferLetterOpen(false);
        setOfferLetterLoading(false);
        return;
      }

      setTemplateFilePath(docRepo.file_path);
      setTemplateName(docRepo.name);

      // 2. Parse fields from the template
      const { data: session } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke('parse-repo-template-fields', {
        body: { file_path: docRepo.file_path },
      });

      if (res.error) throw new Error(res.error.message || 'Failed to parse template fields');

      const parsedFields: string[] = res.data?.fields || [];
      setOfferLetterFields(parsedFields);

      // 3. Auto-fill from appointment data
      const fieldMap = buildFieldMapping(appointment);
      const values: Record<string, string> = {};
      for (const field of parsedFields) {
        const normalized = field.toLowerCase().replace(/\s+/g, '_');
        values[field] = fieldMap[normalized] || '';
      }
      setOfferLetterValues(values);
    } catch (err: any) {
      console.error('Error loading offer letter template:', err);
      toast.error('Failed to load template: ' + (err.message || 'Unknown error'));
      setOfferLetterOpen(false);
    } finally {
      setOfferLetterLoading(false);
    }
  };

  // Generate and download the filled document
  const handleGenerateOfferLetter = async () => {
    if (!templateFilePath) return;
    setOfferLetterGenerating(true);

    try {
      const res = await supabase.functions.invoke('generate-repo-document', {
        body: { file_path: templateFilePath, field_values: offerLetterValues },
      });

      if (res.error) throw new Error(res.error.message || 'Failed to generate document');

      // res.data is a Blob when the response is binary
      const blob = res.data instanceof Blob ? res.data : new Blob([res.data]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${templateName.replace(/\.[^.]+$/, '')}_filled.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Offer letter downloaded!');
      setOfferLetterOpen(false);
    } catch (err: any) {
      console.error('Error generating offer letter:', err);
      toast.error('Failed to generate document: ' + (err.message || 'Unknown error'));
    } finally {
      setOfferLetterGenerating(false);
    }
  };

  if (loadingAppointment) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </Layout>
    );
  }

  if (!appointment) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <p className="text-destructive">Appointment not found</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/operations/appointments')}>
            <ArrowLeft className="h-4 w-4 mr-2" />Back
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate('/operations/appointments')} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />Back to Appointments
          </Button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold">{appointment.first_name} {appointment.last_name}</h1>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                {appointment.job_title && (
                  <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" />{appointment.job_title}</span>
                )}
                {appointment.grade && <Badge variant="outline">{appointment.grade}</Badge>}
                {appointment.duty_station && (
                  <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{appointment.duty_station}</span>
                )}
                {appointment.tentative_date && (
                  <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{format(parseISO(appointment.tentative_date), 'dd MMM yyyy')}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="w-full py-4">
              <div className="relative flex items-center justify-between">
                <div className="absolute left-0 right-0 top-1/2 h-1 bg-muted -translate-y-1/2 z-0" />
                {APPOINTMENT_LIFECYCLE_STAGES.map((stage) => {
                  const status = getAppointmentStageStatus(stage.key, daysToStart, checklist);
                  const isActive = activeStage === stage.key;
                  return (
                    <div
                      key={stage.key}
                      className="relative z-10 flex flex-col items-center cursor-pointer group"
                      onClick={() => setActiveStage(stage.key)}
                    >
                      <div className="text-xs font-medium text-muted-foreground mb-2">Day {stage.dayMarker}</div>
                      <div className={cn(
                        'w-10 h-10 rounded-full border-4 flex items-center justify-center transition-all',
                        getAppointmentStageColorClass(status),
                        isActive && 'ring-4 ring-primary/30 scale-110',
                        'group-hover:scale-105'
                      )}>
                        {getStageIcon(status)}
                      </div>
                      <div className={cn(
                        'text-xs text-center mt-2 max-w-24 leading-tight',
                        isActive ? 'font-semibold text-foreground' : 'text-muted-foreground'
                      )}>
                        {stage.label}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-6 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted rounded-full">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {daysToStart > 0
                      ? `${daysToStart} days to start date`
                      : daysToStart === 0
                        ? 'Start date is today!'
                        : `${Math.abs(daysToStart)} days past start date`}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active stage checklist */}
        {activeStageConfig && (
          <Card className={cn(
            'transition-all',
            activeStatus === 'overdue' && 'border-red-300 bg-red-50/50',
            activeStatus === 'complete' && 'border-green-300 bg-green-50/50'
          )}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className={cn('text-lg', getAppointmentStageTextColorClass(activeStatus))}>
                    {activeStageConfig.label}
                  </CardTitle>
                  <span className="text-sm text-muted-foreground">Day {activeStageConfig.dayMarker}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">{completedCount}/{activeStageItems.length}</span>
                  {getStatusBadge()}
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{activeStageConfig.description}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {activeStageItems.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Initializing checklist items...</p>
              ) : (
                activeStageItems.map((item) => (
                  <div key={item.id} className="space-y-2">
                    <div className="flex items-start gap-3 p-3 rounded-lg border bg-background">
                      <Checkbox
                        checked={item.completed}
                        onCheckedChange={(checked) => toggleMutation.mutate({ itemId: item.id, completed: checked as boolean })}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <label className={cn(
                            'text-sm font-medium cursor-pointer',
                            item.completed && 'line-through text-muted-foreground'
                          )}>
                            {item.item_label}
                          </label>
                          <div className="flex items-center gap-1">
                            {/* Generate Offer Letter button on draft_offer_letter item */}
                            {item.item_key === 'draft_offer_letter' && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenOfferLetter();
                                }}
                              >
                                <FileEdit className="h-3 w-3 mr-1" />
                                Generate Offer Letter
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => toggleNotes(item.id)}>
                              <MessageSquare className="h-3 w-3 mr-1" />
                              {expandedNotes.has(item.id) ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            </Button>
                          </div>
                        </div>
                        {item.completed && item.completed_at && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Completed {format(parseISO(item.completed_at), 'dd MMM yyyy HH:mm')}
                          </p>
                        )}
                      </div>
                    </div>
                    {expandedNotes.has(item.id) && (
                      <div className="ml-7">
                        <Textarea
                          placeholder="Add notes..."
                          value={item.notes || ''}
                          onChange={(e) => notesMutation.mutate({ itemId: item.id, notes: e.target.value })}
                          className="text-sm min-h-20"
                        />
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}

        {/* Offer Letter Dialog */}
        <Dialog open={offerLetterOpen} onOpenChange={setOfferLetterOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileEdit className="h-5 w-5" />
                Generate Offer Letter
              </DialogTitle>
              {templateName && (
                <p className="text-sm text-muted-foreground">Template: {templateName}</p>
              )}
            </DialogHeader>

            {offerLetterLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Parsing template fields...</span>
              </div>
            ) : offerLetterFields.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No fillable fields found in the template.
              </div>
            ) : (
              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-4 py-2">
                  {offerLetterFields.map((field) => (
                    <div key={field} className="space-y-1.5">
                      <Label htmlFor={`field-${field}`} className="text-sm font-medium capitalize">
                        {field.replace(/_/g, ' ')}
                      </Label>
                      <Input
                        id={`field-${field}`}
                        value={offerLetterValues[field] || ''}
                        onChange={(e) =>
                          setOfferLetterValues(prev => ({ ...prev, [field]: e.target.value }))
                        }
                        placeholder={`Enter ${field.replace(/_/g, ' ')}`}
                      />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setOfferLetterOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleGenerateOfferLetter}
                disabled={offerLetterLoading || offerLetterGenerating || offerLetterFields.length === 0}
              >
                {offerLetterGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Download Filled Document
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default AppointmentLifecycle;
