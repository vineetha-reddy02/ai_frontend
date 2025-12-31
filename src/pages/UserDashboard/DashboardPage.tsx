import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
    Phone,
    BookOpen,
    CheckSquare,
    Mic,
    Wallet,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import UserLayout from '../../components/UserLayout';
import UserTopicBrowser from './UserTopicBrowser';
import UserQuizInterface from './UserQuizInterface';
import UserVoiceCall from './UserVoiceCall';
import UserPronunciation from './UserPronunciation';
import DashboardCarousel from '../../components/DashboardCourosel';
import { useUsageLimits } from '../../hooks/useUsageLimits';

type TabType = 'voice' | 'topics' | 'quizzes' | 'pronunciation' | 'wallet' | 'subscriptions' | 'referrals' | 'profile';

const DashboardPage: React.FC = () => {
    const { t } = useTranslation();
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const tabParam = searchParams.get('tab') as TabType;
    const [activeTab, setActiveTab] = useState<TabType>(tabParam || 'topics');
    const {
        isTrialActive,
        hasActiveSubscription,
        triggerUpgradeModal,
    } = useUsageLimits();

    const carouselSlides = [
        {
            id: '1',
            image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200&h=400&fit=crop',
            title: t('dashboard.carousel.slide1.title'),
            description: t('dashboard.carousel.slide1.description'),
            ctaText: t('dashboard.carousel.slide1.cta'),
            ctaLink: '/voice-calls'
        },
        {
            id: '2',
            image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&h=400&fit=crop',
            title: t('dashboard.carousel.slide2.title'),
            description: t('dashboard.carousel.slide2.description'),
            ctaText: t('dashboard.carousel.slide2.cta'),
            ctaLink: '/topics'
        },
        {
            id: '3',
            image: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=1200&h=400&fit=crop',
            title: t('dashboard.carousel.slide3.title'),
            description: t('dashboard.carousel.slide3.description'),
            ctaText: t('dashboard.carousel.slide3.cta'),
            ctaLink: '/quizzes'
        },
        {
            id: '4',
            image: 'https://images.unsplash.com/photo-1589903308904-1010c2294adc?w=1200&h=400&fit=crop',
            title: t('dashboard.carousel.slide4.title'),
            description: t('dashboard.carousel.slide4.description'),
            ctaText: t('dashboard.carousel.slide4.cta'),
            ctaLink: '/pronunciation'
        }
    ];

    useEffect(() => {
        if (tabParam && tabParam !== activeTab) {
            setActiveTab(tabParam);
        }
    }, [tabParam]);

    const handleTabChange = (tab: TabType) => {
        setActiveTab(tab);
        setSearchParams({ tab });
    };

    const tabs = [
        { id: 'voice' as TabType, label: t('nav.voiceCalls'), icon: Phone },
        { id: 'topics' as TabType, label: t('nav.topics'), icon: BookOpen },
        { id: 'quizzes' as TabType, label: t('nav.quizzes'), icon: CheckSquare },
        { id: 'pronunciation' as TabType, label: t('nav.pronunciation'), icon: Mic },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'topics': return <UserTopicBrowser />;
            case 'quizzes': return <UserQuizInterface />;
            case 'voice': return <UserVoiceCall />;
            case 'pronunciation': return <UserPronunciation />;
            default: return <UserTopicBrowser />;
        }
    };

    const { isContentLocked, isExplicitlyCancelled } = useUsageLimits();

    return (
        <UserLayout>
            <div className="max-w-7xl mx-auto relative max-w-full overflow-x-hidden">
                {/* Header with Title */}
                <div className="mb-8 pl-1">
                    <h1 className="text-3xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-violet-800 to-slate-900 dark:from-white dark:via-violet-200 dark:to-white mb-3">
                        {t('dashboard.title')}
                    </h1>
                    <p className="text-base md:text-lg text-slate-600 dark:text-slate-400 max-w-2xl">
                        {t('dashboard.subtitle')}
                    </p>
                </div>

                {/* Dashboard Carousel Container - Add subtle glass effect behind it */}
                <div className="mb-10 relative group">
                    {/* Glow effect behind carousel */}
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 blur-2xl rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                    <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-slate-900/10 dark:shadow-black/30 transform transition-transform hover:scale-[1.01] duration-500">
                        <DashboardCarousel slides={carouselSlides} autoPlayInterval={5000} />
                    </div>
                </div>

                {/* Navigation Tabs - Floating Glass Bar */}
                <div className="mb-8 sticky top-24 z-30">
                    <div className="glass-panel p-2 rounded-2xl flex items-center justify-between gap-2 overflow-x-auto scrollbar-hide shadow-xl shadow-slate-200/50 dark:shadow-black/20">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => handleTabChange(tab.id)}
                                    className={`relative flex items-center justify-center gap-2 px-4 md:px-6 py-3 rounded-xl font-bold transition-all duration-300 flex-1 min-w-[100px] whitespace-nowrap overflow-hidden group ${isActive
                                        ? 'text-white shadow-lg shadow-violet-500/30'
                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-white/5'
                                        }`}
                                >
                                    {/* Active Background Gradient */}
                                    {isActive && (
                                        <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl animate-fadeIn" />
                                    )}

                                    <Icon className={`w-5 h-5 relative z-10 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                                    <span className="relative z-10 text-sm md:text-base">{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Content Area - VISIBLY LOCKED IF EXPIRED */}
                <div className="relative min-h-[50vh] animate-slideUp">
                    {/* Lock Overlay */}
                    {isContentLocked && (
                        <div
                            className="absolute inset-0 z-50 flex items-center justify-center"
                            onClick={(e) => {
                                e.stopPropagation();
                                triggerUpgradeModal();
                            }}
                        >
                            <div className="glass-panel p-8 rounded-3xl shadow-2xl border border-red-500/20 flex flex-col items-center max-w-sm mx-4 animate-in fade-in zoom-in duration-300 text-center backdrop-blur-xl bg-slate-900/80">
                                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4 text-red-500 animate-bounce">
                                    <Wallet size={32} />
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-2">
                                    {isExplicitlyCancelled ? t('dashboard.lockOverlay.noPlan') : t('dashboard.lockOverlay.trialExpired')}
                                </h3>
                                <p className="text-slate-300 mb-6 leading-relaxed">
                                    {isExplicitlyCancelled
                                        ? t('dashboard.lockOverlay.noPlanDesc')
                                        : t('dashboard.lockOverlay.trialExpiredDesc')}
                                    <br />
                                    {t('dashboard.lockOverlay.unlockPrompt')}
                                </p>
                                <button
                                    className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-violet-500/25 transition-all hover:scale-[1.02]"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate('/subscriptions');
                                    }}
                                >
                                    {t('dashboard.lockOverlay.unlockButton')}
                                </button>
                            </div>
                        </div>
                    )}

                    <div className={`transition-all duration-500 ${isContentLocked ? 'opacity-40 blur-sm pointer-events-none select-none grayscale-[0.5]' : ''}`}>
                        {renderContent()}
                    </div>
                </div>
            </div>
        </UserLayout>
    );
};

export default DashboardPage;
