import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Users, Loader, AlertCircle, CheckCircle, X, Eye, ArrowLeft, Calendar, Clock, Plus, EyeOff, Trash2 } from 'lucide-react';
import { RootState } from '../../store';
import { adminService } from '../../services/admin';
import { subscriptionsService } from '../../services/subscriptions';
import { authService } from '../../services/auth';
import { showToast } from '../../store/uiSlice';
import AdminLayout from '../../components/AdminLayout';
import Button from '../../components/Button';

interface UserData {
    id: string;
    fullName: string;
    email: string;
    phoneNumber?: string;
    role: string;
    subscriptionStatus?: string;
    isApproved?: boolean;
    createdAt?: string;
    avatar?: string;
}

const AdminUsersPage: React.FC = () => {
    const { user } = useSelector((state: RootState) => state.auth);
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState<UserData[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
    const [stats, setStats] = useState({ total: 0, instructors: 0, learners: 0 });
    const [filterRole, setFilterRole] = useState<'all' | 'instructor' | 'user'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
    const [showDetails, setShowDetails] = useState(false);
    const [userSubscription, setUserSubscription] = useState<any>(null);
    const [loadingSubscription, setLoadingSubscription] = useState(false);

    // Create Instructor State
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createLoading, setCreateLoading] = useState(false);
    const [createFormData, setCreateFormData] = useState({
        fullName: '',
        email: '',
        phoneNumber: '',
        password: '',
    });
    const [showPassword, setShowPassword] = useState(false);

    // Only allow admin role
    if (!user || String(user.role).toLowerCase() !== 'admin') {
        return <Navigate to="/" replace />;
    }

    const loadUsers = async () => {
        try {
            setLoading(true);
            const res = await adminService.getAllUsers(1000, 1);
            const responseData = (res as any)?.data || res;
            const allUsers = Array.isArray(responseData) ? responseData : responseData?.items || [];

            setUsers(allUsers);
            setFilteredUsers(allUsers);

            // Calculate stats
            const instructorCount = allUsers.filter((u: UserData) =>
                String(u.role).toLowerCase() === 'instructor'
            ).length;
            const learnerCount = allUsers.filter((u: UserData) =>
                String(u.role).toLowerCase() === 'user'
            ).length;

            setStats({
                total: allUsers.length,
                instructors: instructorCount,
                learners: learnerCount,
            });
        } catch (error) {
            console.error('Failed to load users:', error);
            dispatch(showToast({ type: 'error', message: 'Failed to load users' }));
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
            return;
        }

        try {
            await adminService.deleteUser(userId);
            dispatch(showToast({ type: 'success', message: 'User deleted successfully' }));
            loadUsers(); // Refresh list
        } catch (err: any) {
            console.error('Error deleting user:', err);
            const msg = err.response?.data?.message || err.message || 'Failed to delete user';
            dispatch(showToast({ type: 'error', message: msg }));
        }
    };

    useEffect(() => {
        loadUsers();
    }, []);

    useEffect(() => {
        let filtered = users;

        // Filter by role
        if (filterRole !== 'all') {
            filtered = filtered.filter(u => String(u.role).toLowerCase() === filterRole);
        }

        // Filter by search term
        if (searchTerm) {
            filtered = filtered.filter(u =>
                u.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                u.phoneNumber?.includes(searchTerm)
            );
        }

        setFilteredUsers(filtered);
    }, [filterRole, searchTerm, users]);

    const handleStatusChange = async (userId: string, newStatus: 'active' | 'inactive' | 'banned') => {
        try {
            await adminService.changeUserStatus(userId, newStatus);
            dispatch(showToast({ type: 'success', message: 'User status updated successfully' }));
            loadUsers();
        } catch (error) {
            console.error('Failed to update user status:', error);
            dispatch(showToast({ type: 'error', message: 'Failed to update user status' }));
        }
    };

    // Handle Create Instructor
    const handleCreateInstructor = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreateLoading(true);

        try {
            // Validation
            if (!createFormData.fullName || !createFormData.email || !createFormData.password) {
                dispatch(showToast({ type: 'error', message: 'Please fill in all required fields' }));
                setCreateLoading(false);
                return;
            }

            // Call Admin API to create user with role='Instructor'
            await adminService.createUser({
                fullName: createFormData.fullName,
                email: createFormData.email,
                password: createFormData.password,
                phoneNumber: createFormData.phoneNumber,
                role: 'Instructor'
            });

            dispatch(showToast({ type: 'success', message: 'Instructor created successfully' }));
            setShowCreateModal(false);
            setCreateFormData({
                fullName: '',
                email: '',
                phoneNumber: '',
                password: '',
            });

            // Refresh list and show instructors
            setFilterRole('instructor');
            loadUsers();

        } catch (error: any) {
            console.error('Failed to create instructor:', error);

            const serverData = error?.response?.data || error || {};
            const errorsArr: any[] = serverData.errors || serverData.validationErrors || [];

            // Check for duplicate email
            const emailExists = Array.isArray(errorsArr)
                ? errorsArr.includes('EMAIL_EXISTS') || errorsArr.some((e: string) => typeof e === 'string' && e.toLowerCase().includes('email exists'))
                : (serverData.messages && serverData.messages.includes('User with this email already exists'));

            if (emailExists) {
                dispatch(showToast({ type: 'error', message: 'Instructor with this email already exists' }));
            } else {
                const msg = serverData.message || error.message || 'Failed to create instructor';
                dispatch(showToast({ type: 'error', message: msg }));
            }
        } finally {
            setCreateLoading(false);
        }
    };

    // Fetch subscription when modal opens
    useEffect(() => {
        const fetchSubscription = async () => {
            if (showDetails && selectedUser) {
                setLoadingSubscription(true);
                setUserSubscription(null);
                try {
                    const subRes = await subscriptionsService.adminGetUserSubscription(selectedUser.id);
                    const subData = (subRes as any)?.data || subRes;
                    console.log('📦 User Subscription Data:', subData);
                    setUserSubscription(subData);
                } catch (error) {
                    console.log('No subscription found for user:', error);
                    setUserSubscription(null);
                } finally {
                    setLoadingSubscription(false);
                }
            }
        };
        fetchSubscription();
    }, [showDetails, selectedUser]);

    if (loading) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center min-h-screen">
                    <Loader className="w-8 h-8 animate-spin text-blue-500" />
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="p-6">
                {/* Header */}
                <div className="mb-6 flex justify-between items-start">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/admindashboard')}
                            className="p-2 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 rounded-full transition-colors text-blue-600 dark:text-blue-400"
                        >
                            <ArrowLeft size={24} />
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">User Management</h1>
                            <p className="text-slate-600 dark:text-slate-400 mt-1">
                                Manage all users, instructors, and learners
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <Button
                            variant="primary"
                            onClick={() => setShowCreateModal(true)}
                            className="flex items-center gap-2"
                        >
                            <Plus size={20} />
                            Create Instructor
                        </Button>
                        <Button
                            variant="primary"
                            onClick={() => navigate('/admin/instructors')}
                        >
                            Manage Instructors
                        </Button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Users</p>
                                <p className="text-3xl font-bold text-blue-900 dark:text-blue-100 mt-2">{stats.total}</p>
                            </div>
                            <Users className="w-12 h-12 text-blue-500" />
                        </div>
                    </div>

                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-green-600 dark:text-green-400">Instructors</p>
                                <p className="text-3xl font-bold text-green-900 dark:text-green-100 mt-2">{stats.instructors}</p>
                            </div>
                            <CheckCircle className="w-12 h-12 text-green-500" />
                        </div>
                    </div>

                    <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Learners</p>
                                <p className="text-3xl font-bold text-purple-900 dark:text-blue-100 mt-2">{stats.learners}</p>
                            </div>
                            <AlertCircle className="w-12 h-12 text-purple-500" />
                        </div>
                    </div>
                </div>

                {/* Search and Filters */}
                <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 mb-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <input
                            type="text"
                            placeholder="Search by name, email, or phone..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                        />
                        <div className="flex gap-2">
                            <Button
                                variant={filterRole === 'all' ? 'primary' : 'secondary'}
                                onClick={() => setFilterRole('all')}
                            >
                                All Users ({users.length})
                            </Button>
                            <Button
                                variant={filterRole === 'instructor' ? 'primary' : 'secondary'}
                                onClick={() => setFilterRole('instructor')}
                            >
                                Instructors ({stats.instructors})
                            </Button>
                            <Button
                                variant={filterRole === 'user' ? 'primary' : 'secondary'}
                                onClick={() => setFilterRole('user')}
                            >
                                Learners ({stats.learners})
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Users Table */}
                <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 dark:bg-slate-700">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        User
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        Role
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                {filteredUsers.map((userData) => (
                                    <tr key={userData.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 h-10 w-10">
                                                    <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                                                        {userData.fullName?.charAt(0).toUpperCase()}
                                                    </div>
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-slate-900 dark:text-white">
                                                        {userData.fullName}
                                                    </div>
                                                    <div className="text-sm text-slate-500 dark:text-slate-400">
                                                        {userData.email}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${userData.role === 'Instructor'
                                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                                : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                                                }`}>
                                                {userData.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${userData.isApproved
                                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                                }`}>
                                                {userData.isApproved ? 'Approved' : 'Pending'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <div className="flex gap-3">
                                                <button
                                                    onClick={() => {
                                                        setSelectedUser(userData);
                                                        setShowDetails(true);
                                                    }}
                                                    className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                                                    title="View Details"
                                                >
                                                    <Eye className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {filteredUsers.length === 0 && (
                        <div className="text-center py-12">
                            <p className="text-slate-500 dark:text-slate-400">No users found</p>
                        </div>
                    )}
                </div>
            </div>

            {/* User Details Modal */}
            {showDetails && selectedUser && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">User Details</h2>
                                <button
                                    onClick={() => setShowDetails(false)}
                                    className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-slate-500 dark:text-slate-400">Name</label>
                                    <p className="text-lg text-slate-900 dark:text-white">{selectedUser.fullName}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-slate-500 dark:text-slate-400">Email</label>
                                    <p className="text-lg text-slate-900 dark:text-white">{selectedUser.email}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-slate-500 dark:text-slate-400">Phone</label>
                                    <p className="text-lg text-slate-900 dark:text-white">{selectedUser.phoneNumber || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-slate-500 dark:text-slate-400">Role</label>
                                    <p className="text-lg text-slate-900 dark:text-white">{selectedUser.role}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-slate-500 dark:text-slate-400">Status</label>
                                    <p className="text-lg text-slate-900 dark:text-white">
                                        {selectedUser.isApproved ? 'Approved' : 'Pending'}
                                    </p>
                                </div>

                                {/* Subscription Information */}
                                <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-4">
                                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                                        <Calendar className="w-5 h-5" />
                                        Subscription Details
                                    </h3>
                                    {loadingSubscription ? (
                                        <div className="flex items-center justify-center py-4">
                                            <Loader className="w-5 h-5 animate-spin text-blue-500" />
                                        </div>
                                    ) : userSubscription ? (
                                        <div className="space-y-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Plan</label>
                                                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                                        {userSubscription.plan?.name || userSubscription.planName || 'N/A'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Status</label>
                                                    <p className="text-sm">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${['active', 'trialing', 'succeeded'].includes(userSubscription.status?.toLowerCase())
                                                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                                            }`}>
                                                            {userSubscription.status || 'N/A'}
                                                        </span>
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Created Date */}
                                            {userSubscription.createdAt && (
                                                <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
                                                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        Created At
                                                    </label>
                                                    <p className="text-sm text-slate-900 dark:text-white">
                                                        {new Date(userSubscription.createdAt).toLocaleString('en-IN', {
                                                            dateStyle: 'full',
                                                            timeStyle: 'medium'
                                                        })}
                                                    </p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                                        Raw: {userSubscription.createdAt}
                                                    </p>
                                                </div>
                                            )}

                                            <div className="grid grid-cols-2 gap-4 border-t border-slate-200 dark:border-slate-700 pt-3">
                                                <div>
                                                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        Start Date
                                                    </label>
                                                    <p className="text-sm text-slate-900 dark:text-white">
                                                        {userSubscription.startDate
                                                            ? new Date(userSubscription.startDate).toLocaleString('en-IN', {
                                                                dateStyle: 'medium',
                                                                timeStyle: 'short'
                                                            })
                                                            : 'N/A'
                                                        }
                                                    </p>
                                                    {userSubscription.startDate && (
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                                            Raw: {userSubscription.startDate}
                                                        </p>
                                                    )}
                                                </div>
                                                <div>
                                                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        End Date
                                                    </label>
                                                    <p className="text-sm text-slate-900 dark:text-white">
                                                        {userSubscription.endDate || userSubscription.renewalDate
                                                            ? new Date(userSubscription.endDate || userSubscription.renewalDate).toLocaleString('en-IN', {
                                                                dateStyle: 'medium',
                                                                timeStyle: 'short'
                                                            })
                                                            : '❌ NOT SET'
                                                        }
                                                    </p>
                                                    {(userSubscription.endDate || userSubscription.renewalDate) && (
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                                            Raw: {userSubscription.endDate || userSubscription.renewalDate}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            {(() => {
                                                const endDate = userSubscription.endDate || userSubscription.renewalDate;
                                                if (!endDate) {
                                                    return (
                                                        <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
                                                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                                                                <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                                                                    ⚠️ No End Date Set - This is the problem!
                                                                </p>
                                                                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                                                                    The subscription was created without an end date. This needs to be fixed in the backend.
                                                                </p>
                                                            </div>
                                                        </div>
                                                    );
                                                }

                                                const now = new Date();
                                                const end = new Date(endDate);
                                                const diffMs = end.getTime() - now.getTime();
                                                const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                                                const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

                                                return (
                                                    <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
                                                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Time Remaining</label>
                                                        <p className={`text-sm font-semibold ${diffMs > 0
                                                            ? 'text-green-600 dark:text-green-400'
                                                            : 'text-red-600 dark:text-red-400'
                                                            }`}>
                                                            {diffMs > 0
                                                                ? `${diffDays} days, ${diffHours} hours remaining`
                                                                : `Expired ${Math.abs(diffDays)} days ago`
                                                            }
                                                        </p>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-slate-500 dark:text-slate-400 italic">No active subscription</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Create Instructor Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-lg max-w-md w-full p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Create Instructor</h2>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateInstructor} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Full Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={createFormData.fullName}
                                    onChange={(e) => setCreateFormData({ ...createFormData, fullName: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                    placeholder="Enter full name"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Email Address <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={createFormData.email}
                                    onChange={(e) => setCreateFormData({ ...createFormData, email: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                    placeholder="Enter email"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Phone Number
                                </label>
                                <input
                                    type="tel"
                                    value={createFormData.phoneNumber}
                                    onChange={(e) => setCreateFormData({ ...createFormData, phoneNumber: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                    placeholder="Enter phone number (optional)"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Password <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        required
                                        value={createFormData.password}
                                        onChange={(e) => setCreateFormData({ ...createFormData, password: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all pr-10"
                                        placeholder="Enter password"
                                        minLength={6}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <Button
                                    variant="secondary"
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="primary"
                                    type="submit"
                                    disabled={createLoading}
                                    className="flex-1"
                                >
                                    {createLoading ? (
                                        <Loader className="w-5 h-5 animate-spin mx-auto" />
                                    ) : (
                                        'Create Instructor'
                                    )}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
};

export default AdminUsersPage;
