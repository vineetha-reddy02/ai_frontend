import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    Phone,
    BookOpen,
    CheckSquare,
    Mic,
    Wallet,
    CreditCard,
    Users,
    User
} from 'lucide-react';
import UserLayout from '../../components/UserLayout';
import UserTopicBrowser from './UserTopicBrowser';
import UserQuizInterface from './UserQuizInterface';
import UserVoiceCall from './UserVoiceCall';
import UserPronunciation from './UserPronunciation';
import UserWallet from './UserWallet';
import UserSubscriptions from './UserSubscriptions';
import UserReferrals from './UserReferrals';
import UserProfile from './UserProfile';
import UpgradeModal from '../../components/UpgradeModal';
import SubscriptionLock from '../../components/SubscriptionLock';
import DashboardCarousel from '../../components/DashboardCourosel';
import { useUsageLimits } from '../../hooks/useUsageLimits';

type TabType = 'voice' | 'topics' | 'quizzes' | 'pronunciation' | 'wallet' | 'subscriptions' | 'referrals' | 'profile';

const DashboardPage: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const tabParam = searchParams.get('tab') as TabType;
    const [activeTab, setActiveTab] = useState<TabType>(tabParam || 'topics');
    const {
        showUpgradeModal,
        closeUpgradeModal,
        isTrialActive,
        trialRemainingTime,
        hasActiveSubscription,
        triggerUpgradeModal,
    } = useUsageLimits();

    // Carousel slides
    const carouselSlides = [
        {
            id: '1',
            image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200&h=400&fit=crop',
            title: 'Master English with Voice Calls',
            description: 'Practice real conversations with native speakers and improve your fluency',
            ctaText: 'Start Calling',
            ctaLink: '/voice-calls'
        },
        {
            id: '2',
            image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&h=400&fit=crop',
            title: 'Interactive Learning Topics',
            description: 'Explore curated topics designed to enhance your language skills',
            ctaText: 'Browse Topics',
            ctaLink: '/topics'
        },
        {
            id: '3',
            image: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=1200&h=400&fit=crop',
            title: 'Test Your Knowledge',
            description: 'Take quizzes and track your progress with detailed analytics',
            ctaText: 'Take Quiz',
            ctaLink: '/quizzes'
        },
        {
            id: '4',
            image: 'https://images.unsplash.com/photo-1589903308904-1010c2294adc?w=1200&h=400&fit=crop',
            title: 'Perfect Your Pronunciation',
            description: 'Get instant feedback on your pronunciation with AI-powered analysis',
            ctaText: 'Try Now',
            ctaLink: '/pronunciation'
        }
    ];

    // Sync tab param with state
    useEffect(() => {
        if (tabParam && tabParam !== activeTab) {
            setActiveTab(tabParam);
        }
    }, [tabParam]);

    // Update URL when tab changes
    const handleTabChange = (tab: TabType) => {
        setActiveTab(tab);
        setSearchParams({ tab });
    };

    const tabs = [
        { id: 'voice' as TabType, label: 'Voice Calls', icon: Phone },
        { id: 'topics' as TabType, label: 'Topics', icon: BookOpen },
        { id: 'quizzes' as TabType, label: 'Quizzes', icon: CheckSquare },
        { id: 'pronunciation' as TabType, label: 'Pronunciation', icon: Mic },
    ];

    const renderContent = () => {
        // Check if access should be restricted
        const isRestricted = !isTrialActive && !hasActiveSubscription;

        if (isRestricted) {
            return (
                <SubscriptionLock
                    description="Your free trial has ended. Please upgrade to a subscription plan to continue accessing Voice Calls, Topics, Quizzes, and Pronunciation features."
                />
            );
        }

        switch (activeTab) {
            case 'topics':
                return <UserTopicBrowser />;
            case 'quizzes':
                return <UserQuizInterface />;
            case 'voice':
                return <UserVoiceCall />;
            case 'pronunciation':
                return <UserPronunciation />;
            default:
                return <UserTopicBrowser />;
        }
    };

    return (
        <UserLayout>
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
                        Learning Dashboard
                    </h1>
                    <p className="text-lg text-slate-600 dark:text-slate-400">
                        Your personalized learning hub
                    </p>
                </div>

                {/* Dashboard Carousel */}
                <DashboardCarousel slides={carouselSlides} autoPlayInterval={5000} />

                {/* Navigation Tabs */}
                <div className="mb-8 sticky top-20 z-30 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm py-2">
                    <div className="flex justify-between w-full p-1 bg-slate-100 dark:bg-slate-800/50 rounded-xl">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => handleTabChange(tab.id)}
                                    className={`flex items-center gap-3 px-6 py-2.5 rounded-lg font-medium transition-all flex-1 justify-center ${isActive
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
        </UserLayout>
    );
};

export default DashboardPage;
