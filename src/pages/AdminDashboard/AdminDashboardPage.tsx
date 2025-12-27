import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Users,
  DollarSign,
  CreditCard,
  Tag,
  Shield,
  TrendingUp,
  Loader,
  ArrowRight
} from 'lucide-react';
import { RootState } from '../../store';
import AdminLayout from '../../components/AdminLayout';
import { useAdminModules, MODULE_DEFINITIONS } from '../../hooks/useAdminModules';

const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);

  // Check module access
  const { modules, loading: modulesLoading } = useAdminModules();

  // Only allow admin role
  if (!user || String(user.role).toLowerCase() !== 'admin') {
    return <Navigate to="/" replace />;
  }

  // Module icons mapping
  const moduleIcons: Record<string, React.ReactNode> = {
    users: <Shield className="w-8 h-8" />,
    payments: <DollarSign className="w-8 h-8" />,
    subscriptions: <CreditCard className="w-8 h-8" />,
    coupons: <Tag className="w-8 h-8" />,
    referrals: <Users className="w-8 h-8" />,
    analytics: <TrendingUp className="w-8 h-8" />,
  };

  // Module colors
  const moduleColors: Record<string, { from: string; to: string; text: string }> = {
    users: { from: 'from-blue-500', to: 'to-indigo-600', text: 'text-blue-600' },
    payments: { from: 'from-green-500', to: 'to-emerald-600', text: 'text-green-600' },
    subscriptions: { from: 'from-purple-500', to: 'to-violet-600', text: 'text-purple-600' },
    coupons: { from: 'from-orange-500', to: 'to-amber-600', text: 'text-orange-600' },
    referrals: { from: 'from-pink-500', to: 'to-rose-600', text: 'text-pink-600' },
    analytics: { from: 'from-cyan-500', to: 'to-sky-600', text: 'text-cyan-600' },
  };

  // Module routes
  const moduleRoutes: Record<string, string> = {
    users: '/admin/users', // User management page
    payments: '/admin/payments',
    subscriptions: '/admin/subscriptions',
    coupons: '/admin/coupons',
    referrals: '/admin/referrals',
    analytics: '/admin/analytics',
  };

  // Module descriptions
  const moduleDescriptions: Record<string, string> = {
    users: 'Manage users, instructors, and approvals',
    payments: 'View transactions, refunds, and withdrawals',
    subscriptions: 'Manage subscription plans and users',
    coupons: 'Create and manage discount coupons',
    referrals: 'Configure referral settings and rewards',
    analytics: 'View platform analytics and insights',
  };

  return (
    <AdminLayout>
      <div className="min-h-dvh bg-white dark:bg-slate-950 p-3 sm:p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mb-2">
              Admin Dashboard
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Welcome back, {user?.fullName}! Manage your assigned modules below.
            </p>
          </div>

          {/* Loading State */}
          {modulesLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-8 h-8 animate-spin text-blue-500" />
              <span className="ml-3 text-slate-600 dark:text-slate-400">Loading modules...</span>
            </div>
          )}

          {/* No Modules Assigned */}
          {!modulesLoading && modules.length === 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-8 text-center">
              <Shield className="w-16 h-16 text-yellow-600 dark:text-yellow-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-yellow-900 dark:text-yellow-100 mb-2">
                No Modules Assigned
              </h2>
              <p className="text-yellow-700 dark:text-yellow-300">
                You don't have any modules assigned yet. Please contact your Superadmin to get access to modules.
              </p>
            </div>
          )}

          {/* Module Cards */}
          {!modulesLoading && modules.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {modules.map((moduleId) => {
                const moduleDef = MODULE_DEFINITIONS[moduleId];
                if (!moduleDef) return null;

                const colors = moduleColors[moduleId] || { from: 'from-gray-500', to: 'to-gray-600', text: 'text-gray-600' };
                const icon = moduleIcons[moduleId] || <Shield className="w-8 h-8" />;
                const route = moduleRoutes[moduleId] || '/admin';
                const description = moduleDescriptions[moduleId] || 'Manage this module';

                return (
                  <div
                    key={moduleId}
                    onClick={() => navigate(route)}
                    className="group relative bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden"
                  >
                    {/* Gradient Background */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${colors.from} ${colors.to} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>

                    {/* Content */}
                    <div className="relative">
                      {/* Icon */}
                      <div className={`w-16 h-16 rounded-lg bg-gradient-to-br ${colors.from} ${colors.to} flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform duration-300`}>
                        {icon}
                      </div>

                      {/* Title */}
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {moduleDef.name}
                      </h3>

                      {/* Description */}
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                        {description}
                      </p>

                      {/* Arrow Icon */}
                      <div className="flex items-center text-blue-600 dark:text-blue-400 font-medium text-sm group-hover:translate-x-2 transition-transform duration-300">
                        <span>Open Module</span>
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </div>
                    </div>

                    {/* Hover Border Effect */}
                    <div className={`absolute inset-0 border-2 border-transparent group-hover:border-blue-500 dark:group-hover:border-blue-400 rounded-xl transition-colors duration-300`}></div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Module Count */}
          {!modulesLoading && modules.length > 0 && (
            <div className="mt-8 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                You have access to <span className="font-semibold text-blue-600 dark:text-blue-400">{modules.length}</span> module{modules.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboardPage;
