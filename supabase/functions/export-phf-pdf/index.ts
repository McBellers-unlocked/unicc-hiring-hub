import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PHFData {
  personalInfo?: {
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    placeOfBirth?: string;
    nationality?: string;
    passportNumber?: string;
    passportIssueDate?: string;
    passportExpiryDate?: string;
  };
  contactInfo?: {
    address?: string;
    city?: string;
    country?: string;
    email?: string;
    phone?: string;
  };
  employment?: {
    currentEmployer?: string;
    position?: string;
    startDate?: string;
    endDate?: string;
  };
  education?: Array<{
    institution?: string;
    degree?: string;
    fieldOfStudy?: string;
    graduationDate?: string;
  }>;
  languages?: Array<{
    language?: string;
    proficiency?: string;
  }>;
  signature?: {
    data?: string;
    date?: string;
    place?: string;
  };
}

const generatePHFHTML = (phfData: PHFData, photoUrl?: string) => {
  const currentDate = new Date().toLocaleDateString('en-GB');
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>UNICC Personal History Form</title>
  <style>
    @page {
      size: A4;
      margin: 2cm 2cm 3cm 2cm;
      @top-center {
        content: "UNCLASSIFIED – EXTERNAL";
        font-family: Arial, sans-serif;
        font-size: 10pt;
        font-weight: bold;
      }
      @bottom-left {
        content: "Sel-A XV v1.5";
        font-family: Arial, sans-serif;
        font-size: 8pt;
        color: #666;
      }
      @bottom-right {
        content: "Page " counter(page) " of " counter(pages);
        font-family: Arial, sans-serif;
        font-size: 8pt;
        color: #666;
      }
    }
    
    body {
      font-family: Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.3;
      margin: 0;
      padding: 0;
      color: #000;
    }
    
    .header {
      text-align: center;
      border-bottom: 2px solid #003366;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }
    
    .unicc-logo {
      width: 80px;
      height: auto;
      margin-bottom: 10px;
    }
    
    .form-title {
      font-size: 16pt;
      font-weight: bold;
      color: #003366;
      margin: 10px 0;
    }
    
    .form-subtitle {
      font-size: 12pt;
      color: #666;
      margin-bottom: 5px;
    }
    
    .section {
      margin-bottom: 25px;
      page-break-inside: avoid;
    }
    
    .section-title {
      font-size: 13pt;
      font-weight: bold;
      color: #003366;
      border-bottom: 1px solid #003366;
      padding-bottom: 5px;
      margin-bottom: 15px;
    }
    
    .field-row {
      display: flex;
      margin-bottom: 12px;
      align-items: flex-start;
    }
    
    .field-label {
      font-weight: bold;
      width: 180px;
      flex-shrink: 0;
      padding-right: 10px;
    }
    
    .field-value {
      flex: 1;
      border-bottom: 1px solid #ccc;
      min-height: 18px;
      padding-bottom: 2px;
    }
    
    .photo-section {
      float: right;
      width: 120px;
      margin-left: 20px;
      margin-bottom: 20px;
    }
    
    .photo {
      width: 100%;
      height: 150px;
      border: 1px solid #ccc;
      object-fit: cover;
      margin-bottom: 5px;
    }
    
    .photo-placeholder {
      width: 100%;
      height: 150px;
      border: 1px solid #ccc;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: #f9f9f9;
      color: #666;
      font-size: 10pt;
      text-align: center;
    }
    
    .education-item, .language-item {
      border: 1px solid #ddd;
      margin-bottom: 10px;
      padding: 10px;
      background-color: #f9f9f9;
    }
    
    .signature-section {
      margin-top: 40px;
      border-top: 2px solid #003366;
      padding-top: 20px;
    }
    
    .signature-block {
      display: flex;
      justify-content: space-between;
      margin-top: 30px;
    }
    
    .signature-item {
      text-align: center;
      width: 200px;
    }
    
    .signature-line {
      border-bottom: 1px solid #000;
      height: 40px;
      margin-bottom: 5px;
      display: flex;
      align-items: flex-end;
      justify-content: center;
    }
    
    .signature-image {
      max-width: 180px;
      max-height: 35px;
      object-fit: contain;
    }
    
    .classification {
      text-align: center;
      font-weight: bold;
      color: #003366;
      margin: 20px 0;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15px;
    }
    
    th, td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
      vertical-align: top;
    }
    
    th {
      background-color: #f0f0f0;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="form-title">PERSONAL HISTORY FORM</div>
    <div class="form-subtitle">United Nations International Computing Centre</div>
    <div class="form-subtitle">Form Sel-A XV v1.5</div>
  </div>

  <div class="classification">UNCLASSIFIED – EXTERNAL</div>

  ${photoUrl ? `
  <div class="photo-section">
    <img src="${photoUrl}" alt="Candidate Photo" class="photo" />
    <div style="text-align: center; font-size: 9pt; color: #666;">Candidate Photo</div>
  </div>
  ` : `
  <div class="photo-section">
    <div class="photo-placeholder">Photo not provided</div>
  </div>
  `}

  <div class="section">
    <div class="section-title">1. PERSONAL INFORMATION</div>
    
    <div class="field-row">
      <div class="field-label">Family Name:</div>
      <div class="field-value">${phfData.personalInfo?.lastName || ''}</div>
    </div>
    
    <div class="field-row">
      <div class="field-label">First Name(s):</div>
      <div class="field-value">${phfData.personalInfo?.firstName || ''}</div>
    </div>
    
    <div class="field-row">
      <div class="field-label">Date of Birth:</div>
      <div class="field-value">${phfData.personalInfo?.dateOfBirth || ''}</div>
    </div>
    
    <div class="field-row">
      <div class="field-label">Place of Birth:</div>
      <div class="field-value">${phfData.personalInfo?.placeOfBirth || ''}</div>
    </div>
    
    <div class="field-row">
      <div class="field-label">Nationality:</div>
      <div class="field-value">${phfData.personalInfo?.nationality || ''}</div>
    </div>
    
    <div class="field-row">
      <div class="field-label">Passport Number:</div>
      <div class="field-value">${phfData.personalInfo?.passportNumber || ''}</div>
    </div>
    
    <div class="field-row">
      <div class="field-label">Passport Issue Date:</div>
      <div class="field-value">${phfData.personalInfo?.passportIssueDate || ''}</div>
    </div>
    
    <div class="field-row">
      <div class="field-label">Passport Expiry Date:</div>
      <div class="field-value">${phfData.personalInfo?.passportExpiryDate || ''}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">2. CONTACT INFORMATION</div>
    
    <div class="field-row">
      <div class="field-label">Address:</div>
      <div class="field-value">${phfData.contactInfo?.address || ''}</div>
    </div>
    
    <div class="field-row">
      <div class="field-label">City:</div>
      <div class="field-value">${phfData.contactInfo?.city || ''}</div>
    </div>
    
    <div class="field-row">
      <div class="field-label">Country:</div>
      <div class="field-value">${phfData.contactInfo?.country || ''}</div>
    </div>
    
    <div class="field-row">
      <div class="field-label">Email:</div>
      <div class="field-value">${phfData.contactInfo?.email || ''}</div>
    </div>
    
    <div class="field-row">
      <div class="field-label">Phone:</div>
      <div class="field-value">${phfData.contactInfo?.phone || ''}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">3. EMPLOYMENT HISTORY</div>
    
    <div class="field-row">
      <div class="field-label">Current Employer:</div>
      <div class="field-value">${phfData.employment?.currentEmployer || ''}</div>
    </div>
    
    <div class="field-row">
      <div class="field-label">Position:</div>
      <div class="field-value">${phfData.employment?.position || ''}</div>
    </div>
    
    <div class="field-row">
      <div class="field-label">Start Date:</div>
      <div class="field-value">${phfData.employment?.startDate || ''}</div>
    </div>
    
    <div class="field-row">
      <div class="field-label">End Date:</div>
      <div class="field-value">${phfData.employment?.endDate || ''}</div>
    </div>
  </div>

  ${phfData.education && phfData.education.length > 0 ? `
  <div class="section">
    <div class="section-title">4. EDUCATION</div>
    
    <table>
      <thead>
        <tr>
          <th>Institution</th>
          <th>Degree</th>
          <th>Field of Study</th>
          <th>Graduation Date</th>
        </tr>
      </thead>
      <tbody>
        ${phfData.education.map(edu => `
        <tr>
          <td>${edu.institution || ''}</td>
          <td>${edu.degree || ''}</td>
          <td>${edu.fieldOfStudy || ''}</td>
          <td>${edu.graduationDate || ''}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}

  ${phfData.languages && phfData.languages.length > 0 ? `
  <div class="section">
    <div class="section-title">5. LANGUAGES</div>
    
    <table>
      <thead>
        <tr>
          <th>Language</th>
          <th>Proficiency Level</th>
        </tr>
      </thead>
      <tbody>
        ${phfData.languages.map(lang => `
        <tr>
          <td>${lang.language || ''}</td>
          <td>${lang.proficiency || ''}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}

  <div class="signature-section">
    <div class="section-title">DECLARATION AND SIGNATURE</div>
    
    <p>I hereby declare that the information provided in this form is true and complete to the best of my knowledge. I understand that any false information may result in the rejection of my application or termination of my employment.</p>
    
    <div class="signature-block">
      <div class="signature-item">
        <div class="signature-line">
          ${phfData.signature?.data ? `<img src="${phfData.signature.data}" alt="Signature" class="signature-image" />` : ''}
        </div>
        <div>Candidate Signature</div>
      </div>
      
      <div class="signature-item">
        <div class="signature-line">${phfData.signature?.date || currentDate}</div>
        <div>Date</div>
      </div>
      
      <div class="signature-item">
        <div class="signature-line">${phfData.signature?.place || ''}</div>
        <div>Place</div>
      </div>
    </div>
  </div>

  <div class="classification" style="margin-top: 40px;">UNCLASSIFIED – EXTERNAL</div>
</body>
</html>
  `;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { applicationId } = await req.json();

    if (!applicationId) {
      throw new Error("Application ID is required");
    }

    console.log("Generating PHF PDF for application:", applicationId);

    // Fetch application data
    const { data: application, error: appError } = await supabase
      .from('applications')
      .select('id, phf_data, photo_url, candidates(name, email)')
      .eq('id', applicationId)
      .single();

    if (appError) {
      console.error("Error fetching application:", appError);
      throw appError;
    }

    if (!application) {
      throw new Error("Application not found");
    }

    // Generate HTML content
    const htmlContent = generatePHFHTML(application.phf_data || {}, application.photo_url);

    console.log("Generated HTML content for PHF");

    // For now, we'll return the HTML content
    // In a real implementation, you would use a PDF generation service
    // like Puppeteer in a Docker container or a third-party service
    
    // Simulate PDF generation and Azure storage
    const pdfFilename = `phf_${applicationId}_${Date.now()}.pdf`;
    const mockAzureUrl = `https://youraccountstorage.blob.core.windows.net/phf-documents/${pdfFilename}`;

    // Update application with PHF PDF URL
    const { error: updateError } = await supabase
      .from('applications')
      .update({ phf_pdf_url: mockAzureUrl })
      .eq('id', applicationId);

    if (updateError) {
      console.error("Error updating application:", updateError);
      throw updateError;
    }

    // Log the action in audit logs
    await supabase.functions.invoke('create-audit-log', {
      body: {
        action: 'PHF_PDF_GENERATED',
        entity: 'applications',
        entityId: applicationId,
        after: { phf_pdf_url: mockAzureUrl },
        metadata: { filename: pdfFilename }
      }
    });

    console.log("PHF PDF generated successfully:", mockAzureUrl);

    return new Response(
      JSON.stringify({
        success: true,
        phf_pdf_url: mockAzureUrl,
        html_preview: htmlContent
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );

  } catch (error: any) {
    console.error("Error in export-phf-pdf function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);