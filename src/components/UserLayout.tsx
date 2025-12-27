import React, { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    LogOut,
    Settings,
    Wallet,
    Users,
    User,
    Ticket,
    Home,
    Moon,
    Sun,
    BookOpen,
    Mic,
    Menu
} from 'lucide-react';
import type { RootState, AppDispatch } from '../store';
import { logout } from '../store/authSlice';
import { toggleTheme } from '../store/uiSlice';
import { closeRatingModal } from '../store/callSlice';
import OnlineStatusIndicator from './OnlineStatusIndicator';
import TrialTimer from './TrialTimer';
import CallRatingModal from './voice-call/CallRatingModal';
import { useUsageLimits } from '../hooks/useUsageLimits';
import { LanguageSelector } from './common/LanguageSelector';
import { Logo } from './common/Logo';
import callsService from '../services/calls';

interface UserLayoutProps {
    children: React.ReactNode;
}

const UserLayout: React.FC<UserLayoutProps> = ({ children }) => {
    const dispatch = useDispatch<AppDispatch>();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useSelector((state: RootState) => state.auth);
    const { theme } = useSelector((state: RootState) => state.ui);
    const { showRatingModal, lastCompletedCall } = useSelector((state: RootState) => state.call);

    const [profileOpen, setProfileOpen] = useState(false);
    const profileRef = useRef<HTMLDivElement | null>(null);
    const {
        hasActiveSubscription,
        isFreeTrial,
        trialExpiresAt,
        triggerUpgradeModal,
        isContentLocked,
        isExplicitlyCancelled
    } = useUsageLimits();

    const handleLogout = async () => {
        try {
            await callsService.updateAvailability('Offline');
        } catch (error) {
            console.error('Failed to set status to Offline:', error);
        }
        dispatch(logout());
        navigate('/');
    };

    // Close profile dropdown when clicking outside or pressing Escape
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (!profileRef.current) return;
            if (profileOpen && !profileRef.current.contains(e.target as Node)) {
                setProfileOpen(false);
            }
        };

        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && profileOpen) setProfileOpen(false);
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKey);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKey);
        };
    }, [profileOpen]);

    const menuItems = [
        { icon: <Home size={18} />, label: 'Dashboard', path: '/dashboard' },
        { icon: <Wallet size={18} />, label: 'Wallet', path: '/wallet' },
        { icon: <Ticket size={18} />, label: 'Subscriptions', path: '/subscriptions' },
        { icon: <Users size={18} />, label: 'Referrals', path: '/referrals' },
        { icon: <User size={18} />, label: 'Profile', path: '/profile' },
        { icon: <Settings size={18} />, label: 'Settings', path: '/settings' },
    ];

    return (
        <div className="min-h-dvh bg-slate-50 dark:bg-slate-950 flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-14 md:h-16">
                        {/* Logo */}
                        <div className="cursor-pointer" onClick={() => navigate('/dashboard')}>
                            <Logo />
                        </div>

                        {/* Right Actions */}
                        <div className="flex items-center gap-2 md:gap-4">
                            {/* Trial/Plan Status */}
                            {isExplicitlyCancelled ? (
                                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-full animate-pulse">
                                    <div className="w-2 h-2 rounded-full bg-red-500" />
                                    <span className="text-xs font-semibold text-red-700 dark:text-red-300">
                                        No Active Plan
                                    </span>
                                </div>
                            ) : isContentLocked && !hasActiveSubscription ? (
                                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-full">
                                    <div className="w-2 h-2 rounded-full bg-orange-500" />
                                    <span className="text-xs font-semibold text-orange-700 dark:text-orange-300">
                                        Plan Expired
                                    </span>
                                </div>
                            ) : (
                                <TrialTimer
                                    trialExpiresAt={trialExpiresAt}
                                    hasActiveSubscription={hasActiveSubscription}
                                    isFreeTrial={isFreeTrial}
                                    onUpgrade={triggerUpgradeModal}
                                    planName={user?.subscriptionPlan}
                                />
                            )}

                            {/* Theme Toggle */}
                            <button
                                onClick={() => dispatch(toggleTheme())}
                                className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                                aria-label="Toggle theme"
                            >
                                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                            </button>

                            {/* Language Selector */}
                            <LanguageSelector />

                            {/* Profile Dropdown */}
                            <div className="relative" ref={profileRef}>
                                <button
                                    onClick={() => setProfileOpen(!profileOpen)}
                                    className="flex items-center gap-2 focus:outline-none relative min-h-[44px] min-w-[44px]"
                                >
                                    <div className="relative">
                                        <img
                                            src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.fullName || 'User')}`}
                                            alt="Profile"
                                            className="w-9 h-9 md:w-10 md:h-10 rounded-full border border-slate-200 dark:border-slate-700"
                                        />
                                        <OnlineStatusIndicator />
                                    </div>
                                </button>

                                {profileOpen && (
                                    <div className="absolute right-0 mt-2 w-56 md:w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl py-2 z-50">
                                        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 mb-2">
                                            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                                                {user?.fullName}
                                            </p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                                {user?.email}
                                            </p>
                                        </div>

                                        <div className="max-h-[60vh] overflow-y-auto">
                                            {menuItems.map((item) => (
                                                <button
                                                    key={item.path}
                                                    onClick={() => {
                                                        setProfileOpen(false);
                                                        navigate(item.path);
                                                    }}
                                                    className="w-full text-left flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors min-h-[44px]"
                                                >
                                                    {item.icon}
                                                    {item.label}
                                                </button>
                                            ))}
                                        </div>

                                        <div className="mt-2 border-t border-slate-200 dark:border-slate-800 pt-2">
                                            <button
                                                onClick={() => { setProfileOpen(false); handleLogout(); }}
                                                className="w-full text-left flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors min-h-[44px]"
                                            >
                                                <LogOut size={18} />
                                                Sign Out
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-8 overflow-x-hidden">
                {children}
            </main>

            {/* Call Rating Modal */}
            {showRatingModal && lastCompletedCall && (
                <CallRatingModal
                    callId={lastCompletedCall.callId}
                    partnerName={lastCompletedCall.partnerName}
                    onClose={() => dispatch(closeRatingModal())}
                />
            )}
        </div>
    );
};

export default UserLayout;
