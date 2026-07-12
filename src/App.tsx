import { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import { ProjectProvider } from './contexts/ProjectContext';
import { EvaluationProvider } from './contexts/EvaluationContext';
import { ToastProvider } from './contexts/ToastContext';
import { CartProvider } from './contexts/CartContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import ErrorBoundary from './components/common/ErrorBoundary';
import AdminGuard from './components/common/AdminGuard';
import SuperAdminGuard from './components/common/SuperAdminGuard';
import EvaluatorGuard from './components/common/EvaluatorGuard';
import ToastContainer from './components/common/Toast';
import LoadingSpinner from './components/common/LoadingSpinner';
import { usePageView } from './hooks/usePageView';

function PageViewTracker() {
  usePageView();
  return null;
}

// Eager-loaded pages (initial landing)
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';

// Lazy-loaded pages
const SignupPage = lazy(() => import('./pages/SignupPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const InviteLandingPage = lazy(() => import('./pages/InviteLandingPage'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const ModelBuilderPage = lazy(() => import('./pages/ModelBuilderPage'));
const BrainstormingPage = lazy(() => import('./pages/BrainstormingPage'));
const ModelConfirmPage = lazy(() => import('./pages/ModelConfirmPage'));
const EvaluatorManagementPage = lazy(() => import('./pages/EvaluatorManagementPage'));
const AdminResultPage = lazy(() => import('./pages/AdminResultPage'));
const SensitivityPage = lazy(() => import('./pages/SensitivityPage'));
const ResourceAllocationPage = lazy(() => import('./pages/ResourceAllocationPage'));
const WorkshopPage = lazy(() => import('./pages/WorkshopPage'));
const SurveyBuilderPage = lazy(() => import('./pages/SurveyBuilderPage'));
const SurveyResultPage = lazy(() => import('./pages/SurveyResultPage'));
const EvaluatorMainPage = lazy(() => import('./pages/EvaluatorMainPage'));
const EvaluatorDashboardPage = lazy(() => import('./pages/EvaluatorDashboardPage'));
const PointHistoryPage = lazy(() => import('./pages/PointHistoryPage'));
const WithdrawalRequestPage = lazy(() => import('./pages/WithdrawalRequestPage'));
const RoleConversionPage = lazy(() => import('./pages/RoleConversionPage'));
const PairwiseRatingPage = lazy(() => import('./pages/PairwiseRatingPage'));
const DirectInputPage = lazy(() => import('./pages/DirectInputPage'));
const EvalResultPage = lazy(() => import('./pages/EvalResultPage'));
const EvalPreSurveyPage = lazy(() => import('./pages/EvalPreSurveyPage'));
const SuperAdminPage = lazy(() => import('./pages/SuperAdminPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const FeaturesPage = lazy(() => import('./pages/FeaturesPage'));
const GuidePage = lazy(() => import('./pages/GuidePage'));
const ManualPage = lazy(() => import('./pages/ManualPage'));
const LearnPage = lazy(() => import('./pages/LearnPage'));
const PricingPage = lazy(() => import('./pages/PricingPage'));
const StatsGuidePage = lazy(() => import('./pages/StatsGuidePage'));
const StatisticalAnalysisPage = lazy(() => import('./pages/StatisticalAnalysisPage'));
const AiAnalysisPage = lazy(() => import('./pages/AiAnalysisPage'));
const SmsHistoryPage = lazy(() => import('./pages/SmsHistoryPage'));
const SurveyStatsPage = lazy(() => import('./pages/SurveyStatsPage'));
const ManagementPage = lazy(() => import('./pages/ManagementPage'));
const CartPage = lazy(() => import('./pages/CartPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const OrderConfirmationPage = lazy(() => import('./pages/OrderConfirmationPage'));
const OrderHistoryPage = lazy(() => import('./pages/OrderHistoryPage'));
const SharedResultPage = lazy(() => import('./pages/SharedResultPage'));
const EvaluatorInfoPage = lazy(() => import('./pages/EvaluatorInfoPage'));
const CommunityPage = lazy(() => import('./pages/CommunityPage'));
const LectureApplyPage = lazy(() => import('./pages/LectureApplyPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

export default function App() {
  return (
    <HashRouter>
      <ErrorBoundary>
      <AuthProvider>
        <SubscriptionProvider>
        <ProjectProvider>
          <EvaluationProvider>
            <ToastProvider>
            <CartProvider>
            <ToastContainer />
            <PageViewTracker />
            <Suspense fallback={<LoadingSpinner message="페이지 로딩 중..." />}>
            <Routes>
              {/* Public */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<ErrorBoundary><SignupPage /></ErrorBoundary>} />
              <Route path="/register" element={<ErrorBoundary><SignupPage /></ErrorBoundary>} />
              <Route path="/forgot-password" element={<ErrorBoundary><ForgotPasswordPage /></ErrorBoundary>} />
              <Route path="/eval/invite/:token" element={<ErrorBoundary><InviteLandingPage /></ErrorBoundary>} />
              <Route path="/about" element={<ErrorBoundary><AboutPage /></ErrorBoundary>} />
              <Route path="/features" element={<ErrorBoundary><FeaturesPage /></ErrorBoundary>} />
              <Route path="/guide" element={<ErrorBoundary><GuidePage /></ErrorBoundary>} />
              <Route path="/manual" element={<ErrorBoundary><ManualPage /></ErrorBoundary>} />
              <Route path="/learn" element={<ErrorBoundary><LearnPage /></ErrorBoundary>} />
              <Route path="/shared/result/:token" element={<ErrorBoundary><SharedResultPage /></ErrorBoundary>} />
              <Route path="/survey-stats" element={<ErrorBoundary><SurveyStatsPage /></ErrorBoundary>} />
              <Route path="/management" element={<ErrorBoundary><ManagementPage /></ErrorBoundary>} />
              <Route path="/stats-guide" element={<ErrorBoundary><StatsGuidePage /></ErrorBoundary>} />
              <Route path="/pricing" element={<ErrorBoundary><PricingPage /></ErrorBoundary>} />
              <Route path="/evaluator-info" element={<ErrorBoundary><EvaluatorInfoPage /></ErrorBoundary>} />
              <Route path="/community" element={<ErrorBoundary><CommunityPage /></ErrorBoundary>} />
              <Route path="/lecture-apply" element={<ErrorBoundary><LectureApplyPage /></ErrorBoundary>} />
              <Route path="/cart" element={<ErrorBoundary><CartPage /></ErrorBoundary>} />
              <Route path="/checkout" element={<ErrorBoundary><CheckoutPage /></ErrorBoundary>} />
              <Route path="/order-confirmation" element={<ErrorBoundary><OrderConfirmationPage /></ErrorBoundary>} />
              <Route path="/order-history" element={<ProtectedRoute><ErrorBoundary><OrderHistoryPage /></ErrorBoundary></ProtectedRoute>} />

              {/* Super Admin */}
              <Route path="/superadmin" element={<SuperAdminGuard><ErrorBoundary><SuperAdminPage /></ErrorBoundary></SuperAdminGuard>} />

              {/* Researcher workspace (인증 필수 — Supabase RLS로 본인 프로젝트만 접근) */}
              <Route path="/admin" element={<ProtectedRoute><ErrorBoundary><AdminDashboard /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/admin/project/:id" element={<ProtectedRoute><ErrorBoundary><ModelBuilderPage /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/admin/project/:id/brain" element={<ProtectedRoute><ErrorBoundary><BrainstormingPage /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/admin/project/:id/confirm" element={<ProtectedRoute><ErrorBoundary><ModelConfirmPage /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/admin/project/:id/survey" element={<ProtectedRoute><ErrorBoundary><SurveyBuilderPage /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/admin/project/:id/eval" element={<ProtectedRoute><ErrorBoundary><EvaluatorManagementPage /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/admin/project/:id/result" element={<ProtectedRoute><ErrorBoundary><AdminResultPage /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/admin/project/:id/survey-result" element={<ProtectedRoute><ErrorBoundary><SurveyResultPage /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/admin/project/:id/sensitivity" element={<ProtectedRoute><ErrorBoundary><SensitivityPage /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/admin/project/:id/resource" element={<ProtectedRoute><ErrorBoundary><ResourceAllocationPage /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/admin/project/:id/workshop" element={<ProtectedRoute><ErrorBoundary><WorkshopPage /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/admin/project/:id/statistics" element={<ProtectedRoute><ErrorBoundary><StatisticalAnalysisPage /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/admin/project/:id/ai-analysis" element={<ProtectedRoute><ErrorBoundary><AiAnalysisPage /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/admin/project/:id/sms-history" element={<ProtectedRoute><ErrorBoundary><SmsHistoryPage /></ErrorBoundary></ProtectedRoute>} />

              {/* Evaluator */}
              <Route path="/eval" element={<ProtectedRoute><ErrorBoundary><EvaluatorMainPage /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/eval/dashboard" element={<ProtectedRoute><ErrorBoundary><EvaluatorDashboardPage /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/eval/points" element={<ProtectedRoute><ErrorBoundary><PointHistoryPage /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/eval/withdraw" element={<ProtectedRoute><ErrorBoundary><WithdrawalRequestPage /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/eval/upgrade" element={<ProtectedRoute><ErrorBoundary><RoleConversionPage /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/eval/project/:id" element={<EvaluatorGuard><ErrorBoundary><PairwiseRatingPage /></ErrorBoundary></EvaluatorGuard>} />
              <Route path="/eval/project/:id/direct" element={<EvaluatorGuard><ErrorBoundary><DirectInputPage /></ErrorBoundary></EvaluatorGuard>} />
              <Route path="/eval/project/:id/pre-survey" element={<EvaluatorGuard><ErrorBoundary><EvalPreSurveyPage /></ErrorBoundary></EvaluatorGuard>} />
              <Route path="/eval/project/:id/result" element={<EvaluatorGuard><ErrorBoundary><EvalResultPage /></ErrorBoundary></EvaluatorGuard>} />

              {/* Default */}
              <Route path="/" element={<HomePage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
            </Suspense>
            </CartProvider>
            </ToastProvider>
          </EvaluationProvider>
        </ProjectProvider>
        </SubscriptionProvider>
      </AuthProvider>
      </ErrorBoundary>
    </HashRouter>
  );
}
