import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Printer } from 'lucide-react';

interface PHFPreviewProps {
  phfData: any;
  photoUrl?: string;
  onClose: () => void;
}

export const PHFPreview: React.FC<PHFPreviewProps> = ({ phfData, photoUrl, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="fixed inset-0 bg-background z-50 overflow-auto">
      {/* Header with controls - hidden in print */}
      <div className="sticky top-0 bg-background border-b p-4 print:hidden">
        <div className="flex justify-between items-center max-w-4xl mx-auto">
          <h2 className="text-xl font-semibold">Personal History Form Preview</h2>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button variant="outline" onClick={onClose}>
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
          </div>
        </div>
      </div>

      {/* Table of Contents - hidden in print */}
      <div className="max-w-4xl mx-auto p-4 print:hidden">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Quick Navigation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
              <a href="#personal" className="text-primary hover:underline">Personal Information</a>
              <a href="#dependants" className="text-primary hover:underline">Dependants</a>
              <a href="#relatives" className="text-primary hover:underline">Relatives in UN</a>
              <a href="#work-prefs" className="text-primary hover:underline">Work Preferences</a>
              <a href="#languages" className="text-primary hover:underline">Languages</a>
              <a href="#education" className="text-primary hover:underline">Education</a>
              <a href="#employment" className="text-primary hover:underline">Employment History</a>
              <a href="#additional" className="text-primary hover:underline">Additional Information</a>
              <a href="#consent" className="text-primary hover:underline">Consent</a>
              <a href="#mobility" className="text-primary hover:underline">Mobility</a>
              <a href="#references" className="text-primary hover:underline">References</a>
              <a href="#employer-contact" className="text-primary hover:underline">Employer Contact</a>
              <a href="#availability" className="text-primary hover:underline">Availability</a>
              <a href="#signature" className="text-primary hover:underline">Signature</a>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* PHF Content */}
      <div className="max-w-4xl mx-auto p-4 print:p-0 print:max-w-none">
        {/* Document Header */}
        <div className="text-center mb-8 print:mb-4">
          <div className="text-xs text-muted-foreground mb-2">Unclassified – External</div>
          <h1 className="text-2xl font-bold mb-2">PERSONAL HISTORY FORM</h1>
          <div className="text-sm text-muted-foreground">Sel‑A XV v1.5</div>
        </div>

        {/* Personal Information */}
        <section id="personal" className="mb-8 print:mb-4">
          <h2 className="text-lg font-semibold mb-4 border-b pb-2">1. PERSONAL INFORMATION</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Full Name:</label>
                <div className="border-b border-dotted pb-1">{phfData?.personal?.fullName || ''}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Date of Birth:</label>
                <div className="border-b border-dotted pb-1">{formatDate(phfData?.personal?.dateOfBirth)}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Place of Birth:</label>
                <div className="border-b border-dotted pb-1">{phfData?.personal?.placeOfBirth || ''}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Nationality:</label>
                <div className="border-b border-dotted pb-1">{phfData?.personal?.nationality || ''}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Gender:</label>
                <div className="border-b border-dotted pb-1">{phfData?.personal?.gender || ''}</div>
              </div>
            </div>
            {photoUrl && (
              <div className="flex justify-center">
                <div className="border-2 border-dashed border-muted-foreground p-2">
                  <img src={photoUrl} alt="Candidate Photo" className="w-32 h-40 object-cover" />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Dependants */}
        <section id="dependants" className="mb-8 print:mb-4">
          <h2 className="text-lg font-semibold mb-4 border-b pb-2">2. DEPENDANTS</h2>
          {phfData?.dependants?.length > 0 ? (
            <div className="space-y-3">
              {phfData.dependants.map((dep: any, index: number) => (
                <div key={index} className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Name:</span> {dep.name}
                  </div>
                  <div>
                    <span className="font-medium">Relationship:</span> {dep.relationship}
                  </div>
                  <div>
                    <span className="font-medium">Date of Birth:</span> {formatDate(dep.dateOfBirth)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground">No dependants declared</div>
          )}
        </section>

        {/* Relatives in UN */}
        <section id="relatives" className="mb-8 print:mb-4">
          <h2 className="text-lg font-semibold mb-4 border-b pb-2">3. RELATIVES IN UN SYSTEM</h2>
          {phfData?.relatives?.length > 0 ? (
            <div className="space-y-3">
              {phfData.relatives.map((rel: any, index: number) => (
                <div key={index} className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Name:</span> {rel.name}
                  </div>
                  <div>
                    <span className="font-medium">Relationship:</span> {rel.relationship}
                  </div>
                  <div>
                    <span className="font-medium">Organization:</span> {rel.organization}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground">No relatives in UN system</div>
          )}
        </section>

        {/* Work Preferences */}
        <section id="work-prefs" className="mb-8 print:mb-4">
          <h2 className="text-lg font-semibold mb-4 border-b pb-2">4. WORK PREFERENCES</h2>
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium">Preferred Location:</span> {phfData?.workPreferences?.preferredLocation || ''}
            </div>
            <div>
              <span className="font-medium">Available for Field Assignment:</span> {phfData?.workPreferences?.fieldAssignment ? 'Yes' : 'No'}
            </div>
            <div>
              <span className="font-medium">Travel Restrictions:</span> {phfData?.workPreferences?.travelRestrictions || 'None'}
            </div>
          </div>
        </section>

        {/* Languages */}
        <section id="languages" className="mb-8 print:mb-4">
          <h2 className="text-lg font-semibold mb-4 border-b pb-2">5. LANGUAGES</h2>
          {phfData?.languages?.length > 0 ? (
            <div className="space-y-3">
              {phfData.languages.map((lang: any, index: number) => (
                <div key={index} className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Language:</span> {lang.language}
                  </div>
                  <div>
                    <span className="font-medium">Reading:</span> {lang.reading}
                  </div>
                  <div>
                    <span className="font-medium">Writing:</span> {lang.writing}
                  </div>
                  <div>
                    <span className="font-medium">Speaking:</span> {lang.speaking}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground">No languages specified</div>
          )}
        </section>

        {/* Education */}
        <section id="education" className="mb-8 print:mb-4">
          <h2 className="text-lg font-semibold mb-4 border-b pb-2">6. EDUCATION</h2>
          {phfData?.education?.length > 0 ? (
            <div className="space-y-4">
              {phfData.education.map((edu: any, index: number) => (
                <div key={index} className="border border-muted p-3 rounded">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Institution:</span> {edu.institution}
                    </div>
                    <div>
                      <span className="font-medium">Degree:</span> {edu.degree}
                    </div>
                    <div>
                      <span className="font-medium">Field of Study:</span> {edu.fieldOfStudy}
                    </div>
                    <div>
                      <span className="font-medium">Year:</span> {edu.year}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground">No education history provided</div>
          )}
        </section>

        {/* Employment History */}
        <section id="employment" className="mb-8 print:mb-4">
          <h2 className="text-lg font-semibold mb-4 border-b pb-2">7. EMPLOYMENT HISTORY</h2>
          {phfData?.employment?.length > 0 ? (
            <div className="space-y-4">
              {phfData.employment.map((emp: any, index: number) => (
                <div key={index} className="border border-muted p-3 rounded">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Organization:</span> {emp.organization}
                    </div>
                    <div>
                      <span className="font-medium">Position:</span> {emp.position}
                    </div>
                    <div>
                      <span className="font-medium">Period:</span> {emp.startDate} - {emp.endDate || 'Present'}
                    </div>
                    <div>
                      <span className="font-medium">Supervisor:</span> {emp.supervisor}
                    </div>
                  </div>
                  {emp.duties && (
                    <div className="mt-2 text-sm">
                      <span className="font-medium">Duties:</span> {emp.duties}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground">No employment history provided</div>
          )}
        </section>

        {/* Additional Information */}
        <section id="additional" className="mb-8 print:mb-4">
          <h2 className="text-lg font-semibold mb-4 border-b pb-2">8. ADDITIONAL INFORMATION</h2>
          <div className="text-sm whitespace-pre-wrap">
            {phfData?.additionalInfo || 'No additional information provided'}
          </div>
        </section>

        {/* Consent */}
        <section id="consent" className="mb-8 print:mb-4">
          <h2 className="text-lg font-semibold mb-4 border-b pb-2">9. CONSENT</h2>
          <div className="text-sm">
            <div className="mb-2">
              <span className="font-medium">Background Check Consent:</span> {phfData?.consent?.backgroundCheck ? 'Yes' : 'No'}
            </div>
            <div>
              <span className="font-medium">Reference Contact Consent:</span> {phfData?.consent?.referenceContact ? 'Yes' : 'No'}
            </div>
          </div>
        </section>

        {/* Mobility */}
        <section id="mobility" className="mb-8 print:mb-4">
          <h2 className="text-lg font-semibold mb-4 border-b pb-2">10. MOBILITY</h2>
          <div className="text-sm">
            <div className="mb-2">
              <span className="font-medium">Willing to Relocate:</span> {phfData?.mobility?.willingToRelocate ? 'Yes' : 'No'}
            </div>
            <div>
              <span className="font-medium">Notice Period:</span> {phfData?.mobility?.noticePeriod || 'Not specified'}
            </div>
          </div>
        </section>

        {/* References */}
        <section id="references" className="mb-8 print:mb-4">
          <h2 className="text-lg font-semibold mb-4 border-b pb-2">11. REFERENCES</h2>
          {phfData?.references?.length > 0 ? (
            <div className="space-y-4">
              {phfData.references.map((ref: any, index: number) => (
                <div key={index} className="border border-muted p-3 rounded">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Name:</span> {ref.name}
                    </div>
                    <div>
                      <span className="font-medium">Title:</span> {ref.title}
                    </div>
                    <div>
                      <span className="font-medium">Organization:</span> {ref.organization}
                    </div>
                    <div>
                      <span className="font-medium">Email:</span> {ref.email}
                    </div>
                    <div>
                      <span className="font-medium">Phone:</span> {ref.phone}
                    </div>
                    <div>
                      <span className="font-medium">Relationship:</span> {ref.relationship}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground">No references provided</div>
          )}
        </section>

        {/* Employer Contact */}
        <section id="employer-contact" className="mb-8 print:mb-4">
          <h2 className="text-lg font-semibold mb-4 border-b pb-2">12. CURRENT EMPLOYER CONTACT</h2>
          <div className="text-sm">
            <div className="mb-2">
              <span className="font-medium">May we contact your current employer:</span> {phfData?.employerContact?.mayContact ? 'Yes' : 'No'}
            </div>
            {phfData?.employerContact?.restrictions && (
              <div>
                <span className="font-medium">Restrictions:</span> {phfData.employerContact.restrictions}
              </div>
            )}
          </div>
        </section>

        {/* Availability */}
        <section id="availability" className="mb-8 print:mb-4">
          <h2 className="text-lg font-semibold mb-4 border-b pb-2">13. AVAILABILITY</h2>
          <div className="text-sm">
            <div className="mb-2">
              <span className="font-medium">Available from:</span> {formatDate(phfData?.availability?.availableFrom)}
            </div>
            <div>
              <span className="font-medium">Notice required:</span> {phfData?.availability?.noticeRequired || 'Not specified'}
            </div>
          </div>
        </section>

        {/* Signature */}
        <section id="signature" className="mb-8 print:mb-4">
          <h2 className="text-lg font-semibold mb-4 border-b pb-2">14. SIGNATURE</h2>
          <div className="grid grid-cols-2 gap-8">
            <div>
              <div className="border-b border-dotted pb-1 mb-2 h-20 flex items-end">
                {phfData?.signature?.electronicSignature && (
                  <div className="font-script text-lg">{phfData.signature.electronicSignature}</div>
                )}
              </div>
              <div className="text-xs text-center">Signature</div>
            </div>
            <div>
              <div className="border-b border-dotted pb-1 mb-2 h-20 flex items-end">
                <div className="text-sm">
                  {formatDate(phfData?.signature?.signatureDate)} {phfData?.signature?.signaturePlace}
                </div>
              </div>
              <div className="text-xs text-center">Date and Place</div>
            </div>
          </div>
        </section>

        {/* Document Footer */}
        <div className="text-center mt-8 print:mt-4 text-xs text-muted-foreground border-t pt-4">
          <div>Unclassified – External</div>
          <div>Personal History Form (Sel‑A XV v1.5)</div>
        </div>
      </div>

      {/* Print Styles */}
      <style>
        {`
          @media print {
            @page {
              margin: 2cm;
              size: A4;
            }
            
            .print\\:hidden {
              display: none !important;
            }
            
            .print\\:mb-4 {
              margin-bottom: 1rem !important;
            }
            
            .print\\:p-0 {
              padding: 0 !important;
            }
            
            .print\\:max-w-none {
              max-width: none !important;
            }
            
            .print\\:mt-4 {
              margin-top: 1rem !important;
            }
            
            body {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
            
            section {
              break-inside: avoid;
              page-break-inside: avoid;
            }
            
            h2 {
              break-after: avoid;
              page-break-after: avoid;
            }
          }
        `}
      </style>
    </div>
  );
};