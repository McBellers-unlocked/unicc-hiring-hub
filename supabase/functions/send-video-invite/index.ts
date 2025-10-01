import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VideoInviteRequest {
  applicationId: string;
  assignmentId: string;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  videoLink: string;
  deadline: string;
  jobTimezone: string;
  retakesAllowed: boolean;
  maxRetakes: number;
  readTime: number;
  prepTime: number;
  answerTime: number;
}

const generateVideoInviteHtml = (data: VideoInviteRequest) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Video Interview Invitation</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">🎥 Video Interview Invitation</h1>
    <p style="margin: 10px 0 0 0; font-size: 16px;">Your next step for ${data.jobTitle}</p>
  </div>
  
  <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
    <p>Dear ${data.candidateName},</p>
    
    <p>Congratulations on progressing to the video interview stage! We use pre-recorded video interviews to ensure a fair and consistent evaluation process for all candidates.</p>
    
    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
      <h3 style="margin-top: 0; color: #667eea;">📋 What to prepare:</h3>
      <ul style="margin-bottom: 0;">
        <li>Find a quiet room with good lighting</li>
        <li>Test your microphone and camera</li>
        <li>Use Chrome, Firefox, or Safari (latest versions)</li>
        <li>Have a stable internet connection</li>
        <li>Prepare examples from your experience</li>
      </ul>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${data.videoLink}" 
         style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; font-size: 16px;">
        🚀 Start Your Video Interview
      </a>
    </div>
    
    <div style="background: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107; margin: 20px 0;">
      <strong>⏰ Deadline:</strong> ${data.deadline} (${data.jobTimezone})
    </div>
    
    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #667eea;">📝 Interview Format:</h3>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px;">
        <div style="text-align: center; padding: 10px; background: #f8f9fa; border-radius: 5px;">
          <div style="font-size: 24px;">📖</div>
          <strong>Read Time</strong><br>
          ${data.readTime} seconds
        </div>
        <div style="text-align: center; padding: 10px; background: #f8f9fa; border-radius: 5px;">
          <div style="font-size: 24px;">💭</div>
          <strong>Prep Time</strong><br>
          ${data.prepTime} seconds
        </div>
        <div style="text-align: center; padding: 10px; background: #f8f9fa; border-radius: 5px;">
          <div style="font-size: 24px;">🎤</div>
          <strong>Answer Time</strong><br>
          ${data.answerTime} seconds
        </div>
      </div>
      ${data.retakesAllowed ? `
        <div style="margin-top: 15px; padding: 10px; background: #d1ecf1; border-radius: 5px;">
          <strong>🔄 Retakes:</strong> You can retake each question up to ${data.maxRetakes} time(s)
        </div>
      ` : ''}
    </div>
    
    <div style="margin: 20px 0; padding: 15px; background: #e2e3e5; border-radius: 5px;">
      <p style="margin: 0; font-size: 14px;">
        <strong>Need help?</strong> Contact our support team or check our 
        <a href="https://www.unicc.org/unicc-privacy-notice-for-applicants/" style="color: #667eea;">Privacy Notice</a>
      </p>
    </div>
    
    <p>Best of luck with your interview!</p>
    <p>UNICC Human Resources Team</p>
  </div>
</body>
</html>
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const data: VideoInviteRequest = await req.json();

    console.log('Sending video invite to:', data.candidateEmail);

    // Load custom email template from system_settings
    const { data: settingsData } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'video_invite_email_template')
      .maybeSingle();

    let emailHtml = generateVideoInviteHtml(data);
    let fromName = 'UNICC HR Team';
    let fromEmail = 'hr@notifications.unicc.org';
    let subject = `Your next step for ${data.jobTitle}: Pre-Recorded Video Interview`;

    // Use custom template if available
    if (settingsData?.value) {
      try {
        const template = JSON.parse(settingsData.value);
        fromName = template.fromName || fromName;
        fromEmail = template.fromEmail || fromEmail;
        subject = template.subject?.replace('{{jobTitle}}', data.jobTitle) || subject;
        // Generate HTML with custom template values if provided
        // For now, we'll use the default HTML generator
      } catch (error) {
        console.error('Error parsing template:', error);
      }
    }

    const { error } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [data.candidateEmail],
      subject: subject,
      html: emailHtml,
    });

    if (error) {
      throw error;
    }

    // Log the email sent event
    await supabase.rpc('log_email_sent', {
      p_actor_id: null, // System generated
      p_recipient: data.candidateEmail,
      p_subject: `Your next step for ${data.jobTitle}: Pre-Recorded Video Interview`,
      p_template: 'video_invite'
    });

    console.log('Video invite sent successfully');

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error sending video invite:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});