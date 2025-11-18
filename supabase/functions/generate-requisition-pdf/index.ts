import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface JobRequisition {
  id: string
  reference_number: string
  position_title: string
  grade: string
  unit_section_division: string
  duty_station: string
  nature_of_position: string
  start_date: string
  positions_available: number
  purpose_of_position: string
  objectives_of_programme: string
  main_duties_responsibilities: string
  essential_experience: string
  desirable_experience: string
  essential_education: string
  desirable_education: string
  language_requirements: any
  chief_of_division_approved_by: string
  finance_controller_approved_by: string
  deputy_director_approved_by: string
  director_approved_by: string
}

function generatePDFHTML(requisition: JobRequisition): string {
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Position Description - ${requisition.position_title}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            font-size: 11pt;
            line-height: 1.4;
            margin: 0;
            padding: 20px;
            color: #333;
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        
        .logo {
            font-weight: bold;
            color: #0066cc;
            font-size: 14pt;
            margin-bottom: 10px;
        }
        
        h1 {
            color: #003d82;
            font-size: 16pt;
            font-weight: bold;
            text-align: center;
            margin: 20px 0;
            text-transform: uppercase;
        }
        
        h2 {
            color: #003d82;
            font-size: 12pt;
            font-weight: bold;
            margin: 20px 0 10px 0;
            border-bottom: 1px solid #ccc;
            padding-bottom: 5px;
        }
        
        h3 {
            color: #003d82;
            font-size: 11pt;
            font-weight: bold;
            margin: 15px 0 8px 0;
        }
        
        .position-info {
            margin: 20px 0;
        }
        
        .info-table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
        }
        
        .info-table td {
            padding: 8px;
            border: 1px solid #ddd;
            vertical-align: top;
        }
        
        .info-table td:first-child {
            font-weight: bold;
            background-color: #f5f5f5;
            width: 25%;
        }
        
        .section {
            margin: 20px 0;
            page-break-inside: avoid;
        }
        
        .competencies {
            margin: 10px 0;
        }
        
        .competencies ul {
            margin: 5px 0;
            padding-left: 20px;
        }
        
        .approval-section {
            margin-top: 40px;
            page-break-inside: avoid;
        }
        
        .approval-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        
        .approval-table td {
            padding: 15px 8px;
            border: 1px solid #333;
            vertical-align: top;
        }
        
        .signature-line {
            border-bottom: 1px solid #333;
            min-height: 20px;
            margin: 10px 0;
        }
        
        .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 9pt;
            color: #666;
            border-top: 1px solid #ccc;
            padding-top: 10px;
        }
        
        .ref-number {
            text-align: right;
            font-weight: bold;
            margin-bottom: 20px;
        }
        
        @media print {
            body { margin: 0; }
            .page-break { page-break-before: always; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">Digital. For the UN family</div>
    </div>
    
    <h1>Position Description – Professional Staff</h1>
    
    <div class="ref-number">
        Ref. ${requisition.reference_number}
    </div>
    
    <div class="section">
        <h2>Position Information</h2>
        <table class="info-table">
            <tr>
                <td>Position Number</td>
                <td>${requisition.reference_number}</td>
            </tr>
            <tr>
                <td>Position Title</td>
                <td>${requisition.position_title || ''}</td>
            </tr>
            <tr>
                <td>Grade</td>
                <td>${requisition.grade || ''}</td>
            </tr>
            <tr>
                <td>Unit/Section/Division</td>
                <td>${requisition.unit_section_division || ''}</td>
            </tr>
            <tr>
                <td>Duty Station</td>
                <td>${requisition.duty_station || ''}</td>
            </tr>
            <tr>
                <td>Nature of Position</td>
                <td>${requisition.nature_of_position || ''}</td>
            </tr>
            <tr>
                <td>Start Date</td>
                <td>${requisition.start_date || ''}</td>
            </tr>
            <tr>
                <td>Number of Positions</td>
                <td>${requisition.positions_available || 1}</td>
            </tr>
        </table>
    </div>
    
    <div class="section">
        <h2>Position Description</h2>
        
        <h3>Purpose of the Position</h3>
        <p>${requisition.purpose_of_position || ''}</p>
        
        <h3>Objectives of the Programme</h3>
        <p>${requisition.objectives_of_programme || ''}</p>
        
        <h3>Main duties and responsibilities</h3>
        <div>${requisition.main_duties_responsibilities || ''}</div>
    </div>
    
    <div class="section">
        <h2>Profile</h2>
        
        <h3>Essential Experience</h3>
        <p>${requisition.essential_experience || ''}</p>
        
        <h3>Desirable Experience</h3>
        <p>${requisition.desirable_experience || ''}</p>
        
        <h3>Essential Education</h3>
        <p>${requisition.essential_education || ''}</p>
        
        <h3>Desirable Education</h3>
        <p>${requisition.desirable_education || ''}</p>
        
        <h3>Languages</h3>
        <p>English: ${requisition.language_requirements?.english || 'Expert knowledge is required'}</p>
        ${requisition.language_requirements?.other ? `<p>Other: ${requisition.language_requirements.other}</p>` : ''}
    </div>
    
    <div class="approval-section">
        <h2>Approval</h2>
        <p>This Position Description is certified as an accurate description of the duties and responsibilities assigned and performed of the position.</p>
        
        <table class="approval-table">
            <tr>
                <td style="width: 50%;">
                    <strong>Approval of the Chief of Division:</strong><br><br>
                    Signature: <div class="signature-line"></div><br>
                    Date: <div class="signature-line"></div><br><br>
                    Full Name: ${requisition.chief_of_division_approved_by || ''}<br>
                    Job title: Chief of Division
                </td>
                <td style="width: 50%;">
                    <strong>Approval of the Director:</strong><br><br>
                    Signature: <div class="signature-line"></div><br>
                    Date: <div class="signature-line"></div><br><br>
                    Full Name: ${requisition.director_approved_by || 'Sameer Chauhan'}<br>
                    Job title: Director, UNICC
                </td>
            </tr>
        </table>
    </div>
    
    <div class="footer">
        <p>Confidential – UNICC Internal &nbsp;&nbsp;&nbsp;&nbsp; Page 1 of 1 &nbsp;&nbsp;&nbsp;&nbsp; Sel-A IIA - v6.4</p>
    </div>
</body>
</html>
  `
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { requisitionId } = await req.json()

    if (!requisitionId) {
      return new Response(
        JSON.stringify({ error: 'Requisition ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Fetch requisition data
    const { data: requisition, error: fetchError } = await supabaseClient
      .from('job_requisitions')
      .select('*')
      .eq('id', requisitionId)
      .single()

    if (fetchError || !requisition) {
      console.error('Error fetching requisition:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch requisition data' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Generate HTML content
    const htmlContent = generatePDFHTML(requisition)
    
    // For now, we'll return the HTML content and simulate PDF URL generation
    // In a production environment, you would use a service like Puppeteer or a PDF API
    const mockPdfUrl = `https://example.com/pdfs/${requisitionId}.pdf`
    
    // Update the requisition with PDF URL
    const { error: updateError } = await supabaseClient
      .from('job_requisitions')
      .update({ pdf_url: mockPdfUrl })
      .eq('id', requisitionId)

    if (updateError) {
      console.error('Error updating requisition:', updateError)
    }

    // Log the PDF generation
    await supabaseClient.functions.invoke('create-audit-log', {
      body: {
        action: 'PDF_GENERATED',
        entity: 'job_requisitions',
        entityId: requisitionId,
        after: { pdf_url: mockPdfUrl }
      }
    })

    return new Response(
      JSON.stringify({ 
        success: true, 
        pdfUrl: mockPdfUrl,
        htmlPreview: htmlContent 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error generating PDF:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})