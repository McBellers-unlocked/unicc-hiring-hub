import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont } from "https://esm.sh/pdf-lib@1.17.1";

// A4 dimensions in points
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_LEFT = 70;
const MARGIN_RIGHT = 70;
const MARGIN_TOP = 60;
const MARGIN_BOTTOM = 80;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
const LINE_HEIGHT = 16;
const HEADING_LINE_HEIGHT = 22;

interface DrawContext {
  doc: PDFDocument;
  pages: PDFPage[];
  font: PDFFont;
  fontBold: PDFFont;
  y: number;
  pageIndex: number;
  totalPages: number;
}

function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const width = font.widthOfTextAtSize(testLine, fontSize);
    if (width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines.length > 0 ? lines : [""];
}

function ensureSpace(ctx: DrawContext, needed: number): void {
  if (ctx.y - needed < MARGIN_BOTTOM) {
    ctx.pageIndex++;
    const page = ctx.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    ctx.pages.push(page);
    ctx.y = PAGE_HEIGHT - MARGIN_TOP;
  }
}

function drawText(ctx: DrawContext, text: string, opts: { fontSize?: number; font?: PDFFont; x?: number; lineHeight?: number; color?: any; indent?: number } = {}) {
  const fontSize = opts.fontSize || 11;
  const font = opts.font || ctx.font;
  const x = opts.x || MARGIN_LEFT;
  const lh = opts.lineHeight || LINE_HEIGHT;
  const indent = opts.indent || 0;
  const color = opts.color || rgb(0, 0, 0);
  
  const lines = wrapText(text, font, fontSize, CONTENT_WIDTH - indent);
  for (const line of lines) {
    ensureSpace(ctx, lh);
    ctx.pages[ctx.pageIndex].drawText(line, { x: x + indent, y: ctx.y, size: fontSize, font, color });
    ctx.y -= lh;
  }
}

function drawParagraph(ctx: DrawContext, text: string, opts: { fontSize?: number; font?: PDFFont; indent?: number } = {}) {
  drawText(ctx, text, opts);
  ctx.y -= 6; // paragraph spacing
}

function drawHeading(ctx: DrawContext, text: string) {
  ctx.y -= 4;
  ensureSpace(ctx, HEADING_LINE_HEIGHT);
  drawText(ctx, text, { fontSize: 13, font: ctx.fontBold, lineHeight: HEADING_LINE_HEIGHT });
  ctx.y -= 2;
}

function drawTableRow(ctx: DrawContext, label: string, value: string) {
  ensureSpace(ctx, LINE_HEIGHT);
  const page = ctx.pages[ctx.pageIndex];
  page.drawText(label, { x: MARGIN_LEFT, y: ctx.y, size: 11, font: ctx.font, color: rgb(0, 0, 0) });
  // Value column at 220pt from left margin
  const valueLines = wrapText(value, ctx.font, 11, CONTENT_WIDTH - 170);
  for (const line of valueLines) {
    page.drawText(line, { x: MARGIN_LEFT + 170, y: ctx.y, size: 11, font: ctx.font, color: rgb(0, 0, 0) });
    ctx.y -= LINE_HEIGHT;
  }
  ctx.y -= 4;
}

function drawPageFooters(ctx: DrawContext) {
  const totalPages = ctx.pages.length;
  for (let i = 0; i < totalPages; i++) {
    const page = ctx.pages[i];
    // Horizontal line
    page.drawLine({
      start: { x: MARGIN_LEFT, y: MARGIN_BOTTOM - 10 },
      end: { x: PAGE_WIDTH - MARGIN_RIGHT, y: MARGIN_BOTTOM - 10 },
      thickness: 0.5,
      color: rgb(0.4, 0.4, 0.4),
    });
    // Footer text
    page.drawText("UN Confidential – External", { x: MARGIN_LEFT, y: MARGIN_BOTTOM - 28, size: 8, font: ctx.font, color: rgb(0.4, 0.4, 0.4) });
    const pageNum = `Page ${i + 1} of ${totalPages}`;
    const pageNumWidth = ctx.font.widthOfTextAtSize(pageNum, 8);
    page.drawText(pageNum, { x: (PAGE_WIDTH - pageNumWidth) / 2, y: MARGIN_BOTTOM - 28, size: 8, font: ctx.font, color: rgb(0.4, 0.4, 0.4) });
    page.drawText("Rec-A VI – v 1.1", { x: PAGE_WIDTH - MARGIN_RIGHT - ctx.font.widthOfTextAtSize("Rec-A VI – v 1.1", 8), y: MARGIN_BOTTOM - 28, size: 8, font: ctx.font, color: rgb(0.4, 0.4, 0.4) });
  }
}

