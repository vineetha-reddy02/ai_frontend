import React, { useState } from 'react';
import { AlertTriangle, ArrowRight, X } from 'lucide-react';
import Button from './Button';

interface SwitchPlanModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentPlanName: string;
    newPlanName: string;
    onConfirm: () => Promise<void>;
    isLoading?: boolean;
}

const SwitchPlanModal: React.FC<SwitchPlanModalProps> = ({
    isOpen,
    onClose,
    currentPlanName,
    newPlanName,
    onConfirm,
    isLoading
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
                <div className="flex justify-between items-start mb-6">
                    <div className="flex gap-4">
                        <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-full text-amber-600 dark:text-amber-400">
                            <AlertTriangle size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Switch Subscription</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Please confirm your changes</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-500">
                        <X size={20} />
                    </button>
                </div>

                <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between text-sm">
                        <div className="flex flex-col">
                            <span className="text-slate-500 mb-1">Current Plan</span>
                            <span className="font-semibold text-slate-900 dark:text-white line-through decoration-red-500 decoration-2">{currentPlanName}</span>
                        </div>
                        <ArrowRight size={16} className="text-slate-400" />
                        <div className="flex flex-col text-right">
                            <span className="text-slate-500 mb-1">New Plan</span>
                            <span className="font-semibold text-blue-600 dark:text-blue-400">{newPlanName}</span>
                        </div>
                    </div>
                </div>

                <p className="text-slate-600 dark:text-slate-300 text-sm mb-6 leading-relaxed">
                    To subscribe to the <strong>{newPlanName}</strong>, we need to cancel your current <strong>{currentPlanName}</strong> subscription first. This action happens automatically when you confirm.
                </p>

                <div className="flex gap-3">
                    <Button
                        variant="ghost"
                        className="flex-1"
                        onClick={onClose}
                        disabled={isLoading}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
                        onClick={onConfirm}
                        isLoading={isLoading}
                    >
                        Confirm & Switch
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default SwitchPlanModal;
