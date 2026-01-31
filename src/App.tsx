import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { usersService } from './services/users';
import { subscriptionsService } from './services/subscriptions';
import { setUser, updateUserSubscription } from './store/authSlice';
import LandingPage from './pages/common/LandingPage';
import RegisterPage from './pages/auth/RegisterPage';
import LoginPage from './pages/auth/LoginPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResendConfirmationPage from './pages/auth/ResendConfirmationPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import ChangePasswordPage from './pages/auth/ChangePasswordPage';
import VerifyEmailPage from './pages/auth/VerifyEmailPage';
import AdminDashboardPage from './pages/AdminDashboard/AdminDashboardPage';
import AdminUsersPage from './pages/AdminDashboard/AdminUsersPage';
import AdminInstructorsPage from './pages/AdminDashboard/AdminInstructorsPage';
import AdminPaymentsPage from './pages/AdminDashboard/AdminPaymentsPage';
import AdminAnalyticsPage from './pages/AdminDashboard/AdminAnalyticsPage';
import AdminProfilePage from './pages/AdminDashboard/AdminProfilePage';
import AdminReferralsPage from './pages/AdminDashboard/AdminReferralsPage';
import AdminSettingsPage from './pages/AdminDashboard/AdminSettingsPage';
import AdminCouponsPage from './pages/AdminDashboard/AdminCouponsPage';
import AdminSubscriptionsPage from './pages/AdminDashboard/AdminSubscriptionsPage';
import UnauthorizedPage from './pages/AdminDashboard/UnauthorizedPage';
import ProtectedAdminRoute from './components/ProtectedAdminRoute';

import SuperAdminDashboardPage from './pages/SuperAdminDashboard/SuperAdminDashboardPage';
import PermissionManagementPage from './pages/SuperAdminDashboard/PermissionManagementPage';
import RoleManagementPage from './pages/SuperAdminDashboard/RoleManagementPage';
import RoleDefinitionsPage from './pages/SuperAdminDashboard/RoleDefinitionsPage';
import AllUsersPage from './pages/SuperAdminDashboard/AllUsersPage';
import AdminManagementPage from './pages/SuperAdminDashboard/AdminManagementPage';
import DashboardPage from './pages/UserDashboard/DashboardPage';
import ProfilePage from './pages/UserDashboard/ProfilePage';
import InstructorProfilePage from './pages/InstructorDashboard/InstructorProfilePage';
// Learner pages - each with Layout wrapper
import VoiceCallsPage from './pages/UserDashboard/VoiceCallsPage';
import DailyTopicsPage from './pages/UserDashboard/DailyTopicsPage';
import QuizzesPage from './pages/UserDashboard/QuizzesPage';
import AIPronunciationPage from './pages/UserDashboard/AIPronunciationPage';
import UserTopicDetailsPage from './pages/UserDashboard/UserTopicDetailsPage';
import UserQuizTakingPage from './pages/UserDashboard/UserQuizTakingPage';

// ... (rest of imports)

// Inside Routes

import WalletPage from './pages/UserDashboard/WalletPage';
import SubscriptionsPage from './pages/UserDashboard/SubscriptionsPage';

import ReferralsPage from './pages/UserDashboard/ReferralsPage';
// Instructor pages
import InstructorDashboardPage from './pages/InstructorDashboard/InstructorDashboardPage';
import InstructorPendingPage from './pages/InstructorDashboard/InstructorPendingPage';
import InstructorQuizzesPage from './pages/InstructorDashboard/InstructorQuizzesPage';
import InstructorQuizEditorPage from './pages/InstructorDashboard/InstructorQuizEditorPage';
import InstructorTopicsPage from './pages/InstructorDashboard/InstructorTopicsPage';
import InstructorTopicEditorPage from './pages/InstructorDashboard/InstructorTopicEditorPage';
import InstructorPronunciationPage from './pages/InstructorDashboard/InstructorPronunciationPage';
import UserSettingsPage from './pages/UserDashboard/UserSettingsPage';
import InstructorEarningsPage from './pages/InstructorDashboard/InstructorEarningsPage';
import InstructorSettingsPage from './pages/InstructorDashboard/InstructorSettingsPage';

