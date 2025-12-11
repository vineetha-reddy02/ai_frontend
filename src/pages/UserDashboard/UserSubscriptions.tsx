import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Star, Shield, Zap, AlertCircle, ArrowLeft } from 'lucide-react';
import Button from '../../components/Button';
import { subscriptionsService } from '../../services/subscriptions';
import { paymentsService } from '../../services/payments';
import { updateUserSubscription } from '../../store/authSlice';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { showToast } from '../../store/uiSlice';

const UserSubscriptions: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const [plans, setPlans] = useState<any[]>([]);
    const [currentSub, setCurrentSub] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [plansRes, subRes] = await Promise.all([
                subscriptionsService.getPlans(),
                subscriptionsService.current().catch(() => null) // Handle 404 if no sub
            ]);

            const planList = (plansRes as any)?.data || (Array.isArray(plansRes) ? plansRes : (plansRes as any)?.items) || [];
            setPlans(planList);
            setCurrentSub((subRes as any)?.data || subRes);
        } catch (error) {
            console.error('Failed to load subscriptions:', error);
            // dispatch(showToast({ message: 'Failed to load subscription info', type: 'error' }));
        } finally {
            setLoading(false);
        }
    };

    const handleSubscribe = async (plan: any) => {
        try {
            dispatch(showToast({ message: 'Processing subscription...', type: 'info' }));

            // Direct subscription without payment gateway
            await subscriptionsService.subscribe({
                planId: plan.id || plan._id,
                useFreeTrial: true,
                paymentMethodId: "pm_card_visa", // Keep as fallback
                userPhone: user?.phoneNumber || "9999999999"
            });

            dispatch(showToast({ message: 'Subscription activated successfully!', type: 'success' }));

            // Refresh data
            await fetchData();

            // Update Global Redux State to unlock features immediately
            dispatch(updateUserSubscription({
                subscriptionStatus: 'active',
                subscriptionPlan: plan.name || 'Pro',
                // We could also parse the expiry date from the response if we had it, but status is key
            }));

        } catch (e) {
            console.error('Subscription error:', e);
            dispatch(showToast({ message: 'Failed to activate subscription. Please try again.', type: 'error' }));
        }
    };

    if (loading) return <div className="text-center py-12 text-slate-500">Loading plans...</div>;

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 rounded-full transition-colors text-blue-600 dark:text-blue-400"
                >
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Subscriptions</h1>
            </div>
            {/* Current Plan Status */}
            {currentSub && (
                <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-6 flex justify-between items-center">
                    <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                            Current Plan: <span className="text-primary-600">{currentSub.planName || 'Free Trial'}</span>
                        </h3>
                        <p className="text-sm text-slate-500">
                            {currentSub.status === 'active' ? 'Active' : 'Expired'} • Renews on {new Date(currentSub.endDate).toLocaleDateString()}
                        </p>
                    </div>
                    <Button variant="outline" size="sm">Manage Subscription</Button>
                </div>
            )}

            {/* Plans Grid */}
            <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Available Plans</h3>
                <div className="grid md:grid-cols-3 gap-6">
                    {plans.length > 0 ? plans.map((plan) => {
                        // Check if this is the Yearly Plan
                        const isYearlyPlan = plan.name?.toLowerCase().includes('yearly') || plan.interval?.toLowerCase() === 'year';

                        return (
                            <div key={plan.id || plan._id} className={`relative rounded-2xl p-6 transition-all hover:shadow-2xl flex flex-col h-full ${isYearlyPlan
                                ? 'border-2 border-blue-500 bg-gradient-to-br from-blue-50 via-blue-50/50 to-white dark:from-blue-950/40 dark:via-blue-900/20 dark:to-slate-800 shadow-[0_10px_40px_rgba(59,130,246,0.4)] dark:shadow-[0_10px_40px_rgba(59,130,246,0.3)]'
                                : currentSub?.planId === (plan.id || plan._id)
                                    ? 'border border-primary-500 ring-2 ring-primary-100 dark:ring-primary-900/30 bg-white dark:bg-slate-800'
                                    : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                                }`}>
                                {/* Popular Badge for Yearly Plan */}
                                {isYearlyPlan && (
                                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white text-sm font-bold px-5 py-2 rounded-full shadow-xl flex items-center gap-2 z-10">
                                        <Star size={16} className="fill-white" />
                                        <span>Popular Plan</span>
                                    </div>
                                )}

                                <h4 className={`text-lg font-bold mb-2 ${isYearlyPlan ? 'text-blue-900 dark:text-blue-100 mt-2' : 'text-slate-900 dark:text-white'}`}>
                                    {plan.name}
                                </h4>
                                <div className="flex items-baseline mb-4">
                                    <span className={`text-3xl font-bold ${isYearlyPlan ? 'text-blue-900 dark:text-blue-100' : 'text-slate-900 dark:text-white'}`}>
                                        ₹{plan.price}
                                    </span>
                                    <span className={`text-sm ${isYearlyPlan ? 'text-blue-700 dark:text-blue-300' : 'text-slate-500'}`}>
                                        /{plan.interval || 'month'}
                                    </span>
                                </div>

                                <p className={`text-sm mb-6 min-h-[40px] ${isYearlyPlan ? 'text-blue-800 dark:text-blue-200' : 'text-slate-600 dark:text-slate-400'}`}>
                                    {plan.description}
                                </p>

                                <ul className="space-y-3 mb-8 flex-1">
                                    {plan.features && Object.keys(plan.features).length > 0 ? (
                                        Object.entries(plan.features)
                                            .map(([key, value]: [string, any], i: number) => {
                                                // 1. Check Key Names
                                                const lowerKey = key.toLowerCase();
                                                if (['priority', '_id', 'createdat', 'updatedat', '__v', 'id', 'subscriptions'].includes(lowerKey)) return null;

                                                // 2. Resolve Display Value
                                                let displayValue = typeof value === 'string' ? value : (value?.value || value?.text);

                                                // 3. Check Resolved Value
                                                if (!displayValue) return null;
                                                if (typeof displayValue !== 'string') {
                                                    if (typeof displayValue === 'number' || typeof displayValue === 'boolean') return null;
                                                    displayValue = String(displayValue);
                                                }

                                                // 4. Content Checks
                                                const lowerVal = displayValue.toLowerCase().trim();
                                                if (lowerVal === 'true' || lowerVal === 'false') return null;
                                                if (!isNaN(Number(displayValue))) return null;

                                                return (
                                                    <li key={i} className={`flex items-start gap-3 text-sm ${isYearlyPlan ? 'text-blue-800 dark:text-blue-200' : 'text-slate-600 dark:text-slate-300'}`}>
                                                        <Check size={16} className={`mt-0.5 flex-shrink-0 ${isYearlyPlan ? 'text-blue-600' : 'text-green-500'}`} />
                                                        <span>{displayValue}</span>
                                                    </li>
                                                );
                                            })
                                    ) : (
                                        <li className="text-sm text-slate-500 italic">No features listed</li>
                                    )}
                                </ul>

                                <Button
                                    variant={currentSub?.planId === (plan.id || plan._id) ? 'outline' : isYearlyPlan ? 'primary' : 'primary'}
                                    className={`w-full mt-auto ${isYearlyPlan ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg' : ''}`}
                                    disabled={currentSub?.planId === (plan.id || plan._id)}
                                    onClick={() => handleSubscribe(plan)}
                                >
                                    {currentSub?.planId === (plan.id || plan._id) ? 'Current Plan' : 'Choose Plan'}
                                </Button>
                            </div>
                        )
                    }) : (
                        <div className="col-span-full py-12 text-center bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                            <p className="text-slate-500">No subscription plans available right now.</p>
                        </div>
                    )}
                </div>
            </div>


        </div >
    );
};

export default UserSubscriptions;

