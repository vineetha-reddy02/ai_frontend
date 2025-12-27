import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Users, Key, AlertTriangle, ArrowRight } from 'lucide-react';
import SuperAdminLayout from '../../components/SuperAdminLayout';
import { adminService } from '../../services/admin';

const SuperAdminDashboardPage: React.FC = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        totalAdmins: 0,
        totalUsers: 0,
        pendingApprovals: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            setLoading(true);
            // Reusing admin service to get some base stats
            const admins = await adminService.getAdmins();

            // Fetch users to get total count
            // Fetching a larger page to ensure we get a count if totalCount metadata is missing
            const usersRes = await adminService.getAllUsers(1000, 1);
            const data = (usersRes as any)?.data || usersRes;
            const items = Array.isArray(data) ? data : (data?.items || []);
            // Use metadata totalCount if available, otherwise fallback to array length
            const totalUsers = data?.totalCount || items.length || 0;

            setStats({
                totalAdmins: admins.length,
                totalUsers: totalUsers,
                pendingApprovals: 0 // Placeholder
            });
        } catch (error) {
            console.error("Failed to load super admin stats", error);
        } finally {
            setLoading(false);
        }
    };

    const StatCard = ({ title, value, icon, color, onClick }: any) => (
        <div
            onClick={onClick}
            className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
        >
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${color} bg-opacity-10`}>
                    {icon}
                </div>
                {/* <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">+12%</span> */}
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">{value}</h3>
            <p className="text-sm text-slate-500">{title}</p>
        </div>
    );

    return (
        <SuperAdminLayout>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Super Admin Dashboard</h1>
                <p className="text-slate-600 dark:text-slate-400">System-wide overview and security controls</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard
                    title="Total Admins"
                    value={loading ? "..." : stats.totalAdmins}
                    icon={<Shield className="text-indigo-600" size={24} />}
                    color="bg-indigo-600"
                    onClick={() => navigate('/super-admin/roles')}
                />
                <StatCard
                    title="Total Users"
                    value={loading ? "..." : stats.totalUsers}
                    icon={<Users className="text-blue-600" size={24} />}
                    color="bg-blue-600"
                    onClick={() => navigate('/super-admin/users')}
                />
                <StatCard
                    title="Permission Nodes"
                    value="150+"
                    icon={<Key className="text-emerald-600" size={24} />}
                    color="bg-emerald-600"
                    onClick={() => navigate('/super-admin/permissions')}
                />
                <StatCard
                    title="System Alerts"
                    value="0"
                    icon={<AlertTriangle className="text-amber-600" size={24} />}
                    color="bg-amber-600"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Quick Actions */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Quick Actions</h2>
                    <div className="space-y-3">
                        <button
                            onClick={() => navigate('/super-admin/roles')}
                            className="w-full flex items-center justify-between p-4 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600 dark:text-indigo-400">
                                    <Shield size={20} />
                                </div>
                                <div className="text-left">
                                    <h3 className="font-semibold text-slate-900 dark:text-white">Manage Roles</h3>
                                    <p className="text-sm text-slate-500">Configure role-based access control</p>
                                </div>
                            </div>
                            <ArrowRight size={18} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
                        </button>

                        <button
                            onClick={() => navigate('/super-admin/permissions')}
                            className="w-full flex items-center justify-between p-4 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-emerald-600 dark:text-emerald-400">
                                    <Key size={20} />
                                </div>
                                <div className="text-left">
                                    <h3 className="font-semibold text-slate-900 dark:text-white">Permission Audit</h3>
                                    <p className="text-sm text-slate-500">Review system permission usage</p>
                                </div>
                            </div>
                            <ArrowRight size={18} className="text-slate-400 group-hover:text-emerald-600 transition-colors" />
                        </button>
                    </div>
                </div>

                {/* Recent Activity Placeholder */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">System Health</h2>
                    <div className="flex items-center justify-center h-48 text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
                        <p>System metrics visualization coming soon</p>
                    </div>
                </div>
            </div>
        </SuperAdminLayout>
    );
};

export default SuperAdminDashboardPage;
