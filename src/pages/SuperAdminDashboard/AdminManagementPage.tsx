import React, { useState, useEffect } from 'react';
import {
    Plus,
    X,
    Users,
    Shield,
    Check,
    Edit2,
    Loader2
} from 'lucide-react';
import SuperAdminLayout from '../../components/SuperAdminLayout';
import Button from '../../components/Button';
import { adminService } from '../../services/admin';
import { authService } from '../../services/auth';
import { permissionService, Permission } from '../../services/permissionService';

interface GroupedPermissions {
    [module: string]: Permission[];
}

const AdminManagementPage: React.FC = () => {
    const [admins, setAdmins] = useState<any[]>([]);
    const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
    const [groupedPermissions, setGroupedPermissions] = useState<GroupedPermissions>({});

    // UI State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [mode, setMode] = useState<'create' | 'edit'>('create');
    const [selectedAdminId, setSelectedAdminId] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'admin',
        phoneNumber: '',
    });

    // Permission Selection State: Set of Permission Names
    const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
    // For Edit Mode: Keep track of original permissions to calculate diff
    const [originalPermissions, setOriginalPermissions] = useState<Set<string>>(new Set());



    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);

            // Fetch ALL users to debug and filter client-side
            // We use the same method AdminDashboard uses to ensure consistency
            const [usersRes, permsData] = await Promise.all([
                adminService.getAllUsers(1000, 1),
                permissionService.getAllPermissions()
            ]);

            const responseData = (usersRes as any)?.data || usersRes;
            const allUsers = Array.isArray(responseData) ? responseData : responseData?.items || [];



            // Filter Admins
            const filteredAdmins = allUsers.filter((u: any) => {
                const r = String(u.role || '').toLowerCase().trim();
                return r.includes('admin') && !r.includes('super');
            });

            setAdmins(filteredAdmins);

            const perms = (permsData as any)?.data || permsData || [];
            if (Array.isArray(perms)) {
                setAllPermissions(perms);
                // Group permissions by module
                const groups: GroupedPermissions = {};
                perms.forEach((p: Permission) => {
                    if (!groups[p.module]) groups[p.module] = [];
                    groups[p.module].push(p);
                });
                setGroupedPermissions(groups);
            }
        } catch (err) {
            console.error('Failed to load data', err);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenCreate = () => {
        setMode('create');
        setSelectedAdminId(null);
        setFormData({ fullName: '', email: '', password: '', confirmPassword: '', role: 'admin', phoneNumber: '' });
        setSelectedPermissions(new Set());
        setOriginalPermissions(new Set());
        setIsModalOpen(true);
    };

    const handleOpenEdit = async (admin: any) => {
        setMode('edit');
        setSelectedAdminId(admin.id);
        // Fill basic info (password left empty)
        setFormData({
            fullName: admin.fullName,
            email: admin.email,
            password: '',
            confirmPassword: '',
            role: 'admin',
            phoneNumber: admin.phoneNumber || ''
        });

        // Fetch current user permissions
        try {
            const res = await permissionService.getUserPermissions(admin.id);
            const data = (res as any)?.data || res;

            // Robustly extract all permissions the user currently holds
            // "effectivePermissions" should be the ground truth, but we fallback/merge just in case
            const effective = data.effectivePermissions || [];
            const granted = data.grantedPermissions || [];
            const rolePerms = data.rolePermissions || [];
            const direct = data.permissions || []; // legacy or other endpoint

            // Combine all to be safe, though effectivePermissions *should* cover it.
            // Using a Set to dedup.
            const allActiveFn = new Set([...effective, ...granted, ...rolePerms, ...direct]);

            // We also need to respect revocations if the API returns them, but typically effectivePermissions excludes them.
            // The UI state `selectedPermissions` represents what is CHECKED.

            setSelectedPermissions(allActiveFn);
            setOriginalPermissions(new Set(allActiveFn)); // Clone for diffing later

            setIsModalOpen(true);
        } catch (err) {
            console.error("Failed to load user permissions", err);
            alert("Failed to load user permissions. Please try again.");
        }
    };

    const togglePermission = (permName: string) => {
        const newSet = new Set(selectedPermissions);
        if (newSet.has(permName)) {
            newSet.delete(permName);
        } else {
            newSet.add(permName);
        }
        setSelectedPermissions(newSet);
    };

    const toggleModule = (module: string) => {
        const modulePerms = groupedPermissions[module] || [];
        const allSelected = modulePerms.every(p => selectedPermissions.has(p.name));

        const newSet = new Set(selectedPermissions);
        if (allSelected) {
            // Deselect all
            modulePerms.forEach(p => newSet.delete(p.name));
        } else {
            // Select all
            modulePerms.forEach(p => newSet.add(p.name));
        }
        setSelectedPermissions(newSet);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            if (mode === 'create') {
                if (formData.password !== formData.confirmPassword) {
                    throw new Error("Passwords do not match");
                }

                console.log('Creating Admin Account (Step 1: Create User via Admin API)');

                // Construct payload matchnig:
                // { "userName": "...", "password": "...", "email": "...", "phoneNumber": "...", "fullName": "...", "role": "Admin" }
                // We'll use email as username for simplicity or derive it.
                // Let's assume username = email prefix or just email.

                const payload = {
                    userName: formData.email.split('@')[0], // Simple username derivation
                    password: formData.password,
                    email: formData.email,
                    phoneNumber: formData.phoneNumber,
                    fullName: formData.fullName,
                    role: "Admin"
                };

                const createRes = await adminService.createUser(payload);
                const createData = (createRes as any)?.data || createRes;

                // The reponse might be a simple ID string or object
                // Based on curl response: "data": "019b301a-2455-7990-a7b7-8f421c289b12"

                const newUserId = typeof createData === 'string' ? createData : (createData?.id || createData?.userId);

                if (!newUserId) throw new Error('Could not retrieve new User ID');

                console.log('Promoting to Admin (Step 2: Force Update Role)', newUserId);
                // Explicitly update role to Admin to ensure it persists, as create might default to User
                await adminService.updateUser(newUserId, { role: 'Admin' });

                console.log('Granting Permissions (Step 3: Bulk Grant)', newUserId);
                const permsToGrant = Array.from(selectedPermissions);
                if (permsToGrant.length > 0) {
                    await permissionService.updateUserPermissions(newUserId, permsToGrant, []);
                }

                alert('Admin Created Successfully');
            } else {
                // Edit Mode
                if (!selectedAdminId) return;

                // 1. Update basic info if needed (skipping password update for simplicity here, logic same as before)
                // await adminService.updateUser(selectedAdminId, { fullName: formData.fullName ... });

                // 2. Calc Diff for Permissions
                const current = selectedPermissions;
                const original = originalPermissions;

                const toGrant = Array.from(current).filter(p => !original.has(p));
                const toRevoke = Array.from(original).filter(p => !current.has(p));

                if (toGrant.length > 0 || toRevoke.length > 0) {
                    console.log('Updating user permissions', { toGrant, toRevoke });
                    await permissionService.updateUserPermissions(selectedAdminId, toGrant, toRevoke);
                }

                alert('Admin Updated Successfully');
            }

            setIsModalOpen(false);
            loadData(); // Refresh list
        } catch (err: any) {
            console.error('Error saving admin:', err);

            // Extract validation errors
            let msg = 'Failed to save';
            const errorData = err.response?.data || err;
            const validationErrors = errorData.errors || errorData.messages;

            if (Array.isArray(validationErrors) && validationErrors.length > 0) {
                // If it's an array of strings
                msg = validationErrors.join('\n');
            } else if (typeof validationErrors === 'string') {
                msg = validationErrors;
            } else if (err.message) {
                msg = err.message;
            }

            alert(`Failed: ${msg}`);
        } finally {
            setSaving(false);
        }
    };

    return (
        <SuperAdminLayout>
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Admin Management</h1>
                    <p className="text-slate-600 dark:text-slate-400">Manage administrator accounts and their granular permissions</p>
                </div>
                <Button onClick={handleOpenCreate} leftIcon={<Plus size={18} />}>
                    Create New Admin
                </Button>
            </div>

            {/* Main Content List */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[800px]">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Administrator</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date Added</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {loading ? (
                                <tr><td colSpan={4} className="p-8 text-center text-slate-500">Loading administrators...</td></tr>
                            ) : admins.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="p-12 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <Users className="text-slate-400" size={32} />
                                            <p className="text-slate-500 font-medium">No other administrators found.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                admins.map((admin) => (
                                    <tr key={admin.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                                                    {admin.fullName.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-900 dark:text-white">{admin.fullName}</p>
                                                    <p className="text-xs text-slate-500">{admin.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                                                {admin.role || 'Admin'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500">
                                            {admin.createdAt ? new Date(admin.createdAt).toLocaleDateString() : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleOpenEdit(admin)}
                                                className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 dark:hover:text-indigo-400 transition-colors ml-auto"
                                            >
                                                <Edit2 size={16} />
                                                Manage Permissions
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>



            {/* Create/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col my-8">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                                    <Shield size={24} />
                                </div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                    {mode === 'create' ? 'Create New Administrator' : 'Manage Admin Permissions'}
                                </h2>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                            <form id="adminForm" onSubmit={handleSubmit} className="space-y-8">
                                {/* Basic Info Section */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
                                        Basic Information
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.fullName}
                                                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                                disabled={mode === 'edit'}
                                                className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.phoneNumber}
                                                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                                                disabled={mode === 'edit'}
                                                className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
                                            <input
                                                type="email"
                                                required
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                disabled={mode === 'edit'}
                                                className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50"
                                            />
                                        </div>

                                        {mode === 'create' && (
                                            <>
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Temporary Password</label>
                                                    <input
                                                        type="password"
                                                        required
                                                        value={formData.password}
                                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                        className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Confirm Password</label>
                                                    <input
                                                        type="password"
                                                        required
                                                        value={formData.confirmPassword}
                                                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                                        className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                                    />
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Permissions Section */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                                        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                                            Assign Permissions
                                        </h3>
                                        <span className="text-xs text-slate-500">
                                            Selected: {selectedPermissions.size}
                                        </span>
                                    </div>

                                    <div className="space-y-6">
                                        {Object.entries(groupedPermissions).sort().map(([module, perms]) => (
                                            <div key={module} className="bg-slate-50 dark:bg-slate-800/30 rounded-lg p-4">
                                                <div className="flex items-center justify-between mb-3">
                                                    <h4 className="font-semibold text-slate-800 dark:text-slate-200">
                                                        {module}
                                                    </h4>
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleModule(module)}
                                                        className="text-xs text-indigo-600 hover:text-indigo-500 font-medium"
                                                    >
                                                        Toggle All
                                                    </button>
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                    {perms.map((perm) => (
                                                        <label key={perm.id} className={`
                                                            flex items-start gap-3 p-3 rounded bg-white dark:bg-slate-900 border cursor-pointer transition-all
                                                            ${selectedPermissions.has(perm.name)
                                                                ? 'border-indigo-500 ring-1 ring-indigo-500 shadow-sm'
                                                                : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300'}
                                                        `}>
                                                            <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${selectedPermissions.has(perm.name)
                                                                ? 'bg-indigo-600 border-indigo-600'
                                                                : 'border-slate-400 bg-transparent'
                                                                }`}>
                                                                {selectedPermissions.has(perm.name) && <Check size={12} className="text-white" />}
                                                            </div>
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedPermissions.has(perm.name)}
                                                                onChange={() => togglePermission(perm.name)}
                                                                className="hidden" // Hiding default checkbox for custom styling
                                                            />
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                                                                    {perm.displayName}
                                                                </p>
                                                                <p className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">
                                                                    {perm.action}
                                                                </p>
                                                            </div>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </form>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex-shrink-0 rounded-b-xl flex justify-end gap-3 transition-all">
                            <Button variant="secondary" onClick={() => setIsModalOpen(false)} disabled={saving}>
                                Cancel
                            </Button>
                            <Button variant="primary" onClick={() => document.getElementById('adminForm')?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))} disabled={saving}>
                                {saving ? (
                                    <>
                                        <Loader2 className="animate-spin mr-2" size={18} />
                                        Saving...
                                    </>
                                ) : (
                                    mode === 'create' ? 'Create Administrator' : 'Save Changes'
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </SuperAdminLayout>
    );
};

export default AdminManagementPage;
