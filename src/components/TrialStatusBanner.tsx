import React from 'react';
import { Clock, CheckCircle, XCircle, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TrialStatusBannerProps {
    isTrialActive: boolean;
    trialRemainingTime: string;
    hasActiveSubscription: boolean;
    onUpgrade: () => void;
}

const TrialStatusBanner: React.FC<TrialStatusBannerProps> = ({
    isTrialActive,
    trialRemainingTime,
    hasActiveSubscription,
    onUpgrade,
}) => {
    const navigate = useNavigate();

    if (hasActiveSubscription) {
        return (
            <div className="mb-6 p-4 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <div className="flex items-center gap-3">
                    <Crown className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                    <div className="flex-1">
                        <p className="font-semibold text-yellow-900 dark:text-yellow-200">
                            Pro Member
                        </p>
                        <p className="text-sm text-yellow-700 dark:text-yellow-300">
                            Unlimited access to all features
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (isTrialActive) {
        return (
            <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                        <div>
                            <p className="font-semibold text-green-900 dark:text-green-200">
                                24-Hour Free Trial Active
                            </p>
                            <p className="text-sm text-green-700 dark:text-green-300">
                                Full access to all features • Time remaining: {trialRemainingTime}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate('/subscriptions')}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                        Upgrade Now
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                    <div>
                        <p className="font-semibold text-red-900 dark:text-red-200">
                            Trial Expired
                        </p>
                        <p className="text-sm text-red-700 dark:text-red-300">
                            Upgrade to Pro to continue accessing all features
                        </p>
                    </div>
                </div>
                <button
                    onClick={onUpgrade}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                    Upgrade to Pro
                </button>
            </div>
        </div>
    );
};

export default TrialStatusBanner;
