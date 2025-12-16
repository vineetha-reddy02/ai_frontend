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
}

const TrialTimer: React.FC<TrialTimerProps> = ({
    trialExpiresAt,
    hasActiveSubscription,
    isFreeTrial,
    onUpgrade
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

            const hours = Math.floor(diffMs / (1000 * 60 * 60));
            const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

            setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
            setIsExpired(false);
        };

        // Calculate immediately
        calculateTimeRemaining();

        // Update every second for real-time countdown
        const interval = setInterval(calculateTimeRemaining, 1000);

        return () => clearInterval(interval);
    }, [trialExpiresAt, hasActiveSubscription]);

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

    return (
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-opacity-10 dark:bg-opacity-20 ${isExpired
            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            }`}>
            <Clock className="w-4 h-4 text-red-600 dark:text-red-400" />
            <div className="flex flex-col">
                <span className="text-xs font-medium text-red-900 dark:text-red-200">
                    {isExpired ? 'Trial Expired' : `Free Trial: Expires ${new Date(trialExpiresAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}`}
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
