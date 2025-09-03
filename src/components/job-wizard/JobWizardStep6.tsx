import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCircle, AlertTriangle, Eye, Copy, Save, Globe } from 'lucide-react';
import { JobFormData } from '@/pages/JobWizard';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  data: JobFormData;
  onUpdate: (data: Partial<JobFormData>) => void;
  onPrev: () => void;
  isEditing: boolean;
  jobId?: string;
}

interface ValidationItem {
  label: string;
  status: 'pass' | 'fail' | 'warning';
  description: string;
}

export function JobWizardStep6({ data, onUpdate, onPrev, isEditing, jobId }: Props) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [slug, setSlug] = useState(data.slug || '');
  const [isPublished, setIsPublished] = useState(data.status === 'active');
  const [isSaving, setIsSaving] = useState(false);
  const [publicUrl, setPublicUrl] = useState('');

  // Generate slug from title
  useEffect(() => {
    if (!slug && data.title) {
      const generatedSlug = data.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      setSlug(generatedSlug);
      onUpdate({ slug: generatedSlug });
    }
  }, [data.title, slug, onUpdate]);

  // Set public URL
  useEffect(() => {
    if (slug) {
      setPublicUrl(`${window.location.origin}/jobs/${slug}`);
    }
  }, [slug]);

  const updateSlug = (newSlug: string) => {
    setSlug(newSlug);
    onUpdate({ slug: newSlug });
  };

  const togglePublish = (published: boolean) => {
    setIsPublished(published);
    onUpdate({ status: published ? 'active' : 'draft' });
  };

  // Validation checklist
  const getValidationItems = (): ValidationItem[] => {
    const items: ValidationItem[] = [];

    // Basic information
    items.push({
      label: 'Basic Information Complete',
      status: data.title && data.category && data.location && data.org_unit ? 'pass' : 'fail',
      description: 'Title, category, location, and organization unit are required',
    });

    // Description and requirements
    items.push({
      label: 'Description & Requirements',
      status: data.description_md && data.requirements_md ? 'pass' : 'fail',
      description: 'Job description and requirements sections must be completed',
    });

    // Essential criteria weights
    const totalWeight = data.essential_criteria?.reduce((sum, c) => sum + c.weight, 0) || 0;
    items.push({
      label: 'Essential Criteria Weights = 100%',
      status: totalWeight === 100 ? 'pass' : 'fail',
      description: `Total criteria weight is ${totalWeight}%, must equal 100%`,
    });

    // Killer questions
    items.push({
      label: 'Killer Questions Present',
      status: (data.killer_questions?.length || 0) > 0 ? 'pass' : 'warning',
      description: 'At least one screening question is recommended',
    });

    // Required uploads
    const hasRequiredUploads = data.attachments_required?.motivation_letter || 
                              data.attachments_required?.personal_history_form ||
                              data.attachments_required?.cv;
    items.push({
      label: 'Required Uploads Set',
      status: hasRequiredUploads ? 'pass' : 'warning',
      description: 'At least one required document upload is recommended',
    });

    // Closing date
    items.push({
      label: 'Closing Date Set',
      status: data.closing_date ? 'pass' : 'warning',
      description: 'Application closing date helps candidates plan their submissions',
    });

    return items;
  };

  const validationItems = getValidationItems();
  const criticalIssues = validationItems.filter(item => item.status === 'fail');
  const canPublish = criticalIssues.length === 0;

  const saveJob = async (publish: boolean = false) => {
    setIsSaving(true);
    
    try {
      // Filter out fields that don't exist in the database schema
      const {
        essential_criteria,
        killer_questions,
        custom_fields,
        consent_checkboxes,
        ...jobData
      } = data;

      const finalJobData = {
        ...jobData,
        status: publish ? 'active' : 'draft',
        slug: slug,
        updated_at: new Date().toISOString(),
      };

      let result;
      if (isEditing && jobId) {
        // Update existing job
        const { id, created_at, ...updateData } = finalJobData as any;
        result = await supabase
          .from('jobs')
          .update(updateData)
          .eq('id', jobId);
      } else {
        // Create new job
        const { id, ...insertData } = finalJobData as any;
        result = await supabase
          .from('jobs')
          .insert([insertData])
          .select('id')
          .single();
      }

      if (result.error) throw result.error;

      // Save essential criteria
      if (data.essential_criteria?.length) {
        const criteriaData = data.essential_criteria.map(criterion => {
          // Remove the temporary ID and let the database generate a UUID
          const { id, ...criterionWithoutId } = criterion;
          return {
            ...criterionWithoutId,
            job_id: isEditing ? jobId : result.data?.id,
          };
        });

        if (isEditing) {
          // Delete existing criteria first
          await supabase
            .from('essential_criteria')
            .delete()
            .eq('job_id', jobId);
        }

        const { error: criteriaError } = await supabase
          .from('essential_criteria')
          .insert(criteriaData);

        if (criteriaError) throw criteriaError;
      }

      // Save killer questions
      if (data.killer_questions?.length) {
        const questionsData = data.killer_questions.map(question => {
          // Remove the temporary ID and let the database generate a UUID
          const { id, ...questionWithoutId } = question;
          return {
            ...questionWithoutId,
            job_id: isEditing ? jobId : result.data?.id,
          };
        });

        if (isEditing) {
          // Delete existing questions first
          await supabase
            .from('killer_questions')
            .delete()
            .eq('job_id', jobId);
        }

        const { error: questionsError } = await supabase
          .from('killer_questions')
          .insert(questionsData);

        if (questionsError) throw questionsError;
      }

      toast({
        title: "Success",
        description: `Job ${publish ? 'published' : 'saved'} successfully`,
      });

      // Navigate back to admin jobs list
      navigate('/admin/jobs');

    } catch (error) {
      console.error('Error saving job:', error);
      toast({
        title: "Error",
        description: "Failed to save job. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const saveAsTemplate = async () => {
    toast({
      title: "Template Feature",
      description: "Save as template functionality will be implemented in a future update.",
    });
  };

  const copyPublicLink = () => {
    navigator.clipboard.writeText(publicUrl);
    toast({
      title: "Link Copied",
      description: "Public job link copied to clipboard",
    });
  };

  const previewJob = () => {
    window.open(publicUrl, '_blank');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 6: Review & Publish</CardTitle>
        <p className="text-muted-foreground">
          Review your job posting and publish when ready
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Validation Checklist */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Validation Checklist</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {validationItems.map((item, index) => (
              <div key={index} className="flex items-start space-x-3">
                {item.status === 'pass' ? (
                  <CheckCircle className="w-5 h-5 text-primary mt-0.5" />
                ) : (
                  <AlertTriangle className={`w-5 h-5 mt-0.5 ${
                    item.status === 'fail' ? 'text-destructive' : 'text-yellow-500'
                  }`} />
                )}
                <div className="flex-1">
                  <p className="font-medium">{item.label}</p>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
                <Badge variant={
                  item.status === 'pass' ? 'default' : 
                  item.status === 'fail' ? 'destructive' : 'secondary'
                }>
                  {item.status === 'pass' ? 'Pass' : 
                   item.status === 'fail' ? 'Fail' : 'Warning'}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Job URL Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Job URL</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>URL Slug</Label>
              <Input
                value={slug}
                onChange={(e) => updateSlug(e.target.value)}
                placeholder="job-url-slug"
              />
              <p className="text-sm text-muted-foreground">
                This will be the URL where candidates can view and apply for the job
              </p>
            </div>

            {slug && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Public URL:</p>
                    <p className="text-sm text-muted-foreground font-mono">{publicUrl}</p>
                  </div>
                  <div className="space-x-2">
                    <Button size="sm" variant="outline" onClick={copyPublicLink}>
                      <Copy className="w-3 h-3 mr-1" />
                      Copy
                    </Button>
                    <Button size="sm" variant="outline" onClick={previewJob}>
                      <Eye className="w-3 h-3 mr-1" />
                      Preview
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Job Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Job Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Title:</span> {data.title || 'Not set'}
              </div>
              <div>
                <span className="font-medium">Category:</span> {data.category || 'Not set'}
              </div>
              <div>
                <span className="font-medium">Location:</span> {data.location || 'Not set'}
              </div>
              <div>
                <span className="font-medium">Org Unit:</span> {data.org_unit || 'Not set'}
              </div>
              <div>
                <span className="font-medium">Essential Criteria:</span> {data.essential_criteria?.length || 0} items
              </div>
              <div>
                <span className="font-medium">Killer Questions:</span> {data.killer_questions?.length || 0} questions
              </div>
              <div>
                <span className="font-medium">Closing Date:</span> {
                  data.closing_date ? new Date(data.closing_date).toLocaleDateString() : 'Not set'
                }
              </div>
              <div>
                <span className="font-medium">Required Uploads:</span> {
                  Object.values(data.attachments_required || {}).filter(Boolean).length
                } types
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Publishing Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Publishing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Publish Job</Label>
                <p className="text-sm text-muted-foreground">
                  Make this job visible to candidates and accept applications
                </p>
              </div>
              <Switch
                checked={isPublished}
                onCheckedChange={togglePublish}
                disabled={!canPublish}
              />
            </div>

            {!canPublish && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive">
                  <strong>Cannot publish:</strong> Please fix all critical validation issues before publishing.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Button variant="outline" onClick={onPrev}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => saveJob(false)}
            disabled={isSaving}
          >
            <Save className="w-4 h-4 mr-2" />
            Save Draft
          </Button>

          <Button 
            variant="outline" 
            onClick={saveAsTemplate}
            disabled={isSaving}
          >
            Save as Template
          </Button>

          <Button 
            onClick={() => saveJob(true)}
            disabled={!canPublish || isSaving}
          >
            <Globe className="w-4 h-4 mr-2" />
            {isPublished ? 'Update & Publish' : 'Publish Job'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}