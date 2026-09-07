import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const fileName = url.searchParams.get('file')
    const page = parseInt(url.searchParams.get('page') || '1')
    const scale = parseFloat(url.searchParams.get('scale') || '1.0')
    const format = url.searchParams.get('format') || 'webp'
    const token = url.searchParams.get('token') || req.headers.get('Authorization')?.replace('Bearer ', '')

    console.log(`🖼️ Generating image for ${fileName}, page ${page}`)

    if (!fileName || !token) {
      return new Response('Missing parameters', { status: 400, headers: corsHeaders })
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      console.log('❌ Authentication failed for page image')
      return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    }

    // For now, generate a placeholder image since we don't have PDF processing library
    // In a real implementation, you would extract the specific page and convert to image
    const width = Math.floor(595 * scale)
    const height = Math.floor(842 * scale)
    
    // Create a simple SVG placeholder that looks like a document page
    const svgContent = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#ffffff" stroke="#e0e0e0" stroke-width="1"/>
        <rect x="40" y="40" width="${width - 80}" height="20" fill="#f0f0f0"/>
        <rect x="40" y="80" width="${width - 120}" height="12" fill="#f8f8f8"/>
        <rect x="40" y="100" width="${width - 100}" height="12" fill="#f8f8f8"/>
        <rect x="40" y="120" width="${width - 140}" height="12" fill="#f8f8f8"/>
        <rect x="40" y="150" width="${width - 80}" height="12" fill="#f8f8f8"/>
        <rect x="40" y="170" width="${width - 110}" height="12" fill="#f8f8f8"/>
        <text x="${width/2}" y="${height/2}" text-anchor="middle" font-family="Arial" font-size="14" fill="#666">
          PDF Page ${page}
        </text>
        <text x="${width/2}" y="${height/2 + 20}" text-anchor="middle" font-family="Arial" font-size="10" fill="#999">
          ${fileName}
        </text>
      </svg>
    `

    // Convert SVG to the requested format (for now just return SVG)
    const contentType = format === 'png' ? 'image/png' : format === 'webp' ? 'image/webp' : 'image/svg+xml'
    
    return new Response(svgContent, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600'
      }
    })

  } catch (error: any) {
    console.error('❌ Error generating page image:', error)
    return new Response('Error generating image', { 
      status: 500, 
      headers: corsHeaders 
    })
  }
})