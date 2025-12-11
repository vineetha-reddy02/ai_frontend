import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Crown } from 'lucide-react';

interface SubscriptionLockProps {
    title?: string;
    description?: string;
}

const SubscriptionLock: React.FC<SubscriptionLockProps> = ({
    title = "Subscription Required",
    description = "Your free trial has ended. Please upgrade to a subscription plan to continue accessing this feature."
}) => {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mb-6 shadow-lg">
                <Lock className="w-8 h-8 text-white" />
            </div>

            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
                {title}
            </h3>

            <p className="text-slate-600 dark:text-slate-400 max-w-md mb-8">
                {description}
            </p>

            <button
                onClick={() => navigate('/subscriptions')}
                className="group relative inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold shadow-md hover:shadow-xl hover:scale-105 transition-all duration-200"
            >
                <Crown className="w-5 h-5" />
                <span>Upgrade to Subscription</span>
                <div className="absolute inset-0 rounded-xl ring-2 ring-white/20 group-hover:ring-white/40 transition-all" />
            </button>
        </div>
    );
};

export default SubscriptionLock;
