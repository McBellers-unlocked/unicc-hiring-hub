import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from "npm:resend@2.0.0";
import { corsHeaders } from '../_shared/cors.ts';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface LonglistCompleteRequest {
  jobId: string;
  longlistStats: {
    tier1: number;
    tier2: number;
    eligible: number;
    rejected: number;
    total: number;
  };
  hasVideoStage: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jobId, longlistStats, hasVideoStage }: LonglistCompleteRequest = await req.json();

    if (!jobId) {
      return new Response(
        JSON.stringify({ error: 'Job ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get job details
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, title, org_unit')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      console.error('Error fetching job:', jobError);
      return new Response(
        JSON.stringify({ error: 'Job not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get hiring managers - first try job_hiring_managers table, then fall back to requisition creator
    let users: Array<{ id: string; name: string; email: string }> = [];

    // Try job_hiring_managers first
    const { data: hiringManagers, error: hmError } = await supabase
      .from('job_hiring_managers')
      .select('user_id')
      .eq('job_id', jobId);

    if (hmError) {
      console.error('Error fetching hiring managers:', hmError);
    }

    if (hiringManagers && hiringManagers.length > 0) {
      // Use job_hiring_managers if entries exist
      const userIds = hiringManagers.map(hm => hm.user_id);
      const { data: hmUsers, error: usersError } = await supabase
        .from('users')
        .select('id, name, email')
        .in('id', userIds);

      if (usersError) {
        console.error('Error fetching hiring manager user details:', usersError);
      } else if (hmUsers && hmUsers.length > 0) {
        users = hmUsers;
      }
    }

    // Fall back to requisition creator if no hiring managers found
    if (users.length === 0) {
      console.log('No hiring managers in job_hiring_managers, checking requisition creator...');
      
      const { data: requisition, error: reqError } = await supabase
        .from('job_requisitions')
        .select('id, created_by, users!job_requisitions_created_by_fkey(id, name, email)')
        .eq('converted_to_job_id', jobId)
        .single();

      if (reqError) {
        console.error('Error fetching requisition:', reqError);
      } else if (requisition?.users) {
        console.log('Found requisition creator:', requisition.users);
        users = [requisition.users as { id: string; name: string; email: string }];
      }
    }

    // If still no hiring managers found, return error
    if (users.length === 0) {
      console.error('No hiring managers found for job:', jobId);
      return new Response(
        JSON.stringify({ 
          error: 'No hiring manager found for this job. Please ensure the job has a hiring manager assigned or was converted from a requisition.',
          code: 'NO_HIRING_MANAGER'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Sending notifications to:', users.map(u => u.email));

    const siteUrl = Deno.env.get('PUBLIC_SITE_URL') || 'https://cxpnvbphjpntrvvgjhli.lovable.app';
    const longlistUrl = `${siteUrl}/applications/manage?job=${jobId}&status=Longlist`;

    // Build the instruction text with both pathways
    const nextStepInstruction = `
      <li style="margin-bottom: 12px;">
        <strong>If using pre-recorded video interviews:</strong> 
        Move candidates using the <span style="background-color: #dbeafe; padding: 2px 6px; border-radius: 4px; font-weight: 600;">"Add to Video"</span> button. 
        We will configure the video assignment and send invites when the shortlisting is complete.
      </li>
      <li style="margin-bottom: 12px;">
        <strong>If proceeding directly to panel interview:</strong> 
        Move candidates to <span style="background-color: #dcfce7; padding: 2px 6px; border-radius: 4px; font-weight: 600;">"Shortlist"</span> status. 
        They will be scheduled for an interview with the panel.
      </li>
    `;

    // Build tier breakdown
    let tierBreakdown = '';
    if (longlistStats.tier1 > 0) {
      tierBreakdown += `<li><span style="color: #16a34a; font-weight: 600;">Tier 1 (Highly Recommended):</span> ${longlistStats.tier1} candidate${longlistStats.tier1 !== 1 ? 's' : ''}</li>`;
    }
    if (longlistStats.tier2 > 0) {
      tierBreakdown += `<li><span style="color: #ca8a04; font-weight: 600;">Tier 2 (Recommended):</span> ${longlistStats.tier2} candidate${longlistStats.tier2 !== 1 ? 's' : ''}</li>`;
    }
    if (longlistStats.eligible > 0) {
      tierBreakdown += `<li><span style="color: #2563eb; font-weight: 600;">Eligible:</span> ${longlistStats.eligible} candidate${longlistStats.eligible !== 1 ? 's' : ''}</li>`;
    }
    if (longlistStats.rejected > 0) {
      tierBreakdown += `<li><span style="color: #dc2626;">Rejected:</span> ${longlistStats.rejected} candidate${longlistStats.rejected !== 1 ? 's' : ''}</li>`;
    }

    const emailsSent: string[] = [];
    const errors: string[] = [];

    // Send email to each hiring manager
    for (const user of users) {
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="background-color: #0073b1; padding: 30px; text-align: center;">
                      <img src="${siteUrl}/assets/unicc_logo.jpg" alt="UNICC" style="height: 50px; margin-bottom: 10px;" />
                      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Longlist Complete</h1>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px 30px;">
                      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                        Dear ${user.name || 'Hiring Manager'},
                      </p>
                      
                      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                        The HR team has completed the initial screening for <strong>${job.title}</strong>. The longlist is now ready for your review.
                      </p>

                      <!-- Stats Box -->
                      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 25px 0;">
                        <h3 style="color: #1e293b; font-size: 16px; margin: 0 0 15px 0;">Screening Summary</h3>
                        <ul style="color: #475569; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
                          ${tierBreakdown}
                        </ul>
                        <p style="color: #64748b; font-size: 14px; margin: 15px 0 0 0;">
                          <strong>Total longlisted:</strong> ${longlistStats.total} candidate${longlistStats.total !== 1 ? 's' : ''}
                        </p>
                      </div>

                      <!-- Action Items -->
                      <div style="background-color: #fefce8; border: 1px solid #fde047; border-radius: 8px; padding: 20px; margin: 25px 0;">
                        <h3 style="color: #854d0e; font-size: 16px; margin: 0 0 15px 0;">📋 Your Action Items</h3>
                        <ol style="color: #713f12; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
                          ${nextStepInstruction}
                          <li><strong>Reject remaining candidates:</strong> For candidates you don't want to proceed with, please reject them with a brief explanation.</li>
                          <li><strong>Leave comments:</strong> Please add notes to candidates to help the team understand your decisions.</li>
                        </ol>
                      </div>

                      <!-- Next Steps -->
                      <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 15px; margin-top: 20px; border-radius: 4px;">
                        <h4 style="margin: 0 0 8px 0; color: #166534; font-size: 14px;">Next Steps</h4>
                        <p style="margin: 0; color: #15803d; font-size: 14px;">
                          Once you have completed shortlisting, we will either arrange the pre-recorded video interviews 
                          or begin to prepare the interview panel.
                        </p>
                      </div>

                      <!-- Deadline -->
                      <p style="color: #dc2626; font-size: 14px; font-weight: 600; margin: 25px 0;">
                        ⏰ Please complete your review within 7 days.
                      </p>

                      <!-- CTA Button -->
                      <div style="text-align: center; margin: 30px 0;">
                        <a href="${longlistUrl}" style="display: inline-block; background-color: #0073b1; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 600;">
                          Review Longlist Now
                        </a>
                      </div>

                      <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 25px 0 0 0;">
                        If you have any questions, please contact the HR team.
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                      <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                        This is an automated notification from the UNICC Talent Management System.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

      try {
        const emailResponse = await resend.emails.send({
          from: 'UNICC Talent <notifications@unicc.email>',
          to: [user.email],
          subject: `Longlist Complete: ${job.title} Ready for Your Review`,
          html: emailHtml,
        });

        console.log(`Email sent to ${user.email}:`, emailResponse);
        emailsSent.push(user.email);

        // Log email to database
        await supabase
          .from('email_send_log')
          .insert({
            template_slug: 'longlist-complete',
            recipient_email: user.email,
            recipient_name: user.name,
            subject: `Longlist Complete: ${job.title} Ready for Your Review`,
            status: 'sent',
            sent_at: new Date().toISOString(),
            variables: { jobId, jobTitle: job.title, longlistStats, hasVideoStage }
          });

      } catch (emailError: any) {
        console.error(`Error sending email to ${user.email}:`, emailError);
        errors.push(`${user.email}: ${emailError.message}`);

        // Log failed email
        await supabase
          .from('email_send_log')
          .insert({
            template_slug: 'longlist-complete',
            recipient_email: user.email,
            recipient_name: user.name,
            subject: `Longlist Complete: ${job.title} Ready for Your Review`,
            status: 'failed',
            error_message: emailError.message,
            variables: { jobId, jobTitle: job.title, longlistStats, hasVideoStage }
          });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailsSent,
        errors: errors.length > 0 ? errors : undefined
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Error in send-longlist-complete-notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
