import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { User, Mail, Phone, Save, Camera, Wallet, CreditCard, Users, Ticket, ArrowLeft } from 'lucide-react';
import Button from '../../components/Button';
import { usersService } from '../../services/users';
import { useDispatch, useSelector } from 'react-redux';
import { setUser, updateUserSubscription } from '../../store/authSlice';
import { RootState } from '../../store';
import { showToast } from '../../store/uiSlice';
import UserWallet from './UserWallet';
import UserSubscriptions from './UserSubscriptions';
import UserReferrals from './UserReferrals';
import UserCoupons from './UserCoupons';
import { subscriptionsService } from '../../services/subscriptions';

type ProfileTabType = 'profile' | 'wallet' | 'subscriptions' | 'referrals' | 'coupons';

const UserProfile: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const [searchParams, setSearchParams] = useSearchParams();
    const tabParam = searchParams.get('tab') as ProfileTabType;
    const [activeTab, setActiveTab] = useState<ProfileTabType>(tabParam || 'profile');

    const [profile, setProfile] = useState<any>(null);
    const [currentSubscription, setCurrentSubscription] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Form States
    const [formData, setFormData] = useState({ fullName: '', email: '', phone: '' });

    useEffect(() => {
        fetchProfile();
    }, []);

    // Sync tab param with state
    useEffect(() => {
        if (tabParam && tabParam !== activeTab) {
            setActiveTab(tabParam);
        }
    }, [tabParam]);

    // Update URL when tab changes
    const handleTabChange = (tab: ProfileTabType) => {
        setActiveTab(tab);
        setSearchParams({ tab });
    };

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const res = await usersService.getProfile();
            const data = (res as any)?.data || res;
            setProfile(data);
            setFormData({
                fullName: data.fullName || '',
                email: data.email || '',
                phone: data.phoneNumber || ''
            });

            // Dispatch updates to Redux immediately after fetch
            if (user) {
                dispatch(setUser({
                    ...user,
                    ...data,
                    id: user.id || data.userId,
                    role: user.role,
                    avatar: data.avatarUrl || user.avatar,
                    subscriptionStatus: data.subscriptionStatus || data.subscription?.status || user.subscriptionStatus,
                    subscriptionPlan: data.subscriptionPlan || data.subscription?.planName || data.subscription?.plan?.name || user.subscriptionPlan,
                }));
            }

            // Fetch Subscription (Handle 404/Empty safely)
            // If justSubscribed is true, poll aggressively
            const isJustSubscribed = (window.history.state?.usr?.justSubscribed) || (location.state as any)?.justSubscribed;

            let attempts = 0;
            // If just subscribed, retry up to 10 times (10 seconds), otherwise just once
            const maxAttempts = isJustSubscribed ? 10 : 1;
            let subFound = false;

            while (attempts < maxAttempts && !subFound) {
                try {
                    const subRes = await subscriptionsService.current();
                    const subData = (subRes as any)?.data || subRes;

                    // Only set if we have valid data
                    if (subData && (subData.status || subData.planId)) {
                        // If we are waiting for a NEW subscription, ensure it is actually active/trialing
                        // before accepting it, to avoid picking up an old cancelled one if backend hasn't updated
                        if (isJustSubscribed && !['active', 'trialing'].includes(subData.status?.toLowerCase())) {
                            throw new Error("Subscription found but not active yet");
                        }

                        setCurrentSubscription(subData);
                        subFound = true; // Exit loop

                        // Dispatch subscription update immediately
                        dispatch(updateUserSubscription({
                            subscriptionStatus: subData.status,
                            subscriptionPlan: subData.plan?.name || subData.planName,
                            trialEndDate: subData.endDate || subData.renewalDate
                        }));

                        // Force update local profile state to match if needed
                        if (isJustSubscribed) {
                            dispatch(showToast({ message: "Subscription verified!", type: "success" }));
                        }
                    } else {
                        setCurrentSubscription(null);
                    }
                } catch (e) {
                    console.log(`Subscription fetch attempt ${attempts + 1} failed:`, e);
                    if (attempts === maxAttempts - 1) {
                        setCurrentSubscription(null);
                    } else {
                        // Wait 1 second before retry
                        await new Promise(r => setTimeout(r, 1000));
                    }
                }
                attempts++;
            }

        } catch (error) {
            console.error('Failed to load profile:', error);
        } finally {
            setLoading(false);
        }
    };

    // Removed sync useEffect to avoid infinite loops and stale closures. 
    // Dispatch is now handled in fetchProfile.

    const handleUpdateProfile = async () => {
        try {
            const updatedProfile = await usersService.updateProfile({
                fullName: formData.fullName,
                phoneNumber: formData.phone
            });

            // Use returned data or fall back to local form data
            const mergedProfile = {
                ...profile,
                ...updatedProfile, // If API returns the object
                fullName: formData.fullName, // Ensure local values take precedence if API void/partial
                phoneNumber: formData.phone
            };

            setProfile(mergedProfile);

            // Dispatch to Redux
            if (user) {
                dispatch(setUser({
                    ...user,
                    ...mergedProfile,
                    id: user.id
                }));
            }

            dispatch(showToast({ message: 'Profile updated successfully', type: 'success' }));
            setIsEditing(false);

            // Optional: Re-fetch silently if needed, but we trust the update
            // fetchProfile(); 
        } catch (error) {
            console.error('Update profile failed:', error);
            dispatch(showToast({ message: 'Failed to update profile', type: 'error' }));
        }
    };

    const tabs = [
        { id: 'profile' as ProfileTabType, label: 'Profile', icon: User },
        { id: 'wallet' as ProfileTabType, label: 'Wallet', icon: Wallet },
        { id: 'subscriptions' as ProfileTabType, label: 'Subscriptions', icon: CreditCard },
        { id: 'referrals' as ProfileTabType, label: 'Referrals', icon: Users },
        { id: 'coupons' as ProfileTabType, label: 'Coupons', icon: Ticket },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'wallet':
                return <UserWallet />;
            case 'subscriptions':
                return <UserSubscriptions />;
            case 'referrals':
                return <UserReferrals />;
            case 'coupons':
                return <UserCoupons />;
            case 'profile':
            default:
                return renderProfileContent();
        }
    };

    const renderProfileContent = () => {
        if (loading) return <div className="text-center py-12 text-slate-500">Loading profile...</div>;
        if (!profile) return null;

        return (
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Profile Header */}
                <div className="bg-white dark:bg-slate-800 rounded-xl p-8 shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row items-center gap-8">
                    <div className="relative">
                        <div className="w-32 h-32 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                            {profile.avatarUrl ? (
                                <img src={profile.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-slate-400">
                                    {profile.fullName?.charAt(0) || 'U'}
                                </div>
                            )}
                        </div>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute bottom-0 right-0 p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors"
                        >
                            <Camera size={16} />
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                        />
                    </div>

                    <div className="flex-1 text-center md:text-left">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{profile.fullName}</h2>
                        <p className="text-slate-500 dark:text-slate-400 mb-4">{profile.email}</p>
                        <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                            <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-full text-sm font-medium">
                                {profile.role || 'User'}
                            </span>
                            {profile.isVerified && (
                                <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm font-medium">
                                    Verified
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Subscription Card */}
                <div className={`rounded-xl p-8 shadow-lg text-white mb-8 transition-all ${currentSubscription
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600'
                    : 'bg-gradient-to-r from-slate-600 to-slate-700 dark:from-slate-800 dark:to-slate-900 border border-slate-500/30'
                    }`}>
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-xl font-bold mb-2">Current Subscription</h3>
                            <p className="text-white/90 mb-4 text-xs font-semibold uppercase tracking-wider">
                                {currentSubscription?.plan?.name || currentSubscription?.planName || 'No Active Plan'}
                            </p>
                            <div className="flex items-center gap-2">
                                <div className={`px-3 py-1 rounded-full text-xs font-bold ${currentSubscription?.status === 'active' || currentSubscription?.status === 'Trialing'
                                    ? 'bg-green-400/30 text-green-100'
                                    : 'bg-red-400/30 text-red-100'
                                    }`}>
                                    {currentSubscription?.status === 'active' || currentSubscription?.status === 'Trialing'
                                        ? 'ACTIVE'
                                        : 'NO ACTIVE PLAN'}
                                </div>
                                {currentSubscription && (
                                    <span className="text-sm text-white/80">
                                        {currentSubscription.status === 'active' ? 'Renews' : 'Expired'} on {new Date(currentSubscription.renewalDate || currentSubscription.endDate || Date.now()).toLocaleDateString()}
                                    </span>
                                )}
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white"
                            onClick={() => handleTabChange('subscriptions')}
                        >
                            {currentSubscription ? 'Manage Plan' : 'Upgrade to Pro'}
                        </Button>
                    </div>
                </div>

                {/* Profile Information */}
                <div className="bg-white dark:bg-slate-800 rounded-xl p-8 shadow-sm border border-slate-200 dark:border-slate-700">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <User size={20} /> Personal Information
                        </h3>
                        {!isEditing && (
                            <Button variant="outline" onClick={() => setIsEditing(true)}>
                                Edit Profile
                            </Button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                Full Name
                            </label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    value={formData.fullName}
                                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                    disabled={!isEditing}
                                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 disabled:bg-slate-50 dark:disabled:bg-slate-800"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                Email
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="email"
                                    value={formData.email}
                                    disabled
                                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 bg-slate-50 dark:bg-slate-800"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                Phone Number
                            </label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    disabled={!isEditing}
                                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 disabled:bg-slate-50 dark:disabled:bg-slate-800"
                                />
                            </div>
                        </div>
                    </div>

                    {isEditing && (
                        <div className="flex gap-3 mt-6">
                            <Button onClick={handleUpdateProfile} leftIcon={<Save size={16} />}>
                                Save Changes
                            </Button>
                            <Button variant="outline" onClick={() => {
                                setIsEditing(false);
                                setFormData({
                                    fullName: profile.fullName || '',
                                    email: profile.email || '',
                                    phone: profile.phoneNumber || ''
                                });
                            }}>
                                Cancel
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8 flex items-center gap-4">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 rounded-full transition-colors text-blue-600 dark:text-blue-400"
                >
                    <ArrowLeft size={24} />
                </button>
                <div>
                    <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
                        My Account
                    </h1>
                    <p className="text-lg text-slate-600 dark:text-slate-400">
                        Manage your profile and account settings
                    </p>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="mb-8 overflow-x-auto pb-2">
                <div className="flex gap-2 min-w-max p-1 bg-slate-100 dark:bg-slate-800/50 rounded-xl">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => handleTabChange(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${isActive
                                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-700/50'
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Content Area */}
            <div className="transition-opacity duration-200">
                {renderContent()}
            </div>
        </div>
    );
};

export default UserProfile;
