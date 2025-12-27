import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ArrowLeft } from 'lucide-react';
import Button from '../../components/Button';

const UnauthorizedPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-8 text-center">
                    {/* Icon */}
                    <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-6">
                        <Lock className="w-10 h-10 text-red-600 dark:text-red-400" />
                    </div>

                    {/* Title */}
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">
                        Access Denied
                    </h1>

                    {/* Message */}
                    <p className="text-slate-600 dark:text-slate-400 mb-2">
                        You don't have permission to access this module.
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-500 mb-8">
                        Please contact your Superadmin to request access to this feature.
                    </p>

                    {/* Actions */}
                    <div className="flex flex-col gap-3">
                        <Button
                            variant="primary"
                            onClick={() => navigate('/admindashboard')}
                            className="w-full"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Go to Dashboard
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={() => navigate(-1)}
                            className="w-full"
                        >
                            Go Back
                        </Button>
                    </div>

                    {/* Help Text */}
                    <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                        <p className="text-xs text-slate-500 dark:text-slate-500">
                            If you believe this is an error, please contact support.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UnauthorizedPage;
