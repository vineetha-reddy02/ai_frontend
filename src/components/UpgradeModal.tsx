import React from 'react';
import { X, Crown, Check, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface UpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    reason?: 'voiceCall' | 'pronunciation' | 'general';
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose, reason = 'general' }) => {
    const navigate = useNavigate();

    if (!isOpen) return null;

    const handleUpgrade = () => {
        navigate('/subscriptions');
        onClose();
    };

    const getReasonMessage = () => {
        switch (reason) {
            case 'voiceCall':
                return "You've used your daily 5 minutes of voice calls.";
            case 'pronunciation':
                return "Your 24-hour pronunciation access has expired.";
            default:
                return "Unlock unlimited access to all features.";
        }
    };

    const features = [
        'Unlimited voice calls',
        'Unlimited pronunciation practice',
        'Access to all quizzes and topics',
        'Priority AI support',
        'Ad-free experience',
        'Advanced analytics',
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden">
                {/* Header with gradient */}
                <div className="relative bg-gradient-to-r from-yellow-500 to-amber-600 p-6 text-white">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-1 hover:bg-white/20 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                            <Crown className="w-8 h-8" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold">Upgrade to Pro</h2>
                            <p className="text-white/90 text-sm">Unlock your full potential</p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* Reason message */}
                    <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                        <p className="text-amber-900 dark:text-amber-200 text-sm font-medium">
                            {getReasonMessage()}
                        </p>
                    </div>

                    {/* Features list */}
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                            Pro Features
                        </h3>
                        <div className="space-y-3">
                            {features.map((feature, index) => (
                                <div key={index} className="flex items-start gap-3">
                                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mt-0.5">
                                        <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
                                    </div>
                                    <span className="text-slate-700 dark:text-slate-300 text-sm">
                                        {feature}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Pricing highlight */}
                    <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center gap-2 mb-1">
                            <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <span className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                                Limited Time Offer
                            </span>
                        </div>
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                            Get 20% off on annual plans
                        </p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium"
                        >
                            Maybe Later
                        </button>
                        <button
                            onClick={handleUpgrade}
                            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-yellow-500 to-amber-600 text-white rounded-lg hover:from-yellow-600 hover:to-amber-700 transition-all shadow-lg hover:shadow-xl font-medium"
                        >
                            Upgrade Now
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UpgradeModal;
