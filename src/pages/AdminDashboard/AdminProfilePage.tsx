import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
    Loader,
    Upload,
    AlertCircle,
    Edit2,
    Camera,
    User,
    Shield,
    ArrowLeft
} from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import Button from '../../components/Button';
import { usersService } from '../../services/users';
import { showToast } from '../../store/uiSlice';
import { RootState } from '../../store';
import { UserProfile } from '../../types';

const AdminProfilePage: React.FC = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { user } = useSelector((state: RootState) => state.auth);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // State management
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // Form state
    const [editForm, setEditForm] = useState<Partial<UserProfile>>({});
    const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

    // Validation error state
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

    // State for stats
    const [stats, setStats] = useState<any>(null);

    // Fetch profile on mount
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                setLoading(true);
                const [profileData, statsData] = await Promise.all([
                    usersService.getProfile(),
                    import('../../services/admin').then(m => m.adminService.getDashboardStats().catch(() => null))
                ]);

                // Fallback / Mock checks for stats if API returns generic response that needs parsing
                const finalStats = (statsData as any)?.data || statsData || {
                    totalUsers: 0,
                    totalInstructors: 0,
                    totalRevenue: 0,
                    pendingApprovals: 0
                };

                console.log('Admin Profile fetched:', profileData, finalStats);
                setProfile(profileData);
                setEditForm(profileData);
                setStats(finalStats);
            } catch (error: any) {
                console.error('Failed to fetch profile:', error);
                dispatch(
                    showToast({
                        message: 'Failed to load profile',
                        type: 'error',
                    })
                );
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            fetchProfile();
        } else {
            navigate('/login');
        }
    }, [user, dispatch, navigate]);

    // Validation functions
    const validateForm = (): boolean => {
        const errors: Record<string, string> = {};

        if (!editForm.fullName || editForm.fullName.trim().length === 0) {
            errors.fullName = 'Full name is required';
        }

        if (editForm.phoneNumber) {
            if (!/^\d{10,15}$/.test(editForm.phoneNumber.replace(/[^\d]/g, ''))) {
                errors.phoneNumber = 'Phone number must be 10-15 digits';
            }
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const validateImageFile = (file: File): boolean => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        const maxSize = 5 * 1024 * 1024; // 5MB

        if (!allowedTypes.includes(file.type)) {
            dispatch(showToast({ message: 'Invalid image type', type: 'error' }));
            return false;
        }

        if (file.size > maxSize) {
            dispatch(showToast({ message: 'Image too large (max 5MB)', type: 'error' }));
            return false;
        }

        return true;
    };

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!validateImageFile(file)) return;

        setSelectedAvatarFile(file);
        const reader = new FileReader();
        reader.onload = (event) => setAvatarPreview(event.target?.result as string);
        reader.readAsDataURL(file);
    };

    const handleUploadAvatar = async () => {
        if (!selectedAvatarFile) return;

        try {
            setUploading(true);
            const avatarUrl = await usersService.uploadAvatar(selectedAvatarFile);
            setProfile((prev) => (prev ? { ...prev, avatarUrl } : null));
            setSelectedAvatarFile(null);
            setAvatarPreview(null);
            dispatch(showToast({ message: 'Avatar updated', type: 'success' }));
        } catch (error) {
            dispatch(showToast({ message: 'Upload failed', type: 'error' }));
        } finally {
            setUploading(false);
        }
    };

    const handleSaveProfile = async () => {
        if (!validateForm()) return;

        try {
            setLoading(true);
            const updatePayload = {
                fullName: editForm.fullName || '',
                bio: editForm.bio || '',
                preferredLanguage: editForm.preferredLanguage || '',
                country: editForm.country || '',
                city: editForm.city || '',
                phoneNumber: editForm.phoneNumber
            };

            const updatedProfile = await usersService.updateProfile(updatePayload);

            // Merge with existing profile to ensure we have a complete object
            const mergedProfile = {
                ...profile,
                ...updatedProfile,
                ...updatePayload
            };

            setProfile(mergedProfile);
            setEditForm(mergedProfile);
            setIsEditing(false);
            dispatch(showToast({ message: 'Profile updated', type: 'success' }));
        } catch (error) {
            console.error('Update failed:', error);
            dispatch(showToast({ message: 'Update failed', type: 'error' }));
        } finally {
            setLoading(false);
        }
    };

    if (loading && !profile) {
        return (
            <AdminLayout>
                <div className="flex justify-center items-center min-h-screen">
                    <Loader className="w-8 h-8 animate-spin text-blue-600" />
                </div>
            </AdminLayout>
        );
    }

    if (!profile) return null;

    return (
        <AdminLayout>
            <div className="max-w-4xl mx-auto px-6 py-8">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-600 dark:text-slate-400"
                        >
                            <ArrowLeft size={24} />
                        </button>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                                <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Admin Profile</h1>
                        </div>
                    </div>
                    {!isEditing && (
                        <Button onClick={() => setIsEditing(true)} variant="primary" leftIcon={<Edit2 className="w-4 h-4" />}>
                            Edit Profile
                        </Button>
                    )}
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1">
                        <div className="card text-center">
                            <div className="relative inline-block mb-4">
                                <img
                                    src={avatarPreview || profile.avatarUrl || 'https://via.placeholder.com/150'}
                                    alt={profile.fullName}
                                    className="w-32 h-32 rounded-full object-cover border-4 border-blue-600"
                                />
                                {isEditing && (
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full"
                                    >
                                        <Camera className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            {isEditing && selectedAvatarFile && (
                                <Button onClick={handleUploadAvatar} isLoading={uploading} size="sm" className="w-full mb-4">
                                    Confirm Upload
                                </Button>
                            )}

                            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />

                            <h2 className="text-xl font-bold">{profile.fullName}</h2>
                            <p className="text-slate-500">{profile.email}</p>
                            <div className="mt-4 inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                                Administrator
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-2">
                        <div className="card">
                            {isEditing ? (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Full Name</label>
                                        <input
                                            value={editForm.fullName || ''}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, fullName: e.target.value }))}
                                            className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Bio</label>
                                        <textarea
                                            value={editForm.bio || ''}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                                            className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700"
                                            rows={3}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">City</label>
                                            <input
                                                value={editForm.city || ''}
                                                onChange={(e) => setEditForm(prev => ({ ...prev, city: e.target.value }))}
                                                className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Country</label>
                                            <input
                                                value={editForm.country || ''}
                                                onChange={(e) => setEditForm(prev => ({ ...prev, country: e.target.value }))}
                                                className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex gap-4 mt-6">
                                        <Button onClick={handleSaveProfile} isLoading={loading} className="flex-1">Save</Button>
                                        <Button onClick={() => setIsEditing(false)} variant="outline" className="flex-1">Cancel</Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-sm text-slate-500">About</h3>
                                        <p className="mt-1">{profile.bio || 'No bio provided'}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <h3 className="text-sm text-slate-500">Location</h3>
                                            <p className="font-medium">{[profile.city, profile.country].filter(Boolean).join(', ') || '-'}</p>
                                        </div>
                                        <div>
                                            <h3 className="text-sm text-slate-500">Phone</h3>
                                            <p className="font-medium">{profile.phoneNumber || '-'}</p>
                                        </div>
                                        <div>
                                            <h3 className="text-sm text-slate-500">Time Zone</h3>
                                            <p className="font-medium">{profile.timeZone || '-'}</p>
                                        </div>
                                        <div>
                                            <h3 className="text-sm text-slate-500">Age</h3>
                                            <p className="font-medium">{profile.age ? `${profile.age} years` : '-'}</p>
                                        </div>
                                    </div>

                                    {/* Admin System Overview */}
                                    {stats && (
                                        <div className="pt-6 border-t dark:border-slate-700">
                                            <h3 className="text-sm text-slate-500 uppercase tracking-widest font-semibold mb-4">System Overview</h3>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-center">
                                                    <p className="text-xs text-slate-500 mb-1">Total Users</p>
                                                    <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{stats.totalUsers || 0}</p>
                                                </div>
                                                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-center">
                                                    <p className="text-xs text-slate-500 mb-1">Instructors</p>
                                                    <p className="text-xl font-bold text-purple-600 dark:text-purple-400">{stats.totalInstructors || 0}</p>
                                                </div>
                                                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-center">
                                                    <p className="text-xs text-slate-500 mb-1">Revenue</p>
                                                    <p className="text-xl font-bold text-green-600 dark:text-green-400">₹{stats.totalRevenue?.toLocaleString() || 0}</p>
                                                </div>
                                                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-center">
                                                    <p className="text-xs text-slate-500 mb-1">Pending Approvals</p>
                                                    <p className="text-xl font-bold text-orange-600 dark:text-orange-400">{stats.pendingApprovals || 0}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
};

export default AdminProfilePage;
