import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, FileText } from "lucide-react";

interface JobRequisition {
  position_title?: string;
  grade?: string;
  unit_section_division?: string;
  duty_station?: string;
  nature_of_position?: string;
  positions_available?: number;
  purpose_of_position?: string;
  objectives_of_programme?: string;
  main_duties_responsibilities?: string;
  essential_experience?: string;
  desirable_experience?: string;
  essential_education?: string;
  desirable_education?: string;
  language_requirements?: any;
  global_competencies?: any;
  core_competencies?: any;
  management_competencies?: any;
  leadership_competencies?: any;
}

interface FinalDocumentReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: Partial<JobRequisition>;
  onProceed: () => void;
  requisitionId?: string;
}

export function FinalDocumentReviewDialog({
  open,
  onOpenChange,
  formData,
  onProceed,
  requisitionId,
}: FinalDocumentReviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Final Position Description Review
          </DialogTitle>
          <DialogDescription>
            Review the complete position description before proceeding
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4 py-4">
          {/* Position Information Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Position Information</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Position Title</dt>
                  <dd className="mt-1 text-sm">{formData.position_title || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Grade</dt>
                  <dd className="mt-1 text-sm">{formData.grade || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Unit/Section/Division</dt>
                  <dd className="mt-1 text-sm">{formData.unit_section_division || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Duty Station</dt>
                  <dd className="mt-1 text-sm">{formData.duty_station || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Nature of Position</dt>
                  <dd className="mt-1 text-sm">{formData.nature_of_position || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Number of Positions</dt>
                  <dd className="mt-1 text-sm">{formData.positions_available || 1}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Position Description Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Position Description</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Purpose of the Position</h4>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {formData.purpose_of_position || 'N/A'}
                </p>
              </div>
              
              <div>
                <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Objectives of the Programme</h4>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {formData.objectives_of_programme || 'N/A'}
                </p>
              </div>
              
              <div>
                <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Main Duties and Responsibilities</h4>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {formData.main_duties_responsibilities || 'N/A'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Requirements Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Requirements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Essential Experience</h4>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {formData.essential_experience || 'N/A'}
                </p>
              </div>
              
              <div>
                <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Desirable Experience</h4>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {formData.desirable_experience || 'N/A'}
                </p>
              </div>
              
              <div>
                <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Essential Education</h4>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {formData.essential_education || 'N/A'}
                </p>
              </div>
              
              <div>
                <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Desirable Education</h4>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {formData.desirable_education || 'N/A'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Competencies Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Competencies</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Consultant Standard Competencies */}
              {formData.nature_of_position === 'Individual Consultant' && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Standard Competencies for Consultants</h4>
                  <ul className="space-y-1 text-sm">
                    <li>• <strong>Teamwork:</strong> Develops and promotes effective relationships with colleagues and team members. Deals constructively with conflicts.</li>
                    <li>• <strong>Communicating:</strong> Expresses oneself clearly in conversations and interactions with others; listens actively. Produces effective written communications. Ensures that information is shared.</li>
                    <li>• <strong>Respecting and promoting individual and cultural differences:</strong> Demonstrates the ability to work constructively with people of all backgrounds and orientations. Respects differences and ensures that all can contribute.</li>
                    <li>• <strong>Knowing and managing yourself:</strong> Manages ambiguity and pressure in a self-reflective way. Uses criticism as a development opportunity. Seeks opportunities for continuous learning and professional growth.</li>
                    <li>• <strong>Producing results:</strong> Produces and delivers quality results. Is action oriented and committed to achieving outcomes.</li>
                  </ul>
                </div>
              )}
              
              {/* Mandatory Competencies - For non-consultant positions */}
              {formData.nature_of_position !== 'Individual Consultant' && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Mandatory Competencies</h4>
                  <ul className="space-y-1 text-sm">
                    <li>• <strong>Teamwork:</strong> Develops and promotes effective relationships with colleagues and team members. Deals constructively with conflicts.</li>
                    <li>• <strong>Communicating:</strong> Expresses oneself clearly in conversations and interactions with others; listens actively. Produces effective written communications. Ensures that information is shared.</li>
                    <li>• <strong>Respecting and promoting individual and cultural differences:</strong> Demonstrates the ability to work constructively with people of all backgrounds and orientations. Respects differences and ensures that all can contribute.</li>
                    <li>• <strong>Creating an empowering and motivating environment</strong> (for Supervisory positions only): Guides and motivates staff towards meeting challenges and achieving objectives. Promotes ownership and responsibility for desired outcomes at all levels.</li>
                  </ul>
                </div>
              )}

              {/* Global Competencies */}
              {Array.isArray(formData.global_competencies) && formData.global_competencies.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Global Competencies</h4>
                  <ul className="space-y-1 text-sm">
                    {formData.global_competencies.map((comp: any, index: number) => {
                      const getCompetencyDefinition = (compName: string) => {
                        const globalCompetencies = [
                          'Integrity: Acts in accordance with organizational values. Takes responsibility for actions and decisions',
                          'Customer orientation: Provides excellent service in a professional and caring manner'
                        ];
                        return globalCompetencies.find(def => def.startsWith(compName)) || compName;
                      };

                      const competencyName = typeof comp === 'string' ? comp : comp.name || comp;
                      const definition = getCompetencyDefinition(competencyName);
                      const [name, ...description] = definition.split(':');

                      return (
                        <li key={index} className="text-sm">
                          • <strong>{name}:</strong> {description.join(':').trim()}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              
              {/* Core Competencies */}
              {Array.isArray(formData.core_competencies) && formData.core_competencies.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Core Competencies</h4>
                  <ul className="space-y-1 text-sm">
                    {formData.core_competencies.map((comp: any, index: number) => {
                      const getCoreCompetencyDefinition = (compName: string) => {
                        const coreCompetencies = [
                          'Knowing and managing yourself: Manages ambiguity and pressure in a self-reflective way. Uses criticism as a development opportunity. Seeks opportunities for continuous learning and professional growth.',
                          'Producing results: Produces and delivers quality results. Is action oriented and committed to achieving outcomes.',
                          'Moving forward in a changing environment: Is open to and proposes new approaches and ideas. Adapts and responds positively to change.',
                          "Setting an example: Acts within UNICC's / WHO's professional, ethical and legal boundaries and encourages others to adhere to these. Behaves consistently in accordance with clear personal ethics and values."
                        ];
                        return coreCompetencies.find(def => def.startsWith(compName)) || compName;
                      };

                      const competencyName = typeof comp === 'string' ? comp : comp.name || comp;
                      const definition = getCoreCompetencyDefinition(competencyName);
                      const [name, ...description] = definition.split(':');

                      return (
                        <li key={index} className="text-sm">
                          • <strong>{name}:</strong> {description.join(':').trim()}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              
              {/* Leadership Competencies */}
              {Array.isArray(formData.leadership_competencies) && formData.leadership_competencies.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Leadership Competencies</h4>
                  <ul className="space-y-1 text-sm">
                    {formData.leadership_competencies.map((comp: any, index: number) => {
                      const getLeadershipCompetencyDefinition = (compName: string) => {
                        const leadershipCompetencies = [
                          'Driving UNICC to a successful future: Demonstrates a broad-based understanding of the growing complexities of ICT issues and activities. Creates a compelling vision of shared goals, and develops a roadmap for successfully achieving real progress in improving ICT services.',
                          "Promoting innovation and Organizational learning: Invigorates the Organization by building a culture which encourages learning and development. Sponsors innovative approaches and solutions.",
                          "Promoting UNICC's position: Positions UNICC as a leader in ICT services. Gains support for UNICC's mission. Coordinates plans and communicates in a way that attracts support from intended audiences."
                        ];
                        return leadershipCompetencies.find(def => def.startsWith(compName)) || compName;
                      };

                      const competencyName = typeof comp === 'string' ? comp : comp.name || comp;
                      const definition = getLeadershipCompetencyDefinition(competencyName);
                      const [name, ...description] = definition.split(':');

                      return (
                        <li key={index} className="text-sm">
                          • <strong>{name}:</strong> {description.join(':').trim()}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              
              {/* Management Competencies */}
              {Array.isArray(formData.management_competencies) && formData.management_competencies.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Management Competencies</h4>
                  <ul className="space-y-1 text-sm">
                    {formData.management_competencies.map((comp: any, index: number) => {
                      const getManagementCompetencyDefinition = (compName: string) => {
                        const managementCompetencies = [
                          "Ensuring effective use of resources: Identifies priorities in accordance with UNICC's strategic directions. Develops and implements action plans, organizes the necessary resources and monitors outcomes.",
                          "Building and promoting partnerships across the Organization and beyond: Develops and strengthens internal and external partnerships that can provide information, assistance and support to UNICC. Identifies and uses synergies across the Organization and with external partners."
                        ];
                        return managementCompetencies.find(def => def.startsWith(compName)) || compName;
                      };

                      const competencyName = typeof comp === 'string' ? comp : comp.name || comp;
                      const definition = getManagementCompetencyDefinition(competencyName);
                      const [name, ...description] = definition.split(':');

                      return (
                        <li key={index} className="text-sm">
                          • <strong>{name}:</strong> {description.join(':').trim()}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Languages Section */}
          {formData.language_requirements && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Languages</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* English Language Requirement */}
                {formData.language_requirements.english && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2 text-muted-foreground">English</h4>
                    <p className="text-sm">{formData.language_requirements.english}</p>
                  </div>
                )}

                {/* Additional Languages */}
                {Array.isArray(formData.language_requirements.additional_languages) && 
                 formData.language_requirements.additional_languages.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Additional Languages</h4>
                    <ul className="space-y-1 text-sm">
                      {formData.language_requirements.additional_languages.map((lang: any, index: number) => {
                        if (typeof lang === 'string') {
                          return <li key={index}>• {lang}</li>;
                        } else if ((lang.name || lang.language) && lang.level) {
                          const languageName = lang.name || lang.language;
                          return (
                            <li key={index}>
                              • <strong>{languageName}:</strong> {lang.level}
                            </li>
                          );
                        }
                        return null;
                      })}
                    </ul>
                  </div>
                )}

                {/* Local Language Advantage */}
                {formData.language_requirements.local_language_advantage && (
                  <div>
                    <p className="text-sm text-muted-foreground">
                      • Knowledge of the local language of the duty station is an advantage
                    </p>
                  </div>
                )}

                {/* UN Language Advantage */}
                {formData.language_requirements.un_language_advantage && (
                  <div>
                    <p className="text-sm text-muted-foreground">
                      • Knowledge of another UN official language is an advantage
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close Review
          </Button>
          <Button onClick={onProceed}>
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Send to Chief of Division
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
