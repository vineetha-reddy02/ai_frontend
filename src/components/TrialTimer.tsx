import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

interface TrialTimerProps {
    trialExpiresAt: string | null;
    hasActiveSubscription: boolean;
    isFreeTrial?: boolean;
    onUpgrade?: () => void;
    planName?: string;
}

const TrialTimer: React.FC<TrialTimerProps> = ({
    trialExpiresAt,
    hasActiveSubscription,
    isFreeTrial,
    onUpgrade,
    planName
}) => {
    const navigate = useNavigate();
    const { isLoading } = useSelector((state: RootState) => state.auth);
    const [timeRemaining, setTimeRemaining] = useState<string>('');
    const [isExpired, setIsExpired] = useState(false);

    useEffect(() => {
        // Don't show timer for paid subscribers (only show for free trial users)
        if (!trialExpiresAt || hasActiveSubscription) {
            return;
        }

        const calculateTimeRemaining = () => {
            const now = new Date();
            const expiresAt = new Date(trialExpiresAt);
            const diffMs = expiresAt.getTime() - now.getTime();

            if (diffMs <= 0) {
                setIsExpired(true);
                setTimeRemaining('Trial Expired');
                return;
            }

            // Check if this is a paid plan (Monthly, Quarterly, Yearly)
            const isPaidPlan = planName && (
                planName.toLowerCase().includes('monthly') ||
                planName.toLowerCase().includes('quarterly') ||
                planName.toLowerCase().includes('yearly') ||
                planName.toLowerCase().includes('year')
            );

            if (isPaidPlan) {
                // For paid plans, show days countdown
                const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

                if (days > 0) {
                    setTimeRemaining(`${days} day${days !== 1 ? 's' : ''}`);
                } else {
                    setTimeRemaining(`${hours} hour${hours !== 1 ? 's' : ''}`);
                }
            } else {
                // For free trial, show hours/minutes/seconds countdown
                const hours = Math.floor(diffMs / (1000 * 60 * 60));
                const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

                setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
            }
            setIsExpired(false);
        };

        // Calculate immediately
        calculateTimeRemaining();

        // Update every second for real-time countdown
        const interval = setInterval(calculateTimeRemaining, 1000);

        return () => clearInterval(interval);
    }, [trialExpiresAt, hasActiveSubscription, planName]);

    // Don't show timer for paid subscribers
    if (hasActiveSubscription) {
        return null;
    }

    if (isLoading) {
        return null; // Don't show timer while checking subscription status
    }

    if (!trialExpiresAt) {
        return null; // Don't show if no trial data
    }

    // Check if this is a paid plan
    const isPaidPlan = planName && (
        planName.toLowerCase().includes('monthly') ||
        planName.toLowerCase().includes('quarterly') ||
        planName.toLowerCase().includes('yearly') ||
        planName.toLowerCase().includes('year')
    );

    // For paid plans, only show timer when 5 days or less remain
    if (isPaidPlan && !isExpired) {
        const now = new Date();
        const expiresAt = new Date(trialExpiresAt);
        const diffMs = expiresAt.getTime() - now.getTime();
        const daysRemaining = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        // Hide timer if more than 5 days remain
        if (daysRemaining > 5) {
            return null;
        }
    }

    return (
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-opacity-10 dark:bg-opacity-20 whitespace-nowrap flex-shrink-0 ${isExpired
            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            }`}>
            <Clock className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
            <div className="flex flex-col">
                <span className="text-xs font-medium text-red-900 dark:text-red-200">
                    {isExpired ? 'Trial Expired' : `${planName || 'Free Trial'}: Expires ${new Date(trialExpiresAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}`}
                </span>
                <span className="text-xs tabular-nums text-red-700 dark:text-red-300">
                    {isExpired ? (
                        <button
                            onClick={() => navigate('/subscriptions')}
                            className="text-red-600 dark:text-red-400 hover:underline font-semibold"
                        >
                            Upgrade to Pro
                        </button>
                    ) : (
                        `Ends in: ${timeRemaining}`
                    )}
                </span>
            </div>
        </div>
    );
};

export default TrialTimer;
