import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Star, Shield, Zap, AlertCircle, ArrowLeft } from 'lucide-react';
import Button from '../../components/Button';
import { subscriptionsService } from '../../services/subscriptions';
import { paymentsService } from '../../services/payments';
import { updateUserSubscription, setUser } from '../../store/authSlice';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { showToast } from '../../store/uiSlice';
import SwitchPlanModal from '../../components/SwitchPlanModal';
import { useSearchParams } from 'react-router-dom';
import { authService } from '../../services/auth';
import { useUsageLimits } from '../../hooks/useUsageLimits';

const UserSubscriptions: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const [plans, setPlans] = useState<any[]>([]);
    const [currentSub, setCurrentSub] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [switchModalOpen, setSwitchModalOpen] = useState(false);
    const [pendingPlan, setPendingPlan] = useState<any | null>(null);
    const [searchParams] = useSearchParams();
    const [processingSwitch, setProcessingSwitch] = useState(false);
    const { isExplicitlyCancelled } = useUsageLimits();

    useEffect(() => {
        fetchData();
        checkPaymentStatus();
    }, []);

    const checkPaymentStatus = async () => {
        console.log('🔙 ========== RETURNED FROM PAYMENT GATEWAY ==========');
        console.log('🌐 Current URL:', window.location.href);
        console.log('📍 Current Path:', window.location.pathname);
        console.log('🔍 URL Search Params:', window.location.search);

        // Get transactionId from URL params or localStorage
        let transactionId = searchParams.get('transactionId');
        let pendingPayment: any = null;

        console.log('🆔 Transaction ID from URL:', transactionId);

        if (!transactionId) {
            console.log('⚠️ No transactionId in URL, checking localStorage...');
            // Try to get from localStorage
            const stored = localStorage.getItem('pending_payment');
            console.log('📦 localStorage "pending_payment":', stored);

            if (stored) {
                try {
                    pendingPayment = JSON.parse(stored);
                    transactionId = pendingPayment.transactionId;
                    console.log('✅ Retrieved pending payment from localStorage:', pendingPayment);
                    console.log('🆔 Transaction ID from localStorage:', transactionId);
                } catch (e) {
                    console.error('❌ Failed to parse pending payment:', e);
                }
            } else {
                console.log('❌ No pending payment found in localStorage');
            }
        } else {
            console.log('✅ Transaction ID found in URL!');
            // Also load pending payment details if available
            const stored = localStorage.getItem('pending_payment');
            if (stored) {
                try {
                    pendingPayment = JSON.parse(stored);
                    console.log('📦 Also loaded pending payment details:', pendingPayment);
                } catch (e) {
                    console.error('Failed to parse pending payment:', e);
                }
            }
        }

        if (!transactionId) {
            console.log('❌ No transaction ID found anywhere, skipping payment check');
            return;
        }

        console.log('🔍 ========== STARTING PAYMENT STATUS CHECK ==========');
        console.log('🆔 Checking status for Transaction ID:', transactionId);
        console.log('💰 Expected Amount:', pendingPayment?.amount);
        console.log('📦 Expected Plan:', pendingPayment?.planName);

        dispatch(showToast({ message: 'Verifying payment status...', type: 'info' }));

        let pollAttempts = 0;
        const maxPollAttempts = 60; // Poll for up to 3 minutes (60 * 3s = 180s)
        let retryDelay = 3000; // Start with 3 seconds
        const maxRetryDelay = 24000; // Max 24 seconds
        let paymentCompleted = false;

        console.log('⏱️ Polling Configuration:', {
            maxAttempts: maxPollAttempts,
            initialDelay: '3s',
            maxDelay: '24s',
            totalTimeout: '3 minutes'
        });

        while (pollAttempts < maxPollAttempts && !paymentCompleted) {
            try {
                console.log(`\n🔄 ========== POLL ATTEMPT ${pollAttempts + 1}/${maxPollAttempts} ==========`);
                console.log('📡 Calling API: GET /api/v1/payments/' + transactionId + '/status');

                const res = await paymentsService.checkPaymentStatus(transactionId);

                console.log('📨 Raw API Response:', res);

                // Extract status from response
                const paymentData = (res as any).data || res;
                const status = paymentData?.status?.toUpperCase();

                console.log('💳 ========== PAYMENT STATUS DETAILS ==========');
                console.log('� Status:', status);
                console.log('💰 Amount:', paymentData?.amount);
                console.log('💱 Currency:', paymentData?.currency);
                console.log('📝 Description:', paymentData?.description);
                console.log('📅 Created At:', paymentData?.createdAt);
                console.log('✅ Completed At:', paymentData?.completedAt);
                console.log('❌ Failure Reason:', paymentData?.failureReason);

                if (status === 'COMPLETED' || status === 'SUCCESS') {
                    console.log('🎉 ========== PAYMENT SUCCESSFUL! ==========');
                    paymentCompleted = true;
                    dispatch(showToast({ message: 'Payment successful! Activating subscription...', type: 'success' }));

                    // Clear pending payment from localStorage
                    console.log('🗑️ Clearing localStorage...');
                    localStorage.removeItem('pending_payment');
                    console.log('✅ localStorage cleared');

                    // IMMEDIATE ACCESS: Update Global Redux State (Optimistic)
                    console.log('🔄 Updating Redux state (optimistic)...');
                    dispatch(updateUserSubscription({
                        subscriptionStatus: 'active',
                        subscriptionPlan: pendingPayment?.planName || 'Premium'
                    }));
                    console.log('✅ Redux state updated');

                    // Poll for subscription activation
                    console.log('\n🔄 ========== POLLING FOR SUBSCRIPTION ACTIVATION ==========');
                    let subAttempts = 0;
                    const maxSubAttempts = 10;
                    let subscriptionReady = false;
                    let verifiedSubData: any = null;

                    while (subAttempts < maxSubAttempts && !subscriptionReady) {
                        try {
                            console.log(`📡 Subscription check attempt ${subAttempts + 1}/${maxSubAttempts}`);
                            const subRes = await subscriptionsService.current();
                            const subData = (subRes as any)?.data || subRes;

                            console.log('📦 Subscription API Response:', {
                                status: subData?.status,
                                planName: subData?.planName || subData?.plan?.name,
                                renewalDate: subData?.renewalDate
                            });

                            if (subData && ['active', 'trialing', 'succeeded'].includes(subData.status?.toLowerCase())) {
                                subscriptionReady = true;
                                verifiedSubData = subData;
                                console.log('✅ Subscription verified and active!', subData);

                                // Update Redux with REAL data
                                dispatch(updateUserSubscription({
                                    subscriptionStatus: subData.status,
                                    subscriptionPlan: subData.plan?.name || subData.planName,
                                    trialEndDate: subData.endDate || subData.renewalDate
                                }));
                            } else {
                                console.log(`⏳ Subscription not active yet (status: ${subData?.status}), retrying...`);
                            }
                        } catch (e) {
                            console.log(`❌ Subscription check failed (attempt ${subAttempts + 1}):`, e);
                            await new Promise(resolve => setTimeout(resolve, 1000));
                        }
                        subAttempts++;
                    }

                    // Refresh User Profile
                    console.log('\n🔄 Refreshing user profile...');
                    try {
                        const profileRes = await authService.getProfile();
                        const userData = (profileRes as any).data || profileRes;
                        if (userData && userData.id) {
                            if (subscriptionReady && verifiedSubData) {
                                userData.subscriptionStatus = verifiedSubData.status;
                                userData.subscriptionPlan = verifiedSubData.plan?.name || verifiedSubData.planName;
                                userData.trialEndDate = verifiedSubData.endDate || verifiedSubData.renewalDate;
                            }
                            dispatch(setUser(userData));
                            console.log('✅ User profile refreshed');
                            console.log('📦 Updated user data:', {
                                subscriptionStatus: userData.subscriptionStatus,
                                subscriptionPlan: userData.subscriptionPlan,
                                trialEndDate: userData.trialEndDate
                            });
                        }
                    } catch (err) {
                        console.error('❌ Failed to sync profile:', err);
                    }

                    // Force token refresh by re-logging in
                    console.log('\n🔄 Forcing token refresh...');
                    try {
                        // Get fresh token with updated subscription claims
                        const token = localStorage.getItem('token');
                        if (token) {
                            // The token will be refreshed on next API call
                            console.log('✅ Token will be refreshed on next request');
                        }
                    } catch (err) {
                        console.error('❌ Token refresh failed:', err);
                    }

                    // Show success message
                    dispatch(showToast({
                        message: 'Subscription activated successfully! Redirecting...',
                        type: 'success'
                    }));

                    // Wait a moment for state updates to propagate
                    await new Promise(resolve => setTimeout(resolve, 1000));

                    // Navigate to Profile
                    console.log('\n🏠 ========== NAVIGATING TO PROFILE ==========');
                    console.log('📍 Target URL: /profile');
                    console.log('🎯 Navigation State:', {
                        justSubscribed: true,
                        transactionId: transactionId
                    });

                    // Force a full page reload to ensure fresh data
                    console.log('🔄 Forcing page reload to refresh all data...');
                    window.location.href = '/profile';

                    console.log('✅ ========== PAYMENT FLOW COMPLETED ==========\n');
                    return; // Exit polling loop

                } else if (status === 'FAILED') {
                    console.log('❌ ========== PAYMENT FAILED ==========');
                    console.log('Failure Reason:', paymentData?.failureReason);
                    paymentCompleted = true;
                    localStorage.removeItem('pending_payment');
                    dispatch(showToast({ message: 'Payment failed. Please try again.', type: 'error' }));
                    return;

                } else if (status === 'PENDING') {
                    // Continue polling
                    console.log(`⏳ Payment still pending, will retry in ${retryDelay / 1000}s...`);
                    await new Promise(resolve => setTimeout(resolve, retryDelay));

                } else {
                    console.log('❓ Unknown payment status:', status);
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                }

                // Reset retry delay on successful API call
                retryDelay = 3000;

            } catch (error: any) {
                console.error('❌ ========== PAYMENT STATUS CHECK ERROR ==========');
                console.error('Error:', error);
                console.error('Error Message:', error.message);

                // Exponential backoff for network errors
                if (error.message?.includes('Network') || error.message?.includes('fetch')) {
                    console.log(`🔌 Network error detected, retrying in ${retryDelay / 1000}s...`);
                    dispatch(showToast({
                        message: `Network error. Retrying in ${retryDelay / 1000}s...`,
                        type: 'warning'
                    }));

                    await new Promise(resolve => setTimeout(resolve, retryDelay));

                    // Exponential backoff: 3s → 6s → 12s → 24s
                    retryDelay = Math.min(retryDelay * 2, maxRetryDelay);
                    console.log(`📈 Increased retry delay to ${retryDelay / 1000}s`);
                } else {
                    // Other errors, wait standard delay
                    console.log(`⏱️ Waiting 3s before retry...`);
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }
            }

            pollAttempts++;
        }

        // If we exit the loop without completion
        if (!paymentCompleted) {
            console.log('⏱️ ========== PAYMENT VERIFICATION TIMEOUT ==========');
            console.log(`Stopped after ${pollAttempts} attempts`);
            dispatch(showToast({
                message: 'Payment verification timed out. Please check your subscription status.',
                type: 'warning'
            }));
        }
    };
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
        // If user has an active subscription, confirm switch
        const isSubActive = ['active', 'trialing', 'succeeded', 'year'].includes(currentSub?.status?.toLowerCase());

        if (currentSub && isSubActive) {
            setPendingPlan(plan);
            setSwitchModalOpen(true);
            return;
        }

        // Otherwise proceed directly
        await processSubscription(plan);
    };

    const handleConfirmSwitch = async () => {
        if (!pendingPlan) return;
        setProcessingSwitch(true);
        try {
            // 1. Cancel current subscription
            // Fix: Use subscriptionId from API response (fallback to id if needed)
            const subIdToCancel = currentSub?.subscriptionId || currentSub?.id;

            if (subIdToCancel) {
                await subscriptionsService.cancel({
                    subscriptionId: subIdToCancel,
                    reason: `Switching to ${pendingPlan.name}`
                });
            } else if (['active', 'trialing'].includes(currentSub?.status?.toLowerCase())) {
                console.warn("Could not find subscription ID to cancel, but status is active.");
            }

            // 2. Subscribe to new plan
            await processSubscription(pendingPlan);

            setSwitchModalOpen(false);
        } catch (error) {
            console.error('Switch plan failed:', error);
            dispatch(showToast({ message: 'Failed to switch plan. Please contact support.', type: 'error' }));
        } finally {
            setProcessingSwitch(false);
        }
    };

    const processSubscription = async (plan: any) => {
        try {
            console.log('🚀 ========== PAYMENT FLOW STARTED ==========');
            console.log('📋 Plan Details:', {
                planId: plan.id || plan._id,
                planName: plan.name,
                price: plan.price,
                interval: plan.interval
            });

            dispatch(showToast({ message: 'Initiating subscription...', type: 'info' }));

            const response = await subscriptionsService.subscribe({
                planId: plan.id || plan._id,
                userPhone: user?.phoneNumber,
            });

            console.log('📨 Raw Subscribe API Response:', response);

            // Extract data from response
            const responseData = (response as any).data || response;
            const redirectUrl = responseData.redirectUrl;
            const transactionId = responseData.transactionId; // Format: "019b2603-06ab-791c-a9ac-6142ede7ba02"

            console.log('📝 ========== SUBSCRIBE RESPONSE DETAILS ==========');
            console.log('🆔 Transaction ID:', transactionId);
            console.log('🔗 Redirect URL:', redirectUrl);
            console.log('💰 Amount Charged:', responseData.amountCharged);
            console.log('📦 Plan Name:', responseData.planName);
            console.log('📅 Start Date:', responseData.startDate);
            console.log('📅 Renewal Date:', responseData.renewalDate);
            console.log('🔄 Status:', responseData.status);
            console.log('💳 Requires Payment:', responseData.requiresPayment);

            // Store transaction info in localStorage BEFORE redirecting
            if (transactionId) {
                const pendingPayment = {
                    transactionId,
                    planId: plan.id || plan._id,
                    planName: responseData.planName || plan.name,
                    amount: responseData.amountCharged,
                    timestamp: Date.now()
                };

                console.log('💾 ========== STORING IN LOCALSTORAGE ==========');
                console.log('📦 Pending Payment Object:', pendingPayment);
                localStorage.setItem('pending_payment', JSON.stringify(pendingPayment));
                console.log('✅ Stored in localStorage with key: "pending_payment"');

                // Verify storage
                const stored = localStorage.getItem('pending_payment');
                console.log('🔍 Verification - Retrieved from localStorage:', stored);
            } else {
                console.warn('⚠️ No transactionId found in response!');
            }

            // Redirect to payment gateway if URL provided
            if (redirectUrl) {
                console.log('🌐 ========== REDIRECTING TO PAYMENT GATEWAY ==========');
                console.log('🔗 Full Redirect URL:', redirectUrl);
                console.log('🆔 Transaction ID being used:', transactionId);
                console.log('🏠 Will return to:', `${window.location.origin}/subscriptions?transactionId=${transactionId}`);
                console.log('⏰ Redirect happening in 3...2...1...');

                // Redirect to payment gateway
                window.location.href = redirectUrl;
                return;
            }

            console.log('ℹ️ No redirect URL - subscription activated immediately (free trial)');

            // If no redirect URL, subscription is activated immediately (free trial)
            dispatch(showToast({ message: 'Subscription activated successfully!', type: 'success' }));

            // Refresh data
            await fetchData();

            // Update Global Redux State
            dispatch(updateUserSubscription({
                subscriptionStatus: 'active',
                subscriptionPlan: plan.name || 'Pro',
            }));

        } catch (e) {
            console.error('❌ ========== SUBSCRIPTION ERROR ==========');
            console.error('Error details:', e);
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
                            Current Plan: <span className="text-primary-600">{currentSub.planName || currentSub.plan?.name || 'Free Trial'}</span>
                        </h3>
                        <p className="text-sm text-slate-500">
                            {['active', 'trialing', 'succeeded', 'year'].includes(currentSub.status?.toLowerCase()) ? 'Active' : 'Expired'} • Renews on {new Date(currentSub.endDate || currentSub.renewalDate).toLocaleDateString()}
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

                        // Logic to check if this is the user's current valid plan
                        // Robust ID check: handle flat planId or nested plan.id
                        const currentPlanId = currentSub?.planId || currentSub?.plan?.id || currentSub?.plan?._id;
                        const thisPlanId = plan.id || plan._id;

                        // Fallback to Name match if IDs don't match (useful for dev/test data inconsistencies)
                        // If planName specific property is missing, check if it's explicitly a free trial
                        const currentPlanName = currentSub?.planName || currentSub?.plan?.name;
                        const isFreeTrial = currentSub?.isFreeTrial; // Check explicitly for free trial flag

                        let isNameMatch = false;
                        if (currentPlanName && plan.name) {
                            isNameMatch = currentPlanName.toLowerCase() === plan.name.toLowerCase();
                        } else if (isFreeTrial && plan.name?.toLowerCase().includes('free trial')) {
                            // If no name but IS free trial, match the "Free Trial" plan
                            isNameMatch = true;
                        }

                        // Debug log to help identify why match fails
                        // console.log('Plan Match Debug:', { ... });

                        const isCurrentPlan = currentPlanId === thisPlanId || isNameMatch;
                        const isSubActive = ['active', 'trialing', 'succeeded', 'year'].includes(currentSub?.status?.toLowerCase());
                        const isLocked = isCurrentPlan && isSubActive;

                        return (
                            <div key={plan.id || plan._id} className={`relative rounded-2xl p-6 transition-all duration-300 flex flex-col h-full ${isYearlyPlan
                                ? 'border-2 border-blue-500 bg-gradient-to-br from-blue-50 via-blue-50/50 to-white dark:from-blue-950/40 dark:via-blue-900/20 dark:to-slate-800 shadow-[0_10px_40px_rgba(59,130,246,0.2)]'
                                : isLocked
                                    // Current Plan Style: Green/Primary border, glowing effect, slightly raised
                                    ? 'border-2 border-green-500 ring-4 ring-green-500/10 dark:ring-green-500/20 bg-green-50/30 dark:bg-green-900/10 shadow-xl scale-[1.02] z-10'
                                    // Default Style
                                    : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:shadow-xl hover:-translate-y-1'
                                }`}>

                                {/* Badge for Current Active Plan */}
                                {isLocked && (
                                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-green-600 text-white text-sm font-bold px-4 py-1.5 rounded-full shadow-lg flex items-center gap-2 z-20 whitespace-nowrap">
                                        <Check size={14} className="stroke-[3]" />
                                        <span>Active Plan</span>
                                    </div>
                                )}

                                {/* Popular Badge for Yearly Plan (Hide if it's also the current plan to avoid badge overlap, or offset it) */}
                                {isYearlyPlan && !isLocked && (
                                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white text-sm font-bold px-5 py-2 rounded-full shadow-xl flex items-center gap-2 z-10">
                                        <Star size={16} className="fill-white" />
                                        <span>Popular Plan</span>
                                    </div>
                                )}

                                <div className="mt-2"> {/* Spacer for badges */}
                                    <h4 className={`text-lg font-bold mb-2 ${isYearlyPlan ? 'text-blue-900 dark:text-blue-100' : isLocked ? 'text-green-900 dark:text-green-100' : 'text-slate-900 dark:text-white'}`}>
                                        {plan.name}
                                    </h4>
                                </div>
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

                                {(() => {
                                    // Determine Button Text & State
                                    let buttonText = isLocked ? 'Current Plan' : isCurrentPlan ? 'Renew Plan' : 'Choose Plan';
                                    let isDisabled = isLocked;

                                    // Special Handling for Free Trial Plan
                                    // If name matches "Free", and user is strictly locked out (cancelled/expired), mark as used/expired
                                    const isFreePlanCard = plan.name?.toLowerCase().includes('free');

                                    // Robust check: Use isExplicitlyCancelled from hook OR direct status check
                                    const isPlanUsed = isFreePlanCard && (
                                        isExplicitlyCancelled ||
                                        (!isSubActive && (user?.subscriptionStatus === 'cancelled' || user?.subscriptionStatus === 'expired'))
                                    );

                                    if (isPlanUsed) {
                                        buttonText = 'Plan Used';
                                        // User requested it to be clickable and show a popup
                                        isDisabled = false;
                                    }

                                    return (
                                        <Button
                                            variant={isLocked ? 'outline' : isYearlyPlan ? 'primary' : 'primary'}
                                            className={`w-full mt-auto ${isYearlyPlan && !isLocked ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg' : ''}`}
                                            disabled={isDisabled}
                                            onClick={() => {
                                                if (isPlanUsed) {
                                                    dispatch(showToast({
                                                        message: "You have already used your Free Trial. Please choose a premium plan to continue.",
                                                        type: "warning"
                                                    }));
                                                    return;
                                                }
                                                handleSubscribe(plan);
                                            }}
                                        >
                                            {buttonText}
                                        </Button>
                                    );
                                })()}
                            </div>
                        )
                    }) : (
                        <div className="col-span-full py-12 text-center bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                            <p className="text-slate-500">No subscription plans available right now.</p>
                        </div>
                    )}
                </div>
            </div>


            {/* Switch Plan Modal */}
            <SwitchPlanModal
                isOpen={switchModalOpen}
                onClose={() => setSwitchModalOpen(false)}
                currentPlanName={currentSub?.planName || currentSub?.plan?.name || 'Current Plan'}
                newPlanName={pendingPlan?.name || 'New Plan'}
                onConfirm={handleConfirmSwitch}
                isLoading={processingSwitch}
            />
        </div >
    );
};

export default UserSubscriptions;

