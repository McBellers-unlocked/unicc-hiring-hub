import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const filePath = url.searchParams.get('path');
    const authToken = url.searchParams.get('auth');
    
    if (!filePath) {
      return new Response('Missing file path parameter', { 
        status: 400,
        headers: corsHeaders 
      });
    }

    console.log(`📄 File proxy request for: ${filePath}`);

    // Get auth token from header, query param, or form data
    let token = '';
    const authHeader = req.headers.get('Authorization');
    
    if (authHeader) {
      token = authHeader.replace('Bearer ', '');
    } else if (authToken) {
      token = authToken;
    } else if (req.method === 'POST') {
      // Handle form submission with token
      const formData = await req.formData();
      token = formData.get('token') as string;
    }

    if (!token) {
      console.log('❌ No authorization token provided');
      return new Response('Unauthorized - No token provided', { 
        status: 401,
        headers: corsHeaders 
      });
    }

    console.log(`🔐 Authenticating request with token: ${token.substring(0, 20)}...`);

    // Verify the user token is valid
    const userSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );
    
    const { data: { user }, error: authError } = await userSupabase.auth.getUser(token);

    if (authError || !user) {
      console.log('❌ Invalid authorization:', authError?.message);
      return new Response('Invalid authorization', { 
        status: 401,
        headers: corsHeaders 
      });
    }

    console.log(`✅ Authenticated user: ${user.email}`);

    // Create Supabase client with service role key for storage access
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // IDOR protection: verify the user owns the file or has admin/HR role
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const isPrivilegedRole = userProfile?.role && ['Admin', 'HR Assistant', 'Chief of HR'].includes(userProfile.role);

    if (!isPrivilegedRole) {
      // Check if the file path belongs to an application owned by this user's candidate record
      const { data: candidate } = await supabase
        .from('candidates')
        .select('id')
        .eq('email', user.email)
        .single();

      if (!candidate) {
        console.log('❌ No candidate record found for user');
        return new Response('Forbidden', { status: 403, headers: corsHeaders });
      }

      // Check if any of the user's applications reference this file path
      const { data: apps } = await supabase
        .from('applications')
        .select('id, files')
        .eq('candidate_id', candidate.id);

      const ownsFile = apps?.some(app => {
        if (!app.files) return false;
        const filesStr = JSON.stringify(app.files);
        return filesStr.includes(filePath);
      });

      // Also check if the file path starts with the candidate's ID (common storage pattern)
      const pathBelongsToCandidate = filePath.startsWith(candidate.id);

      if (!ownsFile && !pathBelongsToCandidate) {
        console.log(`❌ User ${user.email} does not own file: ${filePath}`);
        return new Response('Forbidden', { status: 403, headers: corsHeaders });
      }
    }

    // Download the file from storage using service role
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('application-files')
      .download(filePath);

    if (downloadError) {
      console.error('❌ Error downloading file:', downloadError);
      return new Response(`File not found: ${downloadError.message}`, { 
        status: 404,
        headers: corsHeaders 
      });
    }

    if (!fileData) {
      console.log('❌ File data is null');
      return new Response('File not found', { 
        status: 404,
        headers: corsHeaders 
      });
    }

    console.log(`✅ Successfully retrieved file: ${filePath}, size: ${fileData.size} bytes`);

    // Determine content type based on file extension
    const extension = filePath.split('.').pop()?.toLowerCase() || '';
    let contentType = 'application/octet-stream';
    
    switch (extension) {
      case 'pdf':
        contentType = 'application/pdf';
        break;
      case 'docx':
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        break;
      case 'doc':
        contentType = 'application/msword';
        break;
      case 'txt':
        contentType = 'text/plain';
        break;
    }

    // Convert blob to array buffer
    const arrayBuffer = await fileData.arrayBuffer();

    // Return the file with proper headers
    return new Response(arrayBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${filePath.split('/').pop()}"`,
        'Cache-Control': 'public, max-age=3600',
      },
    });

  } catch (error) {
    console.error('❌ File proxy error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(`Server error: ${message}`, { 
      status: 500,
      headers: corsHeaders 
    });
  }
});