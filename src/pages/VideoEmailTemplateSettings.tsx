import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save, Eye, Mail } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function VideoEmailTemplateSettings() {
  const { userRoles } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Template fields
  const [subject, setSubject] = useState('Your next step for {{jobTitle}}: Pre-Recorded Video Interview');
  const [fromName, setFromName] = useState('UNICC HR Team');
  const [fromEmail, setFromEmail] = useState('hr@notifications.unicc.org');
  const [headerText, setHeaderText] = useState('🎥 Video Interview Invitation');
  const [headerSubtext, setHeaderSubtext] = useState('Your next step for {{jobTitle}}');
  const [greeting, setGreeting] = useState('Dear {{candidateName}},');
  const [bodyIntro, setBodyIntro] = useState('Congratulations on progressing to the video interview stage! We use pre-recorded video interviews to ensure a fair and consistent evaluation process for all candidates.');
  const [preparationItems, setPreparationItems] = useState([
    'Find a quiet room with good lighting',
    'Test your microphone and camera',
    'Use Chrome, Firefox, or Safari (latest versions)',
    'Have a stable internet connection',
    'Prepare examples from your experience'
  ]);
  const [buttonText, setButtonText] = useState('🚀 Start Your Video Interview');
  const [footerText, setFooterText] = useState('Best of luck with your interview!');
  const [signatureText, setSignatureText] = useState('UNICC Human Resources Team');

  useEffect(() => {
    loadTemplate();
  }, []);

  const loadTemplate = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'video_invite_email_template')
        .maybeSingle();

      if (error) throw error;

      if (data?.value) {
        const template = JSON.parse(data.value);
        setSubject(template.subject || subject);
        setFromName(template.fromName || fromName);
        setFromEmail(template.fromEmail || fromEmail);
        setHeaderText(template.headerText || headerText);
        setHeaderSubtext(template.headerSubtext || headerSubtext);
        setGreeting(template.greeting || greeting);
        setBodyIntro(template.bodyIntro || bodyIntro);
        setPreparationItems(template.preparationItems || preparationItems);
        setButtonText(template.buttonText || buttonText);
        setFooterText(template.footerText || footerText);
        setSignatureText(template.signatureText || signatureText);
      }
    } catch (error) {
      console.error('Error loading template:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveTemplate = async () => {
    setSaving(true);
    try {
      const template = {
        subject,
        fromName,
        fromEmail,
        headerText,
        headerSubtext,
        greeting,
        bodyIntro,
        preparationItems,
        buttonText,
        footerText,
        signatureText,
        updatedAt: new Date().toISOString()
      };

      const { error } = await supabase
        .from('system_settings')
        .upsert({
          key: 'video_invite_email_template',
          value: JSON.stringify(template),
          description: 'Email template for video interview invitations'
        }, {
          onConflict: 'key'
        });

      if (error) throw error;

      toast({
        title: "Template Saved",
        description: "Your email template has been updated successfully.",
      });
    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        title: "Error",
        description: "Failed to save template. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const previewHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Video Interview Invitation</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">${headerText}</h1>
    <p style="margin: 10px 0 0 0; font-size: 16px;">${headerSubtext}</p>
  </div>
  
  <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
    <p>${greeting}</p>
    
    <p>${bodyIntro}</p>
    
    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
      <h3 style="margin-top: 0; color: #667eea;">📋 What to prepare:</h3>
      <ul style="margin-bottom: 0;">
        ${preparationItems.map(item => `<li>${item}</li>`).join('\n        ')}
      </ul>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="[VIDEO_LINK]" 
         style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; font-size: 16px;">
        ${buttonText}
      </a>
    </div>
    
    <div style="background: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107; margin: 20px 0;">
      <strong>⏰ Deadline:</strong> [DEADLINE]
    </div>
    
    <p>${footerText}</p>
    <p>${signatureText}</p>
  </div>
</body>
</html>
  `;

  if (!userRoles.includes('Admin') && !userRoles.includes('HR Assistant')) {
    return (
      <Layout>
        <div className="container mx-auto py-8">
          <Alert variant="destructive">
            <AlertDescription>
              You don't have permission to access this page.
            </AlertDescription>
          </Alert>
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto py-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Video Interview Email Template</h1>
          <p className="text-muted-foreground mt-2">
            Customize the email template sent to candidates when they are invited to complete a video interview.
          </p>
        </div>

        <Tabs defaultValue="edit" className="space-y-4">
          <TabsList>
            <TabsTrigger value="edit">
              <Mail className="mr-2 h-4 w-4" />
              Edit Template
            </TabsTrigger>
            <TabsTrigger value="preview">
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="edit" className="space-y-4">
            <Alert>
              <AlertDescription>
                <strong>Available Variables:</strong> Use {'{{'} candidateName {'}}'},  {'{{'} jobTitle {'}}'},  {'{{'} videoLink {'}}'},  {'{{'} deadline {'}}'},  {'{{'} jobTimezone {'}}'} in your template.
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle>Email Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fromName">From Name</Label>
                    <Input
                      id="fromName"
                      value={fromName}
                      onChange={(e) => setFromName(e.target.value)}
                      placeholder="UNICC HR Team"
                    />
                  </div>
                  <div>
                    <Label htmlFor="fromEmail">From Email</Label>
                    <Input
                      id="fromEmail"
                      value={fromEmail}
                      onChange={(e) => setFromEmail(e.target.value)}
                      placeholder="hr@notifications.unicc.org"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="subject">Email Subject</Label>
                  <Input
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Email Content</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="headerText">Header Text</Label>
                  <Input
                    id="headerText"
                    value={headerText}
                    onChange={(e) => setHeaderText(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="headerSubtext">Header Subtext</Label>
                  <Input
                    id="headerSubtext"
                    value={headerSubtext}
                    onChange={(e) => setHeaderSubtext(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="greeting">Greeting</Label>
                  <Input
                    id="greeting"
                    value={greeting}
                    onChange={(e) => setGreeting(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="bodyIntro">Introduction Text</Label>
                  <Textarea
                    id="bodyIntro"
                    value={bodyIntro}
                    onChange={(e) => setBodyIntro(e.target.value)}
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="preparationItems">Preparation Checklist (one per line)</Label>
                  <Textarea
                    id="preparationItems"
                    value={preparationItems.join('\n')}
                    onChange={(e) => setPreparationItems(e.target.value.split('\n').filter(Boolean))}
                    rows={5}
                  />
                </div>

                <div>
                  <Label htmlFor="buttonText">Button Text</Label>
                  <Input
                    id="buttonText"
                    value={buttonText}
                    onChange={(e) => setButtonText(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="footerText">Footer Text</Label>
                  <Input
                    id="footerText"
                    value={footerText}
                    onChange={(e) => setFooterText(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="signatureText">Signature</Label>
                  <Input
                    id="signatureText"
                    value={signatureText}
                    onChange={(e) => setSignatureText(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={saveTemplate} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Template
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="preview">
            <Card>
              <CardHeader>
                <CardTitle>Email Preview</CardTitle>
                <CardDescription>
                  This is how your email will look to candidates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg p-4 bg-white">
                  <div className="mb-4 pb-4 border-b">
                    <p className="text-sm text-muted-foreground">Subject:</p>
                    <p className="font-medium">{subject.replace('{{jobTitle}}', 'Software Developer')}</p>
                  </div>
                  <iframe
                    srcDoc={previewHtml
                      .replace('{{candidateName}}', 'John Doe')
                      .replace(/{{jobTitle}}/g, 'Software Developer')
                      .replace('[DEADLINE]', 'October 15, 2025, 5:00 PM (CET)')}
                    className="w-full h-[600px] border-0"
                    title="Email Preview"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}