import StudentAnalyticsPage from './pages/InstructorDashboard/StudentAnalyticsPage';
import ProtectedRoute from './components/ProtectedRoute';
import Toast from './components/Toast';
import { RootState } from './store';
import { setTheme } from './store/uiSlice';
import CallManager from './components/voice-call/CallManager';
import { LanguagePopup } from './components/common/LanguagePopup';

import { useTokenRefresh } from './hooks/useTokenRefresh';

/**
 * Smart Dashboard Router - Routes based on user role
 * - Instructors → InstructorDashboardPage
 * - Users/Learners → DashboardPage
 * - Others → Redirect to home
 */
const DashboardRouter: React.FC = () => {
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);

  // Debug: Log user data
  console.log('[DashboardRouter] Current user:', {
    id: user?.id,
    name: user?.fullName,
    role: user?.role,
    isAuthenticated
  });

  // Check authentication
  if (!isAuthenticated || !user) {
    console.warn('[DashboardRouter] User not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // Route based on role
  const userRole = String(user.role || '').toLowerCase().trim();

  console.log(`[DashboardRouter] Routing user with role: "${userRole}"`);

  if (userRole === 'instructor') {
    console.log('[DashboardRouter] Redirecting to Instructor Dashboard');
    return <Navigate to="/instructor-dashboard" replace />;
  } else if (userRole === 'superadmin') {
    console.log('[DashboardRouter] Redirecting to Super Admin Dashboard');
    return <Navigate to="/super-admin" replace />;
  } else if (userRole === 'user' || userRole === 'learner') {
    console.log('[DashboardRouter] Displaying DashboardPage (Learner)');
    return <DashboardPage />;
  } else if (userRole === 'admin') {
    console.log('[DashboardRouter] Admin user redirecting to /admindashboard');
    return <Navigate to="/admindashboard" replace />;
  } else {
    console.warn(`[DashboardRouter] Unknown role: "${userRole}", showing learner dashboard`);
    return <DashboardPage />;
  }
};

/**
 * Role-Based Route Guard Component
 * Ensures only users with specific roles can access a page
 */
interface RoleBasedRouteProps {
  allowedRoles: ('user' | 'instructor' | 'admin' | 'learner' | 'image_user' | 'superadmin')[];
  children: React.ReactNode;
}

const RoleBasedRoute: React.FC<RoleBasedRouteProps> = ({ allowedRoles, children }) => {
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  const userRole = user.role?.toLowerCase().trim();
  const normalizedAllowedRoles = allowedRoles.map(r => r.toLowerCase());

  console.log('[RoleBasedRoute] Checking access:', {
    userRole,
    allowedRoles: normalizedAllowedRoles,
    allowed: normalizedAllowedRoles.includes(userRole as string)
  });

  if (!normalizedAllowedRoles.includes(userRole as string)) {
    console.warn(`[RoleBasedRoute] Access denied for role: ${userRole}`);
    // Redirect to appropriate dashboard
    if (userRole === 'instructor') {
      return <Navigate to="/instructor-dashboard" replace />;
    } else if (userRole === 'superadmin') {
      return <Navigate to="/super-admin" replace />;
    } else if (userRole === 'admin') {
      return <Navigate to="/admindashboard" replace />;
    } else {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
};

function App() {
  const dispatch = useDispatch();
  const { theme } = useSelector((state: RootState) => state.ui);
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);



  // Automatic token refresh - refreshes token before expiration
  useTokenRefresh();

  // Debug: Log app initialization
  console.log('[App] Initialized with user:', user?.role);

  // Initialize theme on mount - Force Dark
  useEffect(() => {
    dispatch(setTheme('dark'));
  }, [dispatch]);

  // Apply theme class to document (Always Dark)
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, [theme]);

  // Sync profile data on mount to ensure subscription status is fresh
  useEffect(() => {
    const syncProfile = async () => {
      // Only run if we have a user (logged in or hydrated from localStorage)
      if (user?.id) {
        try {
          // Fetch latest profile
          const res = await usersService.getProfile();
          const profileData = (res as any)?.data || res;

          // Fetch latest subscription (if any) to ensure we have the plan details
          let subData = null;
          try {
            const subRes = await subscriptionsService.current();
            subData = (subRes as any)?.data || subRes;
          } catch (e) {
            // It's inconsistent to have a paid plan but 404 on current subscription, 
            // but handle gracefully safely
            console.log('[App] No active subscription found during sync');
          }

          // Dispatch updates to Redux
          // IMPORTANT: Merge with existing user to preserve role and id (UserProfile lacks role)
          // Also map mismatching fields like avatarUrl -> avatar
          // Dispatch updates to Redux
          // IMPORTANT: Merge with existing user to preserve role and id (UserProfile lacks role)
          // Also map mismatching fields like avatarUrl -> avatar
          if (user) {
            console.log('[App] Syncing profile. Current User Role:', user.role);
            console.log('[App] Fetched Profile Role:', profileData.role);

            const mergedRole = user.role || profileData.role || 'user';
            console.log('[App] Merging Role as:', mergedRole);

            dispatch(setUser({
              ...user,
              ...profileData,
              id: user.id || profileData.userId, // Prefer existing ID but fallback
              role: mergedRole, // Use robust merge
              avatar: profileData.avatarUrl || user.avatar,
              // Ensure subscription fields are preserved/merged if they exist in profile
              subscriptionStatus: profileData.subscriptionStatus || profileData.subscription?.status || user.subscriptionStatus,
              subscriptionPlan: profileData.subscriptionPlan || profileData.subscription?.planName || profileData.subscription?.plan?.name || user.subscriptionPlan,
              trialEndDate: profileData.trialEndDate || profileData.subscription?.endDate || user.trialEndDate,
            }));
          }

          if (subData) {
            dispatch(updateUserSubscription({
              subscriptionStatus: subData.status,
              subscriptionPlan: subData.plan?.name || subData.planName,
              trialEndDate: subData.endDate || subData.renewalDate
            }));
          }
        } catch (error) {
          console.error("[App] Failed to sync profile on load", error);
        }
      }
    };

    syncProfile();
  }, [dispatch, user?.id]); // Run when user ID changes (login) or on mount if already logged in

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/resend-confirmation" element={<ResendConfirmationPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/register" element={<RegisterPage />} /><Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/verify/:token" element={<VerifyEmailPage />} />

        {/* Admin Routes - Restricted to admin role */}
        {/* Redirect /admin to /admindashboard for consistency */}
        <Route
          path="/admin"
          element={<Navigate to="/admindashboard" replace />}
        />
        <Route
          path="/admindashboard"
          element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={['admin']}>
                <AdminDashboardPage />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/unauthorized"
          element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={['admin']}>
                <UnauthorizedPage />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/profile"
          element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={['admin']}>
                <AdminProfilePage />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={['admin']}>
                <ProtectedAdminRoute requiredModule="users">
                  <AdminUsersPage />
                </ProtectedAdminRoute>
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/instructors"
          element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={['admin']}>
                <ProtectedAdminRoute requiredModule="users">
                  <AdminInstructorsPage />
                </ProtectedAdminRoute>
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/payments"
          element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={['admin']}>
                <ProtectedAdminRoute requiredModule="payments">
                  <AdminPaymentsPage />
                </ProtectedAdminRoute>
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/analytics"
          element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={['admin']}>
                <ProtectedAdminRoute requiredModule="analytics">
                  <AdminAnalyticsPage />
                </ProtectedAdminRoute>
              </RoleBasedRoute>
            </ProtectedRoute>
          }

        />
        <Route
          path="/admin/referrals"
          element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={['admin']}>
                <ProtectedAdminRoute requiredModule="referrals">
                  <AdminReferralsPage />
                </ProtectedAdminRoute>
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={['admin']}>
                <AdminSettingsPage />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/coupons"
          element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={['admin']}>
                <ProtectedAdminRoute requiredModule="coupons">
                  <AdminCouponsPage />
                </ProtectedAdminRoute>
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/subscriptions"
          element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={['admin']}>
                <ProtectedAdminRoute requiredModule="subscriptions">
                  <AdminSubscriptionsPage />
                </ProtectedAdminRoute>
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />
        {/* Super Admin Routes */}
        <Route
          path="/super-admin"
          element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={['superadmin']}>
                <SuperAdminDashboardPage />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/super-admin/permissions"
          element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={['superadmin']}>
                <PermissionManagementPage />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/super-admin/roles"
          element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={['superadmin']}>
                <RoleManagementPage />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/super-admin/role-definitions"
          element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={['superadmin']}>
                <RoleDefinitionsPage />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/super-admin/users"
          element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={['superadmin']}>
                <AllUsersPage />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/super-admin/admins"
          element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={['superadmin']}>
                <AdminManagementPage />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />

        {/* Protected Routes - Available to authenticated users */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardRouter />
            </ProtectedRoute>
          }
        />

        {/* Instructor Dashboard - Restricted to instructors */}
        <Route
          path="/instructor-dashboard"
          element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={['instructor']}>
                <InstructorDashboardPage />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/instructor/profile"
          element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={['instructor']}>
                <InstructorProfilePage />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />

        {/* Instructor Topics - Restricted to instructors */}
        {/* Instructor Content Management */}
        <Route
          path="/instructor/quizzes"
          element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={['instructor']}>
                <InstructorQuizzesPage />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/instructor/quizzes/new"
          element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={['instructor']}>
                <InstructorQuizEditorPage />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/instructor/quizzes/:id"
          element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={['instructor']}>
                <InstructorQuizEditorPage />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/instructor/topics"
          element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={['instructor']}>
                <InstructorTopicsPage />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/instructor/topics/new"
          element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={['instructor']}>
                <InstructorTopicEditorPage />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/instructor/topics/:id"
          element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={['instructor']}>
                <InstructorTopicEditorPage />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/instructor/pronunciation"
          element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={['instructor']}>
                <InstructorPronunciationPage />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/instructor/earnings"
          element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={['instructor']}>
                <InstructorEarningsPage />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/instructor/settings"
          element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={['instructor']}>
                <InstructorSettingsPage />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />

        {/* Learner Routes */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/voice-calls"
          element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={['user', 'learner']}>
                <VoiceCallsPage />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/daily-topics"
          element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={['user', 'learner']}>
                <DailyTopicsPage />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/quizzes"
          element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={['user', 'learner']}>
                <QuizzesPage />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/pronunciation"
          element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={['user', 'learner']}>
                <AIPronunciationPage />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/topics/:id"
          element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={['user', 'learner']}>
                <UserTopicDetailsPage />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/quizzes/:id"
          element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={['user', 'learner']}>
                <UserQuizTakingPage />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />

        {/* General Routes - Available to all authenticated users */}
        <Route
          path="/wallet"
          element={
            <ProtectedRoute>
              <WalletPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/subscriptions"
          element={
            <ProtectedRoute>
              <SubscriptionsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/referrals"
          element={
            <ProtectedRoute>
              <ReferralsPage />
            </ProtectedRoute>
          }
        />


        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={['user', 'image_user', 'instructor', 'admin']}>
                <UserSettingsPage />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/change-password"
          element={
            <ProtectedRoute>
              <ChangePasswordPage />
            </ProtectedRoute>
          }
        />


        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Voice Call Manager - Global */}
      {/* Only for authenticated users who are NOT superadmins */}
      {(() => {
        if (isAuthenticated && user) {
          console.log('✅ App.tsx - CallManager SHOULD render');
          return <CallManager />;
        } else {
          console.log('❌ App.tsx - CallManager WON\'T render:', { isAuthenticated, hasUser: !!user });
          return null;
        }
      })()}

      {/* Toast Notifications */}
      <LanguagePopup />
      <Toast />
    </Router >
  );
}

export default App;
