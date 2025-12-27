import React, { useEffect, useState } from 'react';
import { Clock, Infinity } from 'lucide-react';

interface UsageTrackerProps {
    remainingSeconds: number;
    limitSeconds: number;
    isUnlimited?: boolean;
    label?: string;
    onLimitReached?: () => void;
}

const UsageTracker: React.FC<UsageTrackerProps> = ({
    remainingSeconds,
    limitSeconds,
    isUnlimited = false,
    label = 'Time Remaining',
    onLimitReached,
}) => {
    const [displaySeconds, setDisplaySeconds] = useState(remainingSeconds);

    useEffect(() => {
        setDisplaySeconds(remainingSeconds);

        if (remainingSeconds <= 0 && onLimitReached) {
            onLimitReached();
        }
    }, [remainingSeconds, onLimitReached]);

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getProgressPercentage = (): number => {
        if (isUnlimited) return 100;
        return (displaySeconds / limitSeconds) * 100;
    };

    const getProgressColor = (): string => {
        const percentage = getProgressPercentage();
        if (percentage > 50) return 'bg-green-500';
        if (percentage > 20) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    if (isUnlimited) {
        return (
            <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <Infinity className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span className="text-sm font-medium text-green-700 dark:text-green-300">
                    Unlimited Access
                </span>
            </div>
        );
    }

    return (
        <div className="px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {label}
                    </span>
                </div>
                <span className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">
                    {formatTime(displaySeconds)}
                </span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                    className={`h-full ${getProgressColor()} transition-all duration-300`}
                    style={{ width: `${getProgressPercentage()}%` }}
                />
            </div>

            {displaySeconds <= 60 && displaySeconds > 0 && (
                <p className="mt-2 text-xs text-amber-600 dark:text-amber-400 font-medium">
                    Less than a minute remaining!
                </p>
            )}

            {displaySeconds === 0 && (
                <p className="mt-2 text-xs text-red-600 dark:text-red-400 font-medium">
                    Daily limit reached. Upgrade for unlimited access!
                </p>
            )}
        </div>
    );
};

export default UsageTracker;