function drawHeaderOnSubsequentPages(ctx: DrawContext, staffNumber: string) {
  // Header line for pages 2+
  if (ctx.pageIndex > 0) {
    const headerText = `Letter of Offer of Fixed-term Appointment – Reference ${staffNumber} - Pages ${ctx.pageIndex + 1}`;
    ctx.pages[ctx.pageIndex].drawText(headerText, {
      x: MARGIN_LEFT, y: PAGE_HEIGHT - MARGIN_TOP + 20, size: 9, font: ctx.font, color: rgb(0.4, 0.4, 0.4),
    });
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { field_values } = await req.json();
    if (!field_values) {
      return new Response(JSON.stringify({ error: "field_values is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const v = (key: string): string => {
      // Try exact key, then lowercase
      return field_values[key] || field_values[key.toLowerCase()] || "";
    };

    const mr_ms = v("mr_ms") || v("title_prefix") || "Mr/Ms";
    const firstname = v("firstname") || v("first_name") || "";
    const surname = v("surname") || v("last_name") || v("lastname") || "";
    const fullName = `${firstname} ${surname}`.trim();
    const jobTitle = v("job_title") || v("jobtitle") || v("title") || v("position") || "";
    const dutyStation = v("duty_station") || v("dutystation") || v("ds") || "";
    const country = v("country") || "";
    const gradeLetters = v("grade") || "";
    const level = v("level") || v("step") || "";
    const gradeStep = `${gradeLetters}${level ? " Step " + level : ""}`;
    const staffNumber = v("staff_number") || v("staffnumber") || "[Staff#]";
    const currency = v("currency") || "[Currency]";
    const amount = v("amount") || "[Amount]";
    const startDate = v("start_date") || v("startdate") || v("effective_date") || "[Start Date]";
    const endDate = v("end_date") || v("enddate") || "[End Date]";
    const dateToday = v("date") || v("today") || "[Date]";
    const hrFocalPoint = v("hr") || v("hr_focal_point") || "[HR Focal Point]";
    const hrInitials = v("hrinitial") || v("hr_initials") || "";
    const vacancyRef = v("vacancy_reference") || v("reference") || "";

    // Create PDF
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Try to embed UNICC logo from Supabase storage
    let logoImage: any = null;
    try {
      const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { data: logoData } = await supabase.storage.from("document-repository").download("assets/UNICC_logo.png");
      if (logoData) {
        const logoBytes = new Uint8Array(await logoData.arrayBuffer());
        logoImage = await pdfDoc.embedPng(logoBytes);
      }
    } catch (e) {
      console.log("Logo not found in storage, continuing without it:", e);
    }

    const firstPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    const ctx: DrawContext = {
      doc: pdfDoc,
      pages: [firstPage],
      font,
      fontBold,
      y: PAGE_HEIGHT - MARGIN_TOP,
      pageIndex: 0,
      totalPages: 0,
    };

    // ===== PAGE 1: Header =====
    // Logo (top left)
    if (logoImage) {
      const logoScale = 70 / logoImage.height;
      firstPage.drawImage(logoImage, {
        x: MARGIN_LEFT,
        y: PAGE_HEIGHT - MARGIN_TOP - 10,
        width: logoImage.width * logoScale,
        height: 70,
      });
    }

    // Address (top right)
    const addressLines = ["Palais des Nations", "1211 Geneva 10", "Switzerland", "www.unicc.org"];
    let addrY = PAGE_HEIGHT - MARGIN_TOP + 5;
    for (const line of addressLines) {
      const w = font.widthOfTextAtSize(line, 10);
      firstPage.drawText(line, { x: PAGE_WIDTH - MARGIN_RIGHT - w, y: addrY, size: 10, font, color: rgb(0, 0, 0) });
      addrY -= 14;
    }

    ctx.y = PAGE_HEIGHT - MARGIN_TOP - 95;

    // HUMAN RESOURCES SECTION title
    const hrsTitle = "HUMAN RESOURCES SECTION";
    const hrsTitleWidth = fontBold.widthOfTextAtSize(hrsTitle, 16);
    ensureSpace(ctx, 24);
    firstPage.drawText(hrsTitle, { x: (PAGE_WIDTH - hrsTitleWidth) / 2, y: ctx.y, size: 16, font: fontBold, color: rgb(0, 0, 0) });
    ctx.y -= 30;

    // Subtitle
    drawParagraph(ctx, "Letter of Offer of Fixed-term Appointment under Staff Rule 420.3", { fontSize: 11 });
    drawParagraph(ctx, `Reference: FL/[xx] - ${staffNumber}`, { fontSize: 11 });

    // Addressee block (right-aligned)
    ctx.y -= 8;
    const addresseeLines = [fullName, "[Address of the person]", country || "[Country]"];
    for (const line of addresseeLines) {
      ensureSpace(ctx, LINE_HEIGHT);
      const xPos = PAGE_WIDTH / 2 + 20;
      ctx.pages[ctx.pageIndex].drawText(line, { x: xPos, y: ctx.y, size: 11, font, color: rgb(0, 0, 0) });
      ctx.y -= LINE_HEIGHT;
    }

    ctx.y -= 8;
    // Date (right-aligned)
    ensureSpace(ctx, LINE_HEIGHT);
    ctx.pages[ctx.pageIndex].drawText(dateToday, { x: PAGE_WIDTH / 2 + 20, y: ctx.y, size: 11, font, color: rgb(0, 0, 0) });
    ctx.y -= LINE_HEIGHT * 2;

    // Salutation
    drawParagraph(ctx, `Dear ${mr_ms} ${surname},`);

    // Body paragraph 1
    drawParagraph(ctx, `Further to our earlier communication, informing you of your selection for the position of "${jobTitle}" based in ${dutyStation}, ${country}, we are pleased to offer you a Fixed-Term Appointment with the United Nations International Computing Centre (UNICC).`);

    // Body paragraph 2
    drawParagraph(ctx, `Since UNICC is administratively hosted by the World Health Organization (WHO), this appointment is governed by the WHO Staff Regulations and Staff Rules and related policies on conditions of service of staff holding Fixed Term appointments under Staff Rule 420.3 and any subsequent amendments, as well as by the Memorandum of Understanding (MOU) for the Provision of Administrative Services by WHO to UNICC. The appointment is subject to any subsequent amendments to these documents.`);

    // Body paragraph 3
    drawParagraph(ctx, `This appointment is offered on the basis, inter alia, of your certification of the accuracy of the information provided by you on the personal history form and subject to medical clearance from the WHO Medical services. A copy of the position description "${vacancyRef ? `(Ref. ${vacancyRef})` : "(Ref. )"}" detailing your position duties and responsibilities is attached.`);

    // Conversion / transfer paragraph
    drawParagraph(ctx, `This appointment is made by conversion of your current Temporary appointment, which started on ${startDate}. Or This appointment is made by inter-agency transfer from UN Entity to UNICC.`);

    drawParagraph(ctx, `Please find below the appointment details of this position. A document providing further information on the employment conditions, as established under the Staff Regulations and Staff Rules, is also attached.`);

    // 1. Appointment details
    drawHeading(ctx, "1.  Appointment details");
    drawTableRow(ctx, "Appointment type:", "Fixed-Term Appointment");
    drawTableRow(ctx, "Title:", `"${jobTitle}"`);
    drawTableRow(ctx, "Category:", "General Service Staff");
    drawTableRow(ctx, "Grade/Step:", gradeStep);
    drawTableRow(ctx, "Duty Station:", dutyStation);

    // 2. Salary
    drawHeading(ctx, "2.  Salary");
    // Add header for page 2+ if we crossed a page
    drawHeaderOnSubsequentPages(ctx, staffNumber);

    drawParagraph(ctx, `Annual Net Base Salary    ${currency} ${amount} (net of tax)`);
    drawParagraph(ctx, `Your salary is paid on a monthly basis. The salary shown above does not include any allowances to which you may be entitled. Please refer to the WHO staff rules and regulations attached to the present letter and do not hesitate to ask your HR focal point for further information.`);

    // 3. Duration
    drawHeading(ctx, "3.  Duration of appointment");
    drawParagraph(ctx, `This fixed-term appointment is for a limited duration from ${startDate} to ${endDate} (inclusive) and is subject to a period of probation of one (1) year, which may be extended up to two (2) years. This appointment, irrespective of the length of service, gives no right to, and carries no expectation of, renewal or conversion to any other type of appointment with the UNICC. It will come to an end automatically on the agreed period of service unless an offer of extension is made and accepted. The expiration of the appointment does not warrant the payment of any termination indemnity.`);
    drawParagraph(ctx, `The present fixed-term appointment may be terminated prior to its expiry date, in accordance with Article IX of the Staff Regulations and Section 10 of the Staff Rules regarding separation from the service of the Organization.`);

    // 4. Submission of Documents
    drawHeading(ctx, "4.  Submission of Documents – only applicable for initial appointment");
    drawHeaderOnSubsequentPages(ctx, staffNumber);
    drawParagraph(ctx, `You will also be required to submit the following documents upon your arrival: original of your passport, birth certificates for yourself and your family members, marriage certificate or legally recognized domestic partnership (if applicable), as well as originals of your diploma(s)/degree(s) for certification of HR Focal Point or administrative assistant.`);
    drawParagraph(ctx, `If and when applicable, please also complete the attached forms, send them electronically to our HR focal point and provide him/her the signed original copies on your first day at work.`);

    // 5. Reporting to duty
    drawHeading(ctx, "5.  Reporting to duty");
    drawHeaderOnSubsequentPages(ctx, staffNumber);
    drawParagraph(ctx, `You are required to report to duty in the UNICC Office, ${dutyStation} on ${startDate}. Kindly advise us by email if you are unable to report to duty on this date. Upon arrival in the duty station, please contact the Human Resources Focal Point or administrative assistant who will provide you with an administrative briefing.`);

    // 6. Insurance
    drawHeading(ctx, "6.  Staff Health Insurance, Accident Insurance and Voluntary Group Life Insurance");
    drawHeaderOnSubsequentPages(ctx, staffNumber);
    drawParagraph(ctx, `Staff members and their dependents recognized by the Organization will be covered by the WHO Staff Health insurance during the present contract. For detailed information, please refer to the Staff Health Insurance document attached to this letter of offer.`);
    drawParagraph(ctx, `Participation in the organizations' Accident and Illness insurance is also mandatory for staff members (dependents are not covered by this insurance).`);
    drawParagraph(ctx, `You may also wish to opt for the Voluntary Group Life Insurance (VGLI), which is an optional scheme open to all fixed-term staff members who are participants in the United Nations Joint Staff Pension Fund.`);

    // 7. UNJSPF
    drawHeading(ctx, "7.  United Nations Joint Staff Pension Fund (UNJSPF)");
    drawHeaderOnSubsequentPages(ctx, staffNumber);
    drawParagraph(ctx, `Participation in the United Nations Joint Staff Pension Fund is mandatory for all staff members holding a fixed-term appointment and appropriate deductions will be made automatically. For more details, please refer to the UNJSPF - Pension Brochure attached to this letter of offer.`);

    // 8. Standards of conduct
    drawHeading(ctx, "8.  Standards of conduct");
    drawHeaderOnSubsequentPages(ctx, staffNumber);
    drawParagraph(ctx, `Upon acceptance of this offer of appointment, you will acquire the status of an international civil servant within the United Nations common system and will hence benefit from privileges and immunities. In return, the highest standards of efficiency, competence and integrity will be expected of you throughout your career with UNICC. Your particular attention is drawn to Article I of the Staff Regulations and Section 1 of the Staff Rules regarding the Standards of Conduct for the International Civil Service and any further amendments that may be made, as well as to related WHO policies defined below.`);
    drawParagraph(ctx, `It should be noted that for the time of your employment with UNICC, you may not engage in any outside occupation or employment whether remunerated or not, without prior approval by UNICC and WHO.`);
    drawParagraph(ctx, `Furthermore, UNICC prides itself on a workforce that adheres to the highest ethical and professional standards. As such, UNICC and WHO actively works to prevent and eliminate all forms of abusive conduct (i.e., discrimination, abuse of authority, and harassment, including sexual harassment) and sexual exploitation and abuse, work to which all staff members contribute. Therefore, by accepting this offer of appointment, you acknowledge that you have read, accept, and agree to comply with, the Standards of Conduct and related WHO Policies, as defined below. Without limiting the above, any actual or suspected violations of any WHO policy of which you become aware, must be reported to UNICC and WHO immediately.`);
    drawParagraph(ctx, `For purposes of this offer of appointment, the term "WHO Policies" means collectively: (i) the WHO Code of Ethics and Professional Conduct; (ii) the WHO Policy on Sexual Exploitation and Abuse Prevention and Response; (iii) the WHO Policy on Preventing and Addressing Abusive Conduct; (iv) the WHO Code of Conduct for responsible Research; and (v) the WHO Policy on Whistleblowing and Protection Against Retaliation, in each case, as amended from time to time and which are publicly available on the WHO website at the following link: http://www.who.int/about/ethics/en/.`);
    drawParagraph(ctx, `Without prejudice to WHO's Staff Regulations and Rules, non-compliance with any of the Standards of Conduct and related WHO Policies may result in disciplinary measures under Staff rule 1110.`);

    // 9. Zero tolerance
    drawHeading(ctx, "9.  Zero tolerance for sexual exploitation and abuse, sexual harassment and other types of abusive conduct");
    drawHeaderOnSubsequentPages(ctx, staffNumber);
    drawParagraph(ctx, `UNICC and WHO has zero tolerance towards sexual exploitation and abuse, sexual harassment and other types of abusive conduct. In this regard, and without limiting any other provisions contained herein, by accepting this offer of appointment, you agree to (i) not engage in any conduct that would constitute sexual exploitation or abuse as described in the WHO Policy on Sexual Exploitation and Abuse Prevention and Response, and/or sexual harassment and other types of abusive conduct as described in the WHO Policy on Preventing and Addressing Abusive Conduct; and (ii) immediately report to WHO any actual or suspected violations of either Policy of which you become aware.`);
    drawParagraph(ctx, `You further acknowledge and agree that, without limiting any other provisions contained herein, (i) UNICC and WHO may withdraw this offer of appointment or terminate any appointment if you were found to have provided untruthful information concerning any sanction regarding acts of sexual exploitation or abuse, sexual harassment, or other types of abusive conduct; and (ii) UNICC and WHO shall be entitled to report any established acts of sexual exploitation or abuse, sexual harassment, or other types of abusive conduct on record to any other UN agency or other third party in a selection process.`);
    drawParagraph(ctx, `In addition, nothing herein shall limit the right of UNICC and WHO to refer any alleged breach of either Policy to the relevant national authorities for appropriate legal action.`);

    // Closing
    ctx.y -= 6;
    drawParagraph(ctx, `Should you be in agreement with the above, please return one signed copy of this letter to HR@unicc.org by ${dateToday} and copy ${mr_ms} ${hrFocalPoint} as your HR focal point.`);

    ctx.y -= 10;
    drawParagraph(ctx, "Yours sincerely,");
    ctx.y -= 30;
    drawText(ctx, "Frederic Laval", { font: fontBold });
    drawText(ctx, "Chief, Human Resources Section");
    ctx.y -= 10;
    drawText(ctx, "To: Human Resources Section of UNICC");

    // ===== ACCEPTANCE PAGE =====
    // Force new page
    ctx.pageIndex++;
    const acceptPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    ctx.pages.push(acceptPage);
    ctx.y = PAGE_HEIGHT - MARGIN_TOP;
    drawHeaderOnSubsequentPages(ctx, staffNumber);
    ctx.y = PAGE_HEIGHT - MARGIN_TOP - 20;

    drawHeading(ctx, "ACCEPTANCE OF THE OFFER OF APPOINTMENT");

    drawParagraph(ctx, `I acknowledge receipt of this conditional offer of appointment and fully understand its terms and conditions. With this understanding, I hereby unequivocally accept this offer of appointment in accordance with its stated terms and conditions and in so doing certify the accuracy of the information provided in my personal history form and related/supporting information and documentation. I acknowledge that my appointment is governed by the WHO Staff Regulations and Staff Rules and related policies, of which I have taken note as well as by the Mandate of UNICC and the Memorandum of Understanding for the Provision of Administrative Services by WHO to UNICC.`);

    drawParagraph(ctx, `I have taken good note of the Position Description "${vacancyRef ? `(Ref. ${vacancyRef})` : "(Ref. )"}" and agree to take on the duties and responsibilities described therein.`);

    drawParagraph(ctx, `I note that the amounts of the entitlements indicated in this offer are established as of the date of this letter and may change in line with the Staff Regulations and Staff Rules and without prior notice.`);

    drawParagraph(ctx, `I have taken note of the Staff Regulations and Staff Rules and the Standards of Conduct for the International Civil Service, accept their provisions and accept that this appointment is for service with the UNICC only and does not give any right of transfer, reassignment or appointment in any offices of WHO (Host Organization) or in any Partner Organization of UNICC. The appointment offered is a Fixed-term one as defined in WHO Staff Regulation and does not imply an expectation of automatic renewal.`);

    drawParagraph(ctx, `Further, when my appointment with the UNICC ends, I will have no claim as a staff member of UNICC to employment in any offices of WHO (Host Organization) or in any Partner organization of UNICC.`);

    drawParagraph(ctx, `Since the Centre is an inter-Organization facility, the continuity of my employment at the Centre and my career prospect are governed entirely by the needs of the Centre. In the performance of my duties, I shall give equal consideration to the needs of all Partner Organizations of UNICC.`);

    drawParagraph(ctx, `In view of the conditions under which data is entrusted to and processed at the UNICC, I must at all times scrupulously observed the UNICC security regulations. Failure to follow these regulations is grounds for termination.`);

    drawParagraph(ctx, `Any software developed during the term of this contract is the exclusive property of the UNICC and its participant Organizations, and may not be copied or removed without authorization. I also note that this initial recruitment for a specific assignment does not relieve me of the obligation to serve in any other designated assignment.`);

    drawParagraph(ctx, `By signing this offer of appointment, I solemnly declare and promise to exercise all loyalty, discretion and conscience in the functions entrusted to me as an international civil servant of the United Nations International Computing Centre, to discharge those functions and regulate my conduct with the interests of the United Nations International Computing Centre only in view, and not to seek or accept instructions in regard to the performance of duties from any government or other authority external to UNICC.`);

    ctx.y -= 16;
    drawText(ctx, `Name: ${fullName}`);
    ctx.y -= 10;
    drawText(ctx, "Signature: _______________");
    ctx.y -= 10;
    drawText(ctx, "Date: ___________________");

    // ===== REFERENCE / HR FOCAL POINT PAGE =====
    ctx.pageIndex++;
    const refPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    ctx.pages.push(refPage);
    ctx.y = PAGE_HEIGHT - MARGIN_TOP;
    drawHeaderOnSubsequentPages(ctx, staffNumber);
    ctx.y = PAGE_HEIGHT - MARGIN_TOP - 20;

    drawParagraph(ctx, `Reference: ${staffNumber}`);
    ctx.y -= 10;
    drawParagraph(ctx, `Note: In reply, please refer to the HR focal point: ${hrFocalPoint} with a copy to hr@UNICC.org`);

    // ===== ANNEXES PAGE =====
    ctx.pageIndex++;
    const annexPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    ctx.pages.push(annexPage);
    ctx.y = PAGE_HEIGHT - MARGIN_TOP;
    drawHeaderOnSubsequentPages(ctx, staffNumber);
    ctx.y = PAGE_HEIGHT - MARGIN_TOP - 20;

    drawHeading(ctx, "Annexes: (please select relevant annexes from the list depending on the case)");
    ctx.y -= 4;
    const annexes = [
      "Position Description",
      "WHO 279 Reporting form",
      "WHO 90.1E Declaration of Personal Status/Application for Dependant's recognition and Staff Health Insurance",
      "WHO Staff Regulations and Staff Rules + (code of conduct)",
      "WHO 90.6 Designation of Beneficiaries.",
      "UNJSPF Pension Brochure-Participation",
      "UNJSPF Regulations and Rules",
      "UNJSPF Pension A/2 Designation of Recipients",
      "SHI Rules",
    ];
    for (let i = 0; i < annexes.length; i++) {
      drawText(ctx, `${i + 1}. ${annexes[i]}`);
      ctx.y -= 4;
    }

    // Draw footers on all pages
    drawPageFooters(ctx);

    // Save and return
    const pdfBytes = await pdfDoc.save();
    const fileName = `Offer_Letter_${surname}_${firstname}`.replace(/\s+/g, "_");

    return new Response(pdfBytes, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}.pdf"`,
      },
    });
  } catch (err: any) {
    console.error("generate-offer-letter-pdf error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
