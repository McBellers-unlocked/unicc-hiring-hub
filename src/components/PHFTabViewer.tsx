import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { X, ChevronLeft, ChevronRight, User, MapPin, Calendar, GraduationCap, Briefcase, Languages, FileText, Shield, Heart, Users, Globe } from 'lucide-react';

interface PHFTabViewerProps {
  phfData: any;
  photoUrl?: string;
  onClose: () => void;
}

const SECTIONS = [
  { id: 'personal', title: 'Personal Details', icon: User },
  { id: 'education', title: 'Education', icon: GraduationCap },
  { id: 'employment', title: 'Employment', icon: Briefcase },
  { id: 'motivation', title: 'Motivation', icon: FileText },
  { id: 'summary', title: 'Summary', icon: Shield },
];

export const PHFTabViewer: React.FC<PHFTabViewerProps> = ({ phfData, photoUrl, onClose }) => {
  const [currentSection, setCurrentSection] = useState(0);

  const formatDate = (date: any) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString();
  };

  const formatDateTime = (date: any) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleString();
  };

  const nextSection = () => {
    if (currentSection < SECTIONS.length - 1) {
      setCurrentSection(currentSection + 1);
    }
  };

  const prevSection = () => {
    if (currentSection > 0) {
      setCurrentSection(currentSection - 1);
    }
  };

  const getFieldValue = (obj: any, path: string, defaultValue = '') => {
    return path.split('.').reduce((current, key) => current?.[key], obj) || defaultValue;
  };

  return (
    <div className="fixed inset-0 bg-background z-50 overflow-auto">
      {/* Header */}
      <div className="sticky top-0 bg-background border-b p-4 z-10">
        <div className="flex justify-between items-center max-w-6xl mx-auto">
          <div>
            <h1 className="text-2xl font-bold">Personal History Form</h1>
            <p className="text-muted-foreground">Submitted Application - Read Only</p>
          </div>
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        <Tabs value={currentSection.toString()} onValueChange={(value) => setCurrentSection(parseInt(value))} className="w-full">
          <TabsList className="grid w-full grid-cols-5 gap-1 h-auto p-1 mb-6">
            {SECTIONS.map((section, index) => {
              const Icon = section.icon;
              return (
                <TabsTrigger
                  key={section.id}
                  value={index.toString()}
                  className="flex flex-col items-center p-3 h-auto data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <Icon className="h-5 w-5 mb-1" />
                  <span className="text-xs text-center">{section.title}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* Personal Details Tab */}
          <TabsContent value="0">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Personal Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Title</label>
                          <div className="mt-1 p-2 bg-muted rounded">{getFieldValue(phfData, 'personalDetails.title')}</div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Family Name</label>
                          <div className="mt-1 p-2 bg-muted rounded">{getFieldValue(phfData, 'personalDetails.familyName')}</div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">First Names</label>
                          <div className="mt-1 p-2 bg-muted rounded">{getFieldValue(phfData, 'personalDetails.firstNames')}</div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Maiden Name</label>
                          <div className="mt-1 p-2 bg-muted rounded">{getFieldValue(phfData, 'personalDetails.maidenName') || 'N/A'}</div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Sex</label>
                          <div className="mt-1 p-2 bg-muted rounded">{getFieldValue(phfData, 'personalDetails.sex')}</div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Date of Birth</label>
                          <div className="mt-1 p-2 bg-muted rounded">{formatDate(getFieldValue(phfData, 'personalDetails.dateOfBirth'))}</div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Place of Birth</label>
                          <div className="mt-1 p-2 bg-muted rounded">{getFieldValue(phfData, 'personalDetails.placeOfBirth')}</div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Country of Birth</label>
                          <div className="mt-1 p-2 bg-muted rounded">{getFieldValue(phfData, 'personalDetails.countryOfBirth')}</div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Present Nationality</label>
                          <div className="mt-1 p-2 bg-muted rounded">{getFieldValue(phfData, 'personalDetails.presentNationality')}</div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Marital Status</label>
                          <div className="mt-1 p-2 bg-muted rounded">{getFieldValue(phfData, 'personalDetails.maritalStatus')}</div>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Permanent Address</label>
                        <div className="mt-1 p-3 bg-muted rounded">{getFieldValue(phfData, 'personalDetails.permanentAddress')}</div>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Present Address</label>
                        <div className="mt-1 p-3 bg-muted rounded">{getFieldValue(phfData, 'personalDetails.presentAddress')}</div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Telephone</label>
                          <div className="mt-1 p-2 bg-muted rounded">{getFieldValue(phfData, 'personalDetails.telephone')}</div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Email</label>
                          <div className="mt-1 p-2 bg-muted rounded">{getFieldValue(phfData, 'personalDetails.email')}</div>
                        </div>
                      </div>
                    </div>
                    
                    {(photoUrl || getFieldValue(phfData, 'personalDetails.photoUrl')) && (
                      <div className="flex justify-center">
                        <div className="border-2 border-dashed border-muted-foreground p-2 rounded">
                          <img 
                            src={photoUrl || getFieldValue(phfData, 'personalDetails.photoUrl')} 
                            alt="Candidate Photo" 
                            className="w-32 h-40 object-cover rounded"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Languages */}
              {phfData?.languages && Object.keys(phfData.languages).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Languages className="h-5 w-5" />
                      Language Skills
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.entries(phfData.languages).map(([language, skills]: [string, any]) => (
                        <div key={language} className="border rounded p-4">
                          <h4 className="font-semibold mb-2">{language}</h4>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="font-medium">Reading:</span> {skills.reading || 'Not specified'}
                            </div>
                            <div>
                              <span className="font-medium">Writing:</span> {skills.writing || 'Not specified'}
                            </div>
                            <div>
                              <span className="font-medium">Speaking:</span> {skills.speaking || 'Not specified'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Education Tab */}
          <TabsContent value="1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  Education History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {phfData?.education && phfData.education.length > 0 ? (
                  <div className="space-y-4">
                    {phfData.education.map((edu: any, index: number) => (
                      <div key={index} className="border rounded p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Institution</label>
                            <div className="mt-1 font-medium">{edu.institution_name || edu.institution || 'Not specified'}</div>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Degree/Certificate</label>
                            <div className="mt-1 font-medium">{edu.degree_or_certificate_title || edu.degree_type || edu.degree || 'Not specified'}</div>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Field of Study</label>
                            <div className="mt-1">{edu.main_course_of_study || edu.field_of_study || 'Not specified'}</div>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Location</label>
                            <div className="mt-1">{edu.institution_place || edu.location || 'Not specified'}{edu.institution_country ? `, ${edu.institution_country}` : ''}</div>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Period</label>
                            <div className="mt-1">
                              {edu.from_month && edu.from_year ? `${edu.from_month}/${edu.from_year}` : edu.start_date || 'Not specified'} - 
                              {edu.is_present ? ' Present' : 
                                (edu.to_month && edu.to_year ? ` ${edu.to_month}/${edu.to_year}` : 
                                 (edu.end_date ? ` ${edu.end_date}` : ' Not specified'))}
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Status</label>
                            <div className="mt-1">
                              {edu.is_completed ? (
                                <Badge variant="secondary">Completed</Badge>
                              ) : (
                                <Badge variant="outline">In Progress</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No education history provided
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Employment Tab */}
          <TabsContent value="2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Employment History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {phfData?.employment && phfData.employment.length > 0 ? (
                  <div className="space-y-4">
                    {phfData.employment.map((emp: any, index: number) => (
                      <div key={index} className="border rounded p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Organization</label>
                            <div className="mt-1 font-medium">{emp.employer_name || emp.organization || emp.company || 'Not specified'}</div>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Position</label>
                            <div className="mt-1 font-medium">{emp.position_title || emp.position || emp.title || 'Not specified'}</div>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Location</label>
                            <div className="mt-1">{emp.place_of_work || emp.location || 'Not specified'}</div>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Period</label>
                            <div className="mt-1">
                              {emp.from_month && emp.from_year ? `${emp.from_month}/${emp.from_year}` : emp.start_date || 'Not specified'} - 
                              {emp.is_present ? ' Present' : 
                                (emp.to_month && emp.to_year ? ` ${emp.to_month}/${emp.to_year}` : 
                                 (emp.end_date ? ` ${emp.end_date}` : ' Not specified'))}
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Supervisor</label>
                            <div className="mt-1">{emp.name_of_supervisor || emp.supervisor || 'Not specified'}</div>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Salary</label>
                            <div className="mt-1">{emp.salary || 'Not specified'}</div>
                          </div>
                          {emp.main_duties_responsibilities && (
                            <div className="md:col-span-2">
                              <label className="text-sm font-medium text-muted-foreground">Main Duties & Responsibilities</label>
                              <div className="mt-1 p-3 bg-muted rounded whitespace-pre-wrap">{emp.main_duties_responsibilities}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No employment history provided
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Motivation Tab */}
          <TabsContent value="3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Motivation Letter
                </CardTitle>
              </CardHeader>
              <CardContent>
                {getFieldValue(phfData, 'motivationLetter.motivation_letter_content') ? (
                  <div className="prose max-w-none">
                    <div className="whitespace-pre-wrap bg-muted p-4 rounded-lg">
                      {getFieldValue(phfData, 'motivationLetter.motivation_letter_content')}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No motivation letter provided
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Summary Tab */}
          <TabsContent value="4">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Application Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Certification Status</h4>
                      {getFieldValue(phfData, 'certification.certify_true_complete_correct') ? (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          Certified as True and Complete
                        </Badge>
                      ) : (
                        <Badge variant="destructive">Not Certified</Badge>
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Signature Date</h4>
                      <p className="text-gray-600">{formatDateTime(getFieldValue(phfData, 'certification.signature_date'))}</p>
                    </div>
                  </div>

                  {getFieldValue(phfData, 'certification.typed_full_name') && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Signed By</h4>
                      <p className="text-gray-600">{getFieldValue(phfData, 'certification.typed_full_name')}</p>
                    </div>
                  )}

                  {getFieldValue(phfData, 'certification.signature_place') && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Signature Location</h4>
                      <p className="text-gray-600">{getFieldValue(phfData, 'certification.signature_place')}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Additional Information */}
              {(phfData?.dependants?.length > 0 || phfData?.relatives?.length > 0) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Family Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {phfData?.dependants?.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Dependants ({phfData.dependants.length})</h4>
                        <div className="space-y-2">
                          {phfData.dependants.map((dep: any, index: number) => (
                            <div key={index} className="text-sm bg-muted p-2 rounded">
                              <strong>{dep.full_name || dep.name}</strong> - {dep.relationship_to_applicant || dep.relationship} 
                              {dep.date_of_birth && ` (Born: ${formatDate(dep.date_of_birth)})`}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {phfData?.relatives?.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Relatives in UN System ({phfData.relatives.length})</h4>
                        <div className="space-y-2">
                          {phfData.relatives.map((rel: any, index: number) => (
                            <div key={index} className="text-sm bg-muted p-2 rounded">
                              <strong>{rel.full_name || rel.name}</strong> - {rel.relationship_to_applicant || rel.relationship}
                              {rel.organization && ` at ${rel.organization}`}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Navigation */}
        <div className="flex justify-between items-center mt-8 pt-6 border-t">
          <Button
            variant="outline"
            onClick={prevSection}
            disabled={currentSection === 0}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          
          <div className="text-sm text-muted-foreground">
            Section {currentSection + 1} of {SECTIONS.length}
          </div>
          
          <Button
            variant="outline"
            onClick={nextSection}
            disabled={currentSection === SECTIONS.length - 1}
            className="flex items-center gap-2"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};