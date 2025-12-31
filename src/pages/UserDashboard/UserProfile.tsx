import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { User, Mail, Phone, Save, Camera, Wallet, CreditCard, Users, Ticket, ArrowLeft, ShieldCheck, Crown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
    const { t } = useTranslation();
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

    const getPlanTranslationKey = (planName: string) => {
        if (!planName) return null;
        const normalized = planName.toLowerCase().trim();
        if (normalized.includes('free trial')) return 'freeTrial';
        if (normalized.includes('monthly')) return 'monthlyPlan';
        if (normalized.includes('quarterly')) return 'quarterlyPlan';
        if (normalized.includes('yearly') || normalized.includes('annual')) return 'yearlyPlan';
        return null;
    };

    const getTranslatedPlanName = (originalName: string) => {
        const key = getPlanTranslationKey(originalName);
        return key ? t(`subscriptionsPageView.plans.${key}.name`) : originalName;
    };

    useEffect(() => {
        fetchProfile();
    }, []);

    useEffect(() => {
        if (tabParam && tabParam !== activeTab) {
            setActiveTab(tabParam);
        }
    }, [tabParam]);

    useEffect(() => {
        if (activeTab === 'profile' && !loading) {
            fetchProfile();
        }
    }, [activeTab]);

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

            const isJustSubscribed = (window.history.state?.usr?.justSubscribed) || (location.state as any)?.justSubscribed;

            let attempts = 0;
            const maxAttempts = isJustSubscribed ? 10 : 1;
            let subFound = false;

            while (attempts < maxAttempts && !subFound) {
                try {
                    const subRes = await subscriptionsService.current();
                    const subData = (subRes as any)?.data || subRes;

                    if (subData && (subData.status || subData.planId)) {
                        if (isJustSubscribed && !['active', 'trialing', 'succeeded'].includes(subData.status?.toLowerCase())) {
                            throw new Error("Subscription found but not active yet");
                        }
                        setCurrentSubscription(subData);
                        subFound = true;
                        dispatch(updateUserSubscription({
                            subscriptionStatus: subData.status,
                            subscriptionPlan: subData.plan?.name || subData.planName,
                            trialEndDate: subData.endDate || subData.renewalDate
                        }));

                        if (isJustSubscribed) {
                            dispatch(showToast({ message: "Subscription verified!", type: "success" }));
                        }
                    } else {
                        setCurrentSubscription(null);
                    }
                } catch (e) {
                    if (attempts === maxAttempts - 1) {
                        if (data.subscriptionStatus || data.subscription) {
                            const fallbackSub = {
                                status: data.subscriptionStatus || data.subscription?.status,
                                planName: data.subscriptionPlan || data.subscription?.planName || data.subscription?.plan?.name,
                                plan: data.subscription?.plan || { name: data.subscriptionPlan },
                                renewalDate: data.subscription?.renewalDate || data.subscription?.endDate,
                                endDate: data.subscription?.endDate
                            };
                            setCurrentSubscription(fallbackSub);
                            subFound = true;
                        } else {
                            setCurrentSubscription(null);
                        }
                    } else {
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

    const handleUpdateProfile = async () => {
        try {
            const updatedProfile = await usersService.updateProfile({
                fullName: formData.fullName,
                phoneNumber: formData.phone
            });

            const mergedProfile = {
                ...profile,
                ...updatedProfile,
                fullName: formData.fullName,
                phoneNumber: formData.phone
            };

            setProfile(mergedProfile);

            if (user) {
                dispatch(setUser({ ...user, ...mergedProfile, id: user.id }));
            }

            dispatch(showToast({ message: t('profilePage.updateSuccess'), type: 'success' }));
            setIsEditing(false);
        } catch (error: any) {
            let errorMessage = error?.response?.data?.message || 'Failed to update profile';
            dispatch(showToast({ message: errorMessage, type: 'error' }));
        }
    };

    const tabs = [
        { id: 'profile' as ProfileTabType, label: t('nav.profile'), icon: User },
        { id: 'wallet' as ProfileTabType, label: t('nav.wallet'), icon: Wallet },
        { id: 'subscriptions' as ProfileTabType, label: t('nav.subscriptions'), icon: CreditCard },
        { id: 'referrals' as ProfileTabType, label: t('nav.referrals'), icon: Users },
        { id: 'coupons' as ProfileTabType, label: t('profilePage.coupons'), icon: Ticket },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'wallet': return <UserWallet />;
            case 'subscriptions': return <UserSubscriptions />;
            case 'referrals': return <UserReferrals />;
            case 'coupons': return <UserCoupons />;
            case 'profile':
            default: return renderProfileContent();
        }
    };

    const renderProfileContent = () => {
        if (loading) return <div className="text-center py-20 text-slate-500 animate-pulse">{t('common.loading')}</div>;
        if (!profile) return null;

        return (
            <div className="max-w-5xl mx-auto space-y-8 animate-fadeIn">
                {/* Profile Hero Section */}
                <div className="glass-panel p-8 rounded-3xl relative overflow-hidden">
                    {/* Ambient Glow */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                    <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 md:gap-12">
                        <div className="relative group">
                            <div className="w-40 h-40 rounded-full p-1 bg-gradient-to-br from-indigo-500 to-fuchsia-500 shadow-xl">
                                <div className="w-full h-full rounded-full bg-slate-900 border-4 border-slate-900 overflow-hidden relative">
                                    {profile.avatarUrl ? (
                                        <img src={profile.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-5xl font-bold text-slate-400 bg-slate-800">
                                            {profile.fullName?.charAt(0) || 'U'}
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-[2px]" onClick={() => fileInputRef.current?.click()}>
                                        <Camera className="text-white w-8 h-8" />
                                    </div>
                                </div>
                            </div>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" />
                        </div>

                        <div className="flex-1 text-center md:text-left space-y-3">
                            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">{profile.fullName}</h2>
                            <p className="text-lg text-slate-500 dark:text-slate-400 font-medium">{profile.email}</p>
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
                                <span className="px-4 py-1.5 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 rounded-full text-sm font-bold border border-slate-200 dark:border-white/10 uppercase tracking-wide">
                                    {profile.role || 'User'}
                                </span>
                                {profile.isVerified && (
                                    <span className="flex items-center gap-1.5 px-4 py-1.5 bg-green-500/10 text-green-600 dark:text-green-400 rounded-full text-sm font-bold border border-green-500/20 uppercase tracking-wide">
                                        <ShieldCheck size={16} />
                                        {t('profilePage.verified')}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Subscription Status Card */}
                <div className={`glass-card relative overflow-hidden rounded-3xl p-8 text-white shadow-2xl transition-transform hover:-translate-y-1 duration-300 ${currentSubscription
                    ? 'bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-600 border-indigo-400/30'
                    : 'bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700'
                    }`}>
                    {/* Decorative Patterns */}
                    <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
                    <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-black/10 rounded-full blur-2xl" />

                    <div className="relative z-10 flex flex-col items-start sm:flex-row sm:items-center justify-between gap-6">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-xl ${currentSubscription ? 'bg-white/20' : 'bg-slate-700'}`}>
                                    <Crown size={24} className="text-white" />
                                </div>
                                <h3 className="text-2xl font-bold">{t('profilePage.currentSubscription')}</h3>
                            </div>

                            <div>
                                <p className="text-white/80 text-sm font-bold uppercase tracking-wider mb-1">Current Plan</p>
                                <p className="text-3xl font-extrabold tracking-tight">
                                    {getTranslatedPlanName(currentSubscription?.plan?.name || currentSubscription?.planName) || t('profilePage.noActivePlan')}
                                </p>
                            </div>

                            <div className="flex items-center gap-3">
                                <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold ${['active', 'trialing', 'succeeded', 'year'].includes(currentSubscription?.status?.toLowerCase() || '')
                                    ? 'bg-green-400 text-slate-900'
                                    : 'bg-red-400 text-slate-900'
                                    }`}>
                                    <span className={`w-2 h-2 rounded-full ${['active', 'trialing', 'succeeded', 'year'].includes(currentSubscription?.status?.toLowerCase() || '') ? 'bg-slate-900' : 'bg-white'}`} />
                                    {['active', 'trialing', 'succeeded', 'year'].includes(currentSubscription?.status?.toLowerCase() || '') ? t('profilePage.active') : t('profilePage.noActivePlan')}
                                </span>
                                {currentSubscription && (
                                    <span className="text-white/70 text-sm font-medium">
                                        {['active', 'trialing', 'succeeded', 'year'].includes(currentSubscription?.status?.toLowerCase() || '') ? t('profilePage.renewsOn') : t('profilePage.expiredOn')} {new Date(currentSubscription.renewalDate || currentSubscription.endDate || Date.now()).toLocaleDateString()}
                                    </span>
                                )}
                            </div>
                        </div>

                        <Button
                            className="bg-white text-indigo-900 hover:bg-slate-100 font-bold px-6 py-3 rounded-xl shadow-lg shadow-black/20"
                            onClick={() => handleTabChange('subscriptions')}
                        >
                            {currentSubscription ? t('profilePage.managePlan') : t('profilePage.upgradeToPro')}
                        </Button>
                    </div>
                </div>

                {/* Personal Information Form */}
                <div className="glass-panel p-8 rounded-3xl">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-1">
                                <User className="text-indigo-500" size={24} />
                                {t('profilePage.personalInfo')}
                            </h3>
                            <p className="text-slate-500 text-sm">Update your personal details here.</p>
                        </div>

                        {!isEditing && (
                            <Button variant="outline" onClick={() => setIsEditing(true)} className="glass-button">
                                {t('profilePage.editProfile')}
                            </Button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">
                                {t('profilePage.fullName')}
                            </label>
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
                                <input
                                    type="text"
                                    value={formData.fullName}
                                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                    disabled={!isEditing}
                                    className="glass-input w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">
                                {t('profilePage.email')}
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                <input
                                    type="email"
                                    value={formData.email}
                                    disabled
                                    className="glass-input w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900/50 cursor-not-allowed opacity-70"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">
                                {t('profilePage.phone')}
                            </label>
                            <div className="relative group">
                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    disabled={!isEditing}
                                    className="glass-input w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                                />
                            </div>
                        </div>
                    </div>

                    {isEditing && (
                        <div className="flex items-center justify-center sm:justify-start gap-4 mt-8 pt-6 border-t border-slate-200/50 dark:border-white/5 animate-in fade-in slide-in-from-top-2">
                            <Button onClick={handleUpdateProfile} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/30">
                                <Save size={18} className="mr-2" />
                                {t('profilePage.saveChanges')}
                            </Button>
                            <Button variant="ghost" onClick={() => {
                                setIsEditing(false);
                                setFormData({
                                    fullName: profile.fullName || '',
                                    email: profile.email || '',
                                    phone: profile.phoneNumber || ''
                                });
                            }}>
                                {t('profilePage.cancel')}
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-7xl mx-auto pb-20">
            {/* Page Header */}
            <div className="mb-8 flex items-center gap-4 px-2">
                <button
                    onClick={() => navigate(-1)}
                    className="glass-button p-3 rounded-full text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                >
                    <ArrowLeft size={24} />
                </button>
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
                        {t('profilePage.myAccount')}
                    </h1>
                </div>
            </div>

            {/* Custom Tab Navigation */}
            <div className="glass-panel p-2 mb-8 rounded-2xl flex overflow-x-auto scrollbar-hide mx-2 shadow-lg dark:shadow-black/20 sticky top-24 z-20">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => handleTabChange(tab.id)}
                            className={`flex-1 min-w-fit md:min-w-[120px] flex items-center justify-center gap-2 px-3 md:px-4 py-3 rounded-xl font-bold transition-all duration-300 ${isActive
                                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-md'
                                : 'text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-white/5'
                                }`}
                        >
                            <Icon size={18} className={isActive ? 'animate-bounce-subtle' : ''} />
                            <span className="hidden md:block">{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            <div className="px-2 transition-all duration-500">
                {renderContent()}
            </div>
        </div>
    );
};

export default UserProfile;
