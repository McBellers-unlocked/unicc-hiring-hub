import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { applicationId, questionId, videoData, duration, fileSize } = await req.json();

    if (!applicationId || !questionId || !videoData) {
      throw new Error('Missing required fields');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Convert base64 to blob for storage
    const binaryString = atob(videoData);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Generate unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `videos/${applicationId}/${questionId}-${timestamp}.webm`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('application-files')
      .upload(filename, bytes, {
        contentType: 'video/webm',
        upsert: false
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw new Error(`Failed to upload video: ${uploadError.message}`);
    }

    // Get the public URL for the uploaded video
    const { data: urlData } = supabase.storage
      .from('application-files')
      .getPublicUrl(filename);

    const publicUrl = urlData.publicUrl;

    // Store video answer in database
    const { data: videoAnswer, error: insertError } = await supabase
      .from('video_answers')
      .insert({
        application_id: applicationId,
        question_id: questionId,
        url: publicUrl,
        duration: duration,
        azure_blob_url: publicUrl, // For now, same as url
        file_size: fileSize,
        processing_status: 'uploaded',
        virus_scan_status: 'clean',
        taken_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      throw insertError;
    }

    // TODO: Implement actual Azure blob storage upload
    // const azureUploadUrl = await uploadToAzure(bytes, filename);
    
    // TODO: Implement transcription using OpenAI Whisper
    // const transcript = await transcribeVideo(azureUploadUrl);
    
    // For now, simulate transcription
    const simulatedTranscript = "This is a simulated transcript. In production, this would be generated using OpenAI Whisper API.";
    
    // Update with transcript
    const { error: updateError } = await supabase
      .from('video_answers')
      .update({
        transcript: simulatedTranscript,
        processing_status: 'completed'
      })
      .eq('id', videoAnswer.id);

    if (updateError) {
      console.error('Transcript update error:', updateError);
      // Don't throw here, as the video was successfully uploaded
    }

    console.log(`Video answer uploaded successfully: ${videoAnswer.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        videoAnswerId: videoAnswer.id,
        message: 'Video uploaded successfully' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in upload-video-answer:', error);
    const message = error instanceof Error ? error.message : 'Failed to upload video';
    
    return new Response(
      JSON.stringify({ 
        error: message,
        success: false 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

// Helper function for Azure upload (to be implemented)
// async function uploadToAzure(videoData: Uint8Array, filename: string): Promise<string> {
//   // Implementation would depend on Azure SDK and configuration
//   // Return the Azure blob URL
//   return `https://yourstorageaccount.blob.core.windows.net/videos/${filename}`;
// }

// Helper function for transcription (to be implemented)
// async function transcribeVideo(videoUrl: string): Promise<string> {
//   const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
//   
//   // Download video, convert to audio, send to OpenAI Whisper API
//   // Return the transcript
//   return "Transcribed text would be returned here";
// }