import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, Save, Send, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { CustomDatePicker } from '@/components/ui/date-picker';
import { DIVISIONS, DIVISION_UNITS, LOCATIONS, FUNDING_OPTIONS, ON_CALL_OPTIONS } from '@/lib/organizationConstants';
import { isValidUUID } from '@/lib/utils';

export default function ProcurementTORForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedDivision, setSelectedDivision] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    division: '',
    unit: '',
    background: '',
    required_profile: '',
    scope_of_work: '',
    required_technical_skills: '',
    desired_technical_skills: '',
    required_soft_skills: [] as string[],
    desirable_certifications: '',
    duty_station: [] as string[],
    on_call_requirement: '',
    estimated_duration: '',
    estimated_start_date: null as Date | null,
    funding_status: '',
    funding_comments: '',
    additional_comments: '',
  });

  useEffect(() => {
    if (id) loadTOR();
  }, [id]);

  const loadTOR = async () => {
    try {
      setLoading(true);
      let query = supabase.from('procurement_tors').select('*');
      if (isValidUUID(id || '')) {
        query = query.eq('id', id);
      } else {
        query = query.eq('slug', id);
      }
      const { data, error } = await query.single();
      if (error) throw error;
      if (data) {
        let dutyStation: string[] = [];
        try {
          dutyStation = data.duty_station ? JSON.parse(data.duty_station) : [];
        } catch { dutyStation = []; }

        // Find division from unit
        for (const [divKey, units] of Object.entries(DIVISION_UNITS)) {
          if (units.includes(data.unit || '')) {
            setSelectedDivision(divKey);
            break;
          }
        }
        if (data.division) setSelectedDivision(data.division);

        setFormData({
          title: data.title || '',
          division: data.division || '',
          unit: data.unit || '',
          background: data.background || '',
          required_profile: data.required_profile || '',
          scope_of_work: data.scope_of_work || '',
          required_technical_skills: data.required_technical_skills || '',
          desired_technical_skills: data.desired_technical_skills || '',
          required_soft_skills: (() => { try { return data.required_soft_skills ? JSON.parse(data.required_soft_skills) : []; } catch { return []; } })(),
          desirable_certifications: data.desirable_certifications || '',
          duty_station: dutyStation,
          on_call_requirement: data.on_call_requirement || '',
          estimated_duration: data.estimated_duration || '',
          estimated_start_date: data.estimated_start_date ? new Date(data.estimated_start_date) : null,
          funding_status: data.funding_status || '',
          funding_comments: data.funding_comments || '',
          additional_comments: data.additional_comments || '',
        });
      }
    } catch (error: any) {
      toast({ title: "Error loading TOR", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleLocationToggle = (location: string) => {
    setFormData(prev => ({
      ...prev,
      duty_station: prev.duty_station.includes(location)
        ? prev.duty_station.filter(l => l !== location)
        : [...prev.duty_station, location]
    }));
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      toast({ title: "Validation Error", description: "Title of required services is required", variant: "destructive" });
      return false;
    }
    if (!formData.scope_of_work.trim()) {
      toast({ title: "Validation Error", description: "Scope of work is required", variant: "destructive" });
      return false;
    }
    if (formData.duty_station.length === 0) {
      toast({ title: "Validation Error", description: "Please select at least one duty station", variant: "destructive" });
      return false;
    }
    return true;
  };

  const handleSave = async (submit: boolean = false) => {
    if (submit && !validateForm()) return;
    try {
      setSaving(true);

      const generateSlug = (title: string) =>
        title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

      const dataToSave: any = {
        title: formData.title,
        division: selectedDivision,
        unit: formData.unit,
        background: formData.background,
        required_profile: formData.required_profile,
        scope_of_work: formData.scope_of_work,
        required_technical_skills: formData.required_technical_skills,
        desired_technical_skills: formData.desired_technical_skills,
        required_soft_skills: JSON.stringify(formData.required_soft_skills),
        desirable_certifications: formData.desirable_certifications,
        duty_station: JSON.stringify(formData.duty_station),
        on_call_requirement: formData.on_call_requirement,
        estimated_duration: formData.estimated_duration,
        estimated_start_date: formData.estimated_start_date?.toISOString().split('T')[0] || null,
        funding_status: formData.funding_status,
        funding_comments: formData.funding_comments,
        additional_comments: formData.additional_comments,
        status: submit ? 'submitted' : 'draft',
      };

      if (id) {
        // Update existing
        let query = supabase.from('procurement_tors').update(dataToSave);
        if (isValidUUID(id)) {
          query = query.eq('id', id);
        } else {
          query = query.eq('slug', id);
        }
        const { error } = await query;
        if (error) throw error;
      } else {
        // Insert new
        dataToSave.requested_by = user?.id;

        // Generate unique slug
        const baseSlug = generateSlug(formData.title || 'tor');
        let slug = baseSlug;
        let counter = 0;
        while (true) {
          const { data: existing } = await supabase
            .from('procurement_tors')
            .select('id')
            .eq('slug', slug)
            .maybeSingle();
          if (!existing) break;
          counter++;
          slug = `${baseSlug}-${counter}`;
        }
        dataToSave.slug = slug;

        const { error } = await supabase.from('procurement_tors').insert(dataToSave);
        if (error) throw error;
      }

      toast({
        title: submit ? "TOR Submitted" : "Draft Saved",
        description: submit ? "Your procurement TOR has been submitted." : "Your draft has been saved.",
      });
      navigate('/requisitions');
    } catch (error: any) {
      toast({ title: "Error saving TOR", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {id ? 'Edit Procurement TOR' : 'New Procurement TOR'}
            </h1>
            <p className="text-muted-foreground text-sm">Terms of Reference for External Services</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Section 1: Basic Information */}
          <Card>
            <CardHeader><CardTitle>Basic Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Title of Required Services *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Agile Business Analysts"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Requesting Division</Label>
                  <Select value={selectedDivision} onValueChange={val => {
                    setSelectedDivision(val);
                    setFormData(prev => ({ ...prev, division: val, unit: '' }));
                  }}>
                    <SelectTrigger><SelectValue placeholder="Select division" /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(DIVISIONS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Requesting Unit</Label>
                  <Select value={formData.unit} onValueChange={val => setFormData(prev => ({ ...prev, unit: val }))} disabled={!selectedDivision}>
                    <SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger>
                    <SelectContent>
                      {(DIVISION_UNITS[selectedDivision] || []).map(unit => (
                        <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Requested by</Label>
                <Input value={user?.email || ''} disabled className="bg-muted" />
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Background & Scope */}
          <Card>
            <CardHeader><CardTitle>Background & Scope</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="background">Background Information</Label>
                <Textarea
                  id="background"
                  value={formData.background}
                  onChange={e => setFormData(prev => ({ ...prev, background: e.target.value }))}
                  placeholder="Provide context and background for this requirement..."
                  className="min-h-[120px]"
                />
              </div>
              <div>
                <Label htmlFor="required_profile">Required Profile</Label>
                <Textarea
                  id="required_profile"
                  value={formData.required_profile}
                  onChange={e => setFormData(prev => ({ ...prev, required_profile: e.target.value }))}
                  placeholder="Describe the type of individual or firm needed..."
                  className="min-h-[100px]"
                />
              </div>
              <div>
                <Label htmlFor="scope_of_work">Scope of Work / Duties *</Label>
                <Textarea
                  id="scope_of_work"
                  value={formData.scope_of_work}
                  onChange={e => setFormData(prev => ({ ...prev, scope_of_work: e.target.value }))}
                  placeholder="Describe the responsibilities and deliverables..."
                  className="min-h-[150px]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Required Skills */}
          <Card>
            <CardHeader><CardTitle>Required Skills</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="required_technical_skills">Required Technical Skills (MUST have)</Label>
                <Textarea
                  id="required_technical_skills"
                  value={formData.required_technical_skills}
                  onChange={e => setFormData(prev => ({ ...prev, required_technical_skills: e.target.value }))}
                  placeholder="List mandatory technical skills and experience..."
                  className="min-h-[100px]"
                />
              </div>
              <div>
                <Label htmlFor="desired_technical_skills">Desired Technical Skills (SHOULD have)</Label>
                <Textarea
                  id="desired_technical_skills"
                  value={formData.desired_technical_skills}
                  onChange={e => setFormData(prev => ({ ...prev, desired_technical_skills: e.target.value }))}
                  placeholder="List preferred skills and experience..."
                  className="min-h-[100px]"
                />
              </div>
              <div>
                <Label className="mb-3 block">Required Soft Skills / Competencies</Label>

                {/* Mandatory Competencies - read-only */}
                <div className="bg-muted/50 border border-border rounded-lg p-4 mb-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Mandatory Competencies (always included)</p>
                  <div className="space-y-3">
                    {[
                      { name: 'Teamwork', definition: 'Develops and promotes effective relationships with colleagues and team members. Deals constructively with conflicts.' },
                      { name: 'Communicating', definition: 'Expresses oneself clearly in conversations and interactions with others; listens actively. Produces effective written communications. Ensures that information is shared.' },
                      { name: 'Respecting and promoting individual and cultural differences', definition: 'Demonstrates the ability to work constructively with people of all backgrounds and orientations. Respects differences and ensures that all can contribute.' },
                    ].map(comp => (
                      <div key={comp.name} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <div>
                          <span className="text-sm font-medium text-foreground">{comp.name}</span>
                          <p className="text-xs text-muted-foreground mt-0.5">{comp.definition}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Selectable Competencies */}
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-muted-foreground">Select up to 6 additional competencies</p>
                  <Badge variant={formData.required_soft_skills.length === 6 ? 'default' : 'secondary'}>
                    {formData.required_soft_skills.length} / 6 selected
                  </Badge>
                </div>
                {[
                  { label: 'Core Competencies', items: [
                    { name: 'Knowing and managing yourself', definition: 'Manages ambiguity and pressure in a self-reflective way. Uses criticism as a development opportunity. Seeks opportunities for continuous learning and professional growth.' },
                    { name: 'Producing results', definition: 'Produces and delivers quality results. Is action oriented and committed to achieving outcomes.' },
                    { name: 'Moving forward in a changing environment', definition: 'Is open to and proposes new approaches and ideas. Adapts and responds positively to change.' },
                    { name: 'Setting an example', definition: "Acts within UNICC's / WHO's professional, ethical and legal boundaries and encourages others to adhere to these. Behaves consistently in accordance with clear personal ethics and values." },
                  ]},
                  { label: 'Management Competencies', items: [
                    { name: 'Ensuring effective use of resources', definition: "Identifies priorities in accordance with UNICC's strategic directions. Develops and implements action plans, organizes the necessary resources and monitors outcomes." },
                    { name: 'Building and promoting partnerships across the Organization and beyond', definition: 'Develops and strengthens internal and external partnerships that can provide information, assistance and support to UNICC. Identifies and uses synergies across the Organization and with external partners.' },
                  ]},
                  { label: 'Leadership Competencies', items: [
                    { name: 'Driving UNICC to a successful future', definition: 'Demonstrates a broad-based understanding of the growing complexities of ICT issues and activities. Creates a compelling vision of shared goals, and develops a roadmap for successfully achieving real progress in improving ICT services.' },
                    { name: 'Promoting innovation and Organizational learning', definition: 'Invigorates the Organization by building a culture which encourages learning and development. Sponsors innovative approaches and solutions.' },
                    { name: 'Promoting UNICC\'s position', definition: "Positions UNICC as a leader in ICT services. Gains support for UNICC's mission. Coordinates plans and communicates in a way that attracts support from intended audiences." },
                  ]},
                ].map(group => (
                  <div key={group.label} className="mb-4">
                    <p className="text-xs font-medium text-muted-foreground mb-2">{group.label}</p>
                    <div className="space-y-2">
                      {group.items.map(comp => {
                        const isSelected = formData.required_soft_skills.includes(comp.name);
                        const atLimit = formData.required_soft_skills.length >= 6;
                        return (
                          <button
                            key={comp.name}
                            type="button"
                            disabled={!isSelected && atLimit}
                            onClick={() => setFormData(prev => ({
                              ...prev,
                              required_soft_skills: isSelected
                                ? prev.required_soft_skills.filter(s => s !== comp.name)
                                : [...prev.required_soft_skills, comp.name]
                            }))}
                            className={`w-full text-left p-3 rounded-lg border transition-colors ${
                              isSelected
                                ? 'bg-primary/10 border-primary'
                                : atLimit
                                  ? 'bg-muted text-muted-foreground border-border opacity-50 cursor-not-allowed'
                                  : 'bg-background border-border hover:bg-accent hover:border-accent-foreground/20'
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              <div className={`mt-0.5 shrink-0 h-4 w-4 rounded-sm border flex items-center justify-center ${isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/40'}`}>
                                {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                              </div>
                              <div>
                                <span className="text-sm font-medium text-foreground">{comp.name}</span>
                                <p className="text-xs text-muted-foreground mt-0.5">{comp.definition}</p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <div>
                <Label htmlFor="desirable_certifications">Desirable Certifications</Label>
                <Textarea
                  id="desirable_certifications"
                  value={formData.desirable_certifications}
                  onChange={e => setFormData(prev => ({ ...prev, desirable_certifications: e.target.value }))}
                  placeholder="List relevant certifications..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Section 4: Logistics */}
          <Card>
            <CardHeader><CardTitle>Logistics</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Duty Station *</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                  {LOCATIONS.map(location => (
                    <div key={location} className="flex items-center gap-2">
                      <Checkbox
                        id={`loc-${location}`}
                        checked={formData.duty_station.includes(location)}
                        onCheckedChange={() => handleLocationToggle(location)}
                      />
                      <Label htmlFor={`loc-${location}`} className="cursor-pointer font-normal">
                        {location}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <Label>On-call Requirements</Label>
                <RadioGroup
                  value={formData.on_call_requirement}
                  onValueChange={val => setFormData(prev => ({ ...prev, on_call_requirement: val }))}
                  className="mt-2"
                >
                  {ON_CALL_OPTIONS.map(option => (
                    <div key={option} className="flex items-center gap-2">
                      <RadioGroupItem value={option} id={`oncall-${option}`} />
                      <Label htmlFor={`oncall-${option}`} className="cursor-pointer font-normal">
                        {option}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="estimated_duration">Estimated Duration</Label>
                  <Input
                    id="estimated_duration"
                    value={formData.estimated_duration}
                    onChange={e => setFormData(prev => ({ ...prev, estimated_duration: e.target.value }))}
                    placeholder="e.g., 12 months"
                  />
                </div>
                <div>
                  <Label>Estimated Start Date</Label>
                  <CustomDatePicker
                    selected={formData.estimated_start_date}
                    onChange={date => setFormData(prev => ({ ...prev, estimated_start_date: date }))}
                    placeholderText="Select start date"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 5: Funding */}
          <Card>
            <CardHeader><CardTitle>Funding</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Funding Status</Label>
                <RadioGroup
                  value={formData.funding_status}
                  onValueChange={val => setFormData(prev => ({ ...prev, funding_status: val }))}
                  className="mt-2"
                >
                  {FUNDING_OPTIONS.map(option => (
                    <div key={option} className="flex items-center gap-2">
                      <RadioGroupItem value={option} id={`fund-${option}`} />
                      <Label htmlFor={`fund-${option}`} className="cursor-pointer font-normal text-sm">
                        {option}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
              <div>
                <Label htmlFor="funding_comments">Funding Comments</Label>
                <Textarea
                  id="funding_comments"
                  value={formData.funding_comments}
                  onChange={e => setFormData(prev => ({ ...prev, funding_comments: e.target.value }))}
                  placeholder="Optional funding details..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Section 6: Additional Notes */}
          <Card>
            <CardHeader><CardTitle>Additional Notes</CardTitle></CardHeader>
            <CardContent>
              <Textarea
                value={formData.additional_comments}
                onChange={e => setFormData(prev => ({ ...prev, additional_comments: e.target.value }))}
                placeholder="Any additional comments or information..."
                className="min-h-[100px]"
              />
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3 pb-8">
            <Button variant="outline" onClick={() => handleSave(false)} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              Save as Draft
            </Button>
            <Button onClick={() => handleSave(true)} disabled={saving}>
              <Send className="mr-2 h-4 w-4" />
              Submit
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
