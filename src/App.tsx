import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
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
import ChiefHRReview from "./pages/ChiefHRReview";
import ChiefOfDivisionView from "./pages/ChiefOfDivisionView";
import DirectorView from "./pages/DirectorView";
import MyApplications from "./pages/MyApplications";
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
import NotFound from "./pages/NotFound";

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
            <Route path="/auth" element={<Auth />} />
            <Route path="/my-profile" element={<MyProfile />} />
            <Route path="/my-applications" element={<MyApplications />} />
            <Route path="/my-applications/:id" element={<CandidateApplicationView />} />
            <Route path="/candidate-profile/:id" element={<CandidateProfile />} />
            <Route path="/candidate-profile/edit" element={<CandidateProfileEdit />} />
            <Route path="/candidate-profile/:id/edit" element={<CandidateProfileEdit />} />
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/jobs/:slug" element={<JobDetail />} />
            <Route path="/apply/:jobId" element={<JobApplication />} />
            <Route path="/video-interview/:token" element={<VideoInterview />} />
            <Route path="/panel-interview/:interviewId/feedback" element={<PanelInterviewFeedback />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/applications" element={<AdminApplications />} />
            <Route path="/admin/jobs" element={<AdminJobs />} />
            <Route path="/admin/jobs/new" element={<JobWizard />} />
            <Route path="/admin/jobs/:jobId/edit" element={<JobWizard />} />
            <Route path="/admin/applications" element={<AdminApplications />} />
            <Route path="/admin/applications/:id" element={<ApplicationDetail />} />
            <Route path="/admin/video-test" element={<VideoTestInterface />} />
            <Route path="/admin/scoring" element={<ApplicationScoringTest />} />
            <Route path="/requisitions" element={<JobRequisitions />} />
            <Route path="/admin/requisitions" element={<AdminRequisitions />} />
            <Route path="/admin/chief-hr-review" element={<ChiefHRReview />} />
            <Route path="/requisitions/new" element={<JobRequisitionForm />} />
            <Route path="/requisitions/:id" element={<JobRequisitionDetail />} />
            <Route path="/requisitions/:id/edit" element={<JobRequisitionForm />} />
            <Route path="/requisitions/:id/hr-edit" element={<JobRequisitionHREdit />} />
            <Route path="/admin/phf-import" element={<PHFImport />} />
            <Route path="/admin/applications/manual/:jobId" element={<ManualApplicationForm />} />
            <Route path="/admin/applications/edit-manual/:applicationId" element={<EditManualApplicationForm />} />
            <Route path="/account/security" element={<AccountSecurity />} />
            <Route path="/admin/video-email-template" element={<VideoEmailTemplateSettings />} />
            <Route path="/admin/talent-pool" element={<TalentPool />} />
            <Route path="/test/chief-view" element={<ChiefOfDivisionView />} />
            <Route path="/test/director-view" element={<DirectorView />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
