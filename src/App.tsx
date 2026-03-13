import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Jobs from "./pages/Jobs";
import JobDetail from "./pages/JobDetail";
import JobApplication from "./pages/JobApplication";
import AdminJobs from "./pages/AdminJobs";
import AdminApplications from "./pages/AdminApplications";
import ApplicationDetail from "./pages/ApplicationDetail";
import VideoInterview from "./pages/VideoInterview";
import { PanelInterviewFeedback } from "./pages/PanelInterviewFeedback";
import { Analytics } from "./pages/Analytics";
import JobWizard from "./pages/JobWizard";
import ApplicationScoringTest from "./pages/ApplicationScoringTest";
import VideoTestInterface from "./pages/VideoTestInterface";
import JobRequisitions from "./pages/JobRequisitions";
import AdminRequisitions from "./pages/AdminRequisitions";
import JobRequisitionForm from "./pages/JobRequisitionForm";
import JobRequisitionDetail from "./pages/JobRequisitionDetail";
import JobRequisitionHREdit from "./pages/JobRequisitionHREdit";
import JobRequisitionChiefHREdit from "./pages/JobRequisitionChiefHREdit";
import JobRequisitionHiringManagerReview from "./pages/JobRequisitionHiringManagerReview";
import ChiefHRReview from "./pages/ChiefHRReview";
import ChiefOfDivisionView from "./pages/ChiefOfDivisionView";
import DirectorView from "./pages/DirectorView";
import MyApplications from "./pages/MyApplications";
import HiringProcessGuide from "./pages/HiringProcessGuide";
import LifeAtUNICC from "./pages/LifeAtUNICC";
import CandidateProfile from "./pages/CandidateProfile";
import MyProfile from "./pages/MyProfile";
import CandidateProfileEdit from "./pages/CandidateProfileEdit";
import CandidateApplicationView from "./pages/CandidateApplicationView";
import PHFImport from "./pages/PHFImport";
import ManualApplicationForm from "./components/ManualApplicationForm";
import EditManualApplicationForm from "./components/EditManualApplicationForm";
import AccountSecurity from "./pages/AccountSecurity";
import VideoEmailTemplateSettings from "./pages/VideoEmailTemplateSettings";
import TalentPool from "./pages/TalentPool";
import ApplicationJobSelection from "./pages/ApplicationJobSelection";
import ImportUsers from "./pages/ImportUsers";
import ImportSkills from "./pages/ImportSkills";
import ImportStaffData from "./pages/ImportStaffData";
import ImportStaffList from "./pages/ImportStaffList";
import NotFound from "./pages/NotFound";
import InitialRequestForm from "./pages/InitialRequestForm";
import InitialRequestReview from "./pages/InitialRequestReview";
import InitialRequestSelector from "./pages/InitialRequestSelector";
import ProcurementTORForm from "./pages/ProcurementTORForm";
import JobInterviewQuestions from "./pages/JobInterviewQuestions";
import ReviewCommittee from "./pages/ReviewCommittee";
import JobVideoAssignmentManager from "./pages/JobVideoAssignmentManager";
import JobManagement from "./pages/JobManagement";
import GenerateFakeVideoResponses from "./pages/GenerateFakeVideoResponses";
import BookInterviewSlot from "./pages/BookInterviewSlot";
import SkillsAnalysis from "./pages/SkillsAnalysis";
import ImportWHED from "./pages/ImportWHED";
import AdminSkillsReview from "./pages/AdminSkillsReview";
import AdminAssessments from "./pages/AdminAssessments";
import AssessmentBuilder from "./pages/AssessmentBuilder";
import AssessmentSlots from "./pages/AssessmentSlots";
import AssessmentReview from "./pages/AssessmentReview";
import CandidateAssessment from "./pages/CandidateAssessment";
import AssessmentComplete from "./pages/AssessmentComplete";
import Performance from "./pages/Performance";
import WorkplanDetail from "./pages/WorkplanDetail";
import AdminPerformanceCycles from "./pages/AdminPerformanceCycles";
import AffiliatePersonnel from "./pages/AffiliatePersonnel";
import ImportAffiliatePersonnel from "./pages/ImportAffiliatePersonnel";
import AffiliateDemographicsEdit from "./pages/AffiliateDemographicsEdit";
import AffiliateLifecycle from "./pages/AffiliateLifecycle";
import AffiliateOnboarding from "./pages/AffiliateOnboarding";
import AffiliateContractHistory from "./pages/AffiliateContractHistory";
import OrganizationChart from "./pages/OrganizationChart";
import AdminAssessmentSeries from "./pages/AdminAssessmentSeries";
import AssessmentSeriesBuilder from "./pages/AssessmentSeriesBuilder";
import SeriesCandidates from "./pages/SeriesCandidates";
import CandidateSeriesPortal from "./pages/CandidateSeriesPortal";
import ResearchAssessment from "./pages/ResearchAssessment";
import Separations from "./pages/operations/Separations";
import Appointments from "./pages/operations/Appointments";
import AppointmentLifecycle from "./pages/operations/AppointmentLifecycle";
import LoansSecondments from "./pages/operations/LoansSecondments";
import UNVOperations from "./pages/operations/UNVOperations";
import Interns from "./pages/operations/Interns";
import STDAs from "./pages/operations/STDAs";
import Transfers from "./pages/operations/Transfers";
import PDRevisions from "./pages/operations/PDRevisions";
import PartTime from "./pages/operations/PartTime";
import SLWOP from "./pages/operations/SLWOP";
import ProtocolServices from "./pages/operations/ProtocolServices";
import HomeLeave from "./pages/operations/HomeLeave";
import ContractExtensions from "./pages/operations/ContractExtensions";
import HROperationsDashboard from "./pages/operations/HROperationsDashboard";
import LocalAdminDashboard from "./pages/operations/LocalAdminDashboard";
import DocumentRepository from "./pages/operations/DocumentRepository";
import Settings from "./pages/Settings";
import EmailHub from "./pages/EmailHub";
import ProductSpec from "./pages/ProductSpec";
import StrategyTracker from "./pages/StrategyTracker";
import StrategyTrackerPublic from "./pages/StrategyTrackerPublic";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/dashboard" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/my-profile" element={<MyProfile />} />
            <Route path="/my-applications" element={<MyApplications />} />
            <Route path="/hiring-guide" element={<HiringProcessGuide />} />
            <Route path="/life-at-unicc" element={<LifeAtUNICC />} />
            <Route path="/my-applications/:id" element={<CandidateApplicationView />} />
            <Route path="/candidate-profile/:id" element={<CandidateProfile />} />
            <Route path="/candidate-profile/edit" element={<CandidateProfileEdit />} />
            <Route path="/candidate-profile/:id/edit" element={<CandidateProfileEdit />} />
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/jobs/:slug" element={<JobDetail />} />
            <Route path="/apply/:jobId" element={<JobApplication />} />
            <Route path="/video-interview/:token" element={<VideoInterview />} />
            <Route path="/panel-interview/:interviewId/feedback" element={<PanelInterviewFeedback />} />
            <Route path="/book-interview/:applicationId" element={<BookInterviewSlot />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/applications" element={<ApplicationJobSelection />} />
            <Route path="/applications/manage" element={<AdminApplications />} />
            <Route path="/admin/jobs" element={<AdminJobs />} />
            <Route path="/admin/jobs/new" element={<JobWizard />} />
            <Route path="/admin/jobs/:jobId" element={<JobManagement />} />
            <Route path="/admin/jobs/:jobId/edit" element={<JobWizard />} />
            <Route path="/admin/jobs/:jobId/questions" element={<JobInterviewQuestions />} />
            <Route path="/admin/jobs/:jobId/review-committee" element={<ReviewCommittee />} />
            <Route path="/admin/jobs/:jobId/video-assignment" element={<JobVideoAssignmentManager />} />
            <Route path="/admin/generate-fake-video-responses" element={<GenerateFakeVideoResponses />} />
            <Route path="/admin/applications/:id" element={<ApplicationDetail />} />
            <Route path="/admin/video-test" element={<VideoTestInterface />} />
            <Route path="/admin/scoring" element={<ApplicationScoringTest />} />
            <Route path="/requisitions" element={<JobRequisitions />} />
            <Route path="/admin/requisitions" element={<AdminRequisitions />} />
            <Route path="/admin/chief-hr-review" element={<ChiefHRReview />} />
            <Route path="/admin/initial-requests" element={<InitialRequestReview />} />
            <Route path="/requisitions/initial/new" element={<InitialRequestSelector />} />
            <Route path="/requisitions/initial/:id" element={<InitialRequestForm />} />
            <Route path="/requisitions/tor/new" element={<ProcurementTORForm />} />
            <Route path="/requisitions/tor/:id" element={<ProcurementTORForm />} />
            <Route path="/requisitions/new" element={<JobRequisitionForm />} />
            <Route path="/requisitions/:id" element={<JobRequisitionDetail />} />
            <Route path="/requisitions/:id/edit" element={<JobRequisitionForm />} />
            <Route path="/requisitions/:id/hr-edit" element={<JobRequisitionHREdit />} />
            <Route path="/requisitions/:id/hr-final-edit" element={<JobRequisitionHREdit />} />
            <Route path="/requisitions/:id/chief-hr-edit" element={<JobRequisitionChiefHREdit />} />
            <Route path="/requisitions/:id/hm-review" element={<JobRequisitionHiringManagerReview />} />
            <Route path="/admin/phf-import" element={<PHFImport />} />
            <Route path="/admin/applications/manual/:jobId" element={<ManualApplicationForm />} />
            <Route path="/admin/applications/edit-manual/:applicationId" element={<EditManualApplicationForm />} />
            <Route path="/account/security" element={<AccountSecurity />} />
            <Route path="/admin/video-email-template" element={<VideoEmailTemplateSettings />} />
            <Route path="/admin/talent-pool" element={<TalentPool />} />
            <Route path="/skills-analysis" element={<SkillsAnalysis />} />
            <Route path="/admin/import-users" element={<ImportUsers />} />
            <Route path="/admin/import-skills" element={<ImportSkills />} />
            <Route path="/admin/import-staff-data" element={<ImportStaffData />} />
            <Route path="/admin/import-staff-list" element={<ImportStaffList />} />
            <Route path="/admin/import-whed" element={<ImportWHED />} />
            <Route path="/admin/skills-review" element={<AdminSkillsReview />} />
            <Route path="/admin/assessments" element={<AdminAssessments />} />
            <Route path="/admin/assessments/new" element={<AssessmentBuilder />} />
            <Route path="/admin/assessments/:id/edit" element={<AssessmentBuilder />} />
            <Route path="/admin/assessments/:id/slots" element={<AssessmentSlots />} />
            <Route path="/admin/assessments/:id/review" element={<AssessmentReview />} />
            <Route path="/admin/assessment-series" element={<AdminAssessmentSeries />} />
            <Route path="/admin/assessment-series/new" element={<AssessmentSeriesBuilder />} />
            <Route path="/admin/assessment-series/:id/edit" element={<AssessmentSeriesBuilder />} />
            <Route path="/admin/assessment-series/:id/candidates" element={<SeriesCandidates />} />
            <Route path="/assessment/:token" element={<CandidateAssessment />} />
            <Route path="/assessment/complete" element={<AssessmentComplete />} />
            <Route path="/series/:token" element={<CandidateSeriesPortal />} />
            <Route path="/research/:token/:assessmentId" element={<ResearchAssessment />} />
            <Route path="/import-users" element={<ImportUsers />} />
            <Route path="/chief-of-division" element={<ChiefOfDivisionView />} />
            <Route path="/director-view" element={<DirectorView />} />
            <Route path="/performance" element={<Performance />} />
            <Route path="/performance/workplan/:id" element={<WorkplanDetail />} />
            <Route path="/performance/team" element={<Performance />} />
            <Route path="/admin/performance-cycles" element={<AdminPerformanceCycles />} />
            <Route path="/admin/affiliate-personnel" element={<AffiliatePersonnel />} />
            <Route path="/admin/affiliate-personnel/edit" element={<AffiliateDemographicsEdit />} />
            <Route path="/admin/affiliate-personnel/:id/lifecycle/:recordNumber" element={<AffiliateLifecycle />} />
            <Route path="/admin/affiliate-personnel/:id/onboarding/:recordNumber" element={<AffiliateOnboarding />} />
            <Route path="/admin/affiliate-history/:id" element={<AffiliateContractHistory />} />
            <Route path="/admin/import-affiliates" element={<ImportAffiliatePersonnel />} />
            <Route path="/admin/org-chart" element={<OrganizationChart />} />
            {/* HR Operations Routes */}
            <Route path="/operations" element={<HROperationsDashboard />} />
            <Route path="/operations/admin" element={<LocalAdminDashboard />} />
            <Route path="/operations/separations" element={<Separations />} />
            <Route path="/operations/appointments" element={<Appointments />} />
            <Route path="/operations/appointments/:id/lifecycle" element={<AppointmentLifecycle />} />
            <Route path="/operations/loans-secondments" element={<LoansSecondments />} />
            <Route path="/operations/unv" element={<UNVOperations />} />
            <Route path="/operations/interns" element={<Interns />} />
            <Route path="/operations/stdas" element={<STDAs />} />
            <Route path="/operations/transfers" element={<Transfers />} />
            <Route path="/operations/pd-revisions" element={<PDRevisions />} />
            <Route path="/operations/part-time" element={<PartTime />} />
            <Route path="/operations/slwop" element={<SLWOP />} />
            <Route path="/operations/protocol-services" element={<ProtocolServices />} />
            <Route path="/operations/home-leave" element={<HomeLeave />} />
            <Route path="/operations/contract-extensions" element={<ContractExtensions />} />
            <Route path="/operations/documents" element={<DocumentRepository />} />
            <Route path="/admin/email-hub" element={<EmailHub />} />
            <Route path="/product-spec" element={<ProductSpec />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/strategy-tracker" element={<StrategyTracker />} />
            <Route path="/strategy/view/:token" element={<StrategyTrackerPublic />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
