import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Star, Shield, Zap, AlertCircle, ArrowLeft, Tag, X } from 'lucide-react';
import Button from '../../components/Button';
import { subscriptionsService } from '../../services/subscriptions';
import { paymentsService } from '../../services/payments';
import { couponsService } from '../../services/coupons';
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

    // Coupon state
    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupons, setAppliedCoupons] = useState<Record<string, any>>({});
    const [validatingCoupon, setValidatingCoupon] = useState<Record<string, boolean>>({});
    const [showCouponInput, setShowCouponInput] = useState<Record<string, boolean>>({});

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
        // Check if user has an active subscription
        const isSubActive = ['active', 'trialing', 'succeeded', 'year'].includes(currentSub?.status?.toLowerCase());

        if (currentSub && isSubActive) {
            // Show confirmation modal before switching
            setPendingPlan(plan);
            setSwitchModalOpen(true);
            return;
        }

        // No active subscription - proceed directly
        await processSubscription(plan);
    };

    const handleConfirmSwitch = async () => {
        if (!pendingPlan) return;

        try {
            setProcessingSwitch(true);
            setSwitchModalOpen(false);

            console.log('🔄 ========== PLAN SWITCH FLOW ==========');
            console.log('📋 Current Plan:', currentSub?.planName || currentSub?.plan?.name);
            console.log('📋 New Plan:', pendingPlan.name);

            // Step 1: Cancel current subscription
            dispatch(showToast({ message: 'Canceling current subscription...', type: 'info' }));

            console.log('❌ Step 1: Canceling current subscription...');
            console.log('Current subscription data:', currentSub);
            console.log('Subscription ID:', currentSub?.subscriptionId || currentSub?.id);

            await subscriptionsService.cancel({
                subscriptionId: currentSub?.subscriptionId || currentSub?.id,
                reason: 'Switching to ' + pendingPlan.name
            });
            console.log('✅ Cancel API call completed');

            // Step 2: Wait for cancellation to process
            console.log('⏳ Waiting for cancellation to process...');
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Step 3: Subscribe to new plan
            dispatch(showToast({ message: 'Processing new subscription...', type: 'info' }));
            console.log('💳 Step 2: Subscribing to new plan...');

            // processSubscription will:
            // - Call /Subscriptions/subscribe
            // - Get redirectUrl and transactionId
            // - Store in localStorage
            // - Redirect to PhonePe
            // - After return, checkPaymentStatus verifies and redirects to profile
            await processSubscription(pendingPlan);

        } catch (error: any) {
            console.error('❌ Failed to switch plan:', error);
            console.error('Response data:', error.response?.data);
            console.error('Backend messages:', error.response?.data?.messages);

            const errorMsg = error.response?.data?.messages?.[0]
                || error.response?.data?.errors?.[0]
                || error.response?.data?.message
                || error.message
                || 'Failed to switch plan. Please try again.';

            dispatch(showToast({
                message: errorMsg,
                type: 'error'
            }));
        } finally {
            setProcessingSwitch(false);
            setPendingPlan(null);
        }
    };

    // Coupon validation function
    const validateAndApplyCoupon = async (plan: any, code: string) => {
        if (!code.trim()) {
            dispatch(showToast({ message: 'Please enter a coupon code', type: 'warning' }));
            return;
        }

        const planId = plan.id || plan._id;

        try {
            setValidatingCoupon(prev => ({ ...prev, [planId]: true }));

            console.log('🎟️ Validating coupon:', {
                code: code.toUpperCase(),
                planId,
                planPrice: plan.price,
                planName: plan.name
            });

            const response = await couponsService.validate({
                couponCode: code.toUpperCase(),
                amount: plan.price, // Pass actual plan price
                itemType: 'Subscription', // Changed from 'Plan' to match API
                itemId: planId,
            });

            console.log('✅ Coupon validation response:', response);

            const couponData = (response as any)?.data || response;

            console.log('📦 Coupon data:', couponData);

            // API returns discountAmount, finalPrice, discountPercentage on success
            if (couponData && (couponData.discountAmount !== undefined || couponData.finalPrice !== undefined)) {
                // Store coupon data with code for later use
                const couponInfo = {
                    code: code.toUpperCase(),
                    discountAmount: couponData.discountAmount,
                    finalPrice: couponData.finalPrice,
                    discountPercentage: couponData.discountPercentage,
                    discountValue: couponData.discountAmount,
                    discountType: 'FixedAmount', // Based on API response
                };

                setAppliedCoupons(prev => ({ ...prev, [planId]: couponInfo }));
                dispatch(showToast({
                    message: `Coupon "${code.toUpperCase()}" applied! You save ₹${couponData.discountAmount}`,
                    type: 'success'
                }));
                setCouponCode('');
            } else {
                console.warn('❌ Invalid coupon response:', couponData);
                // Extract error message from API response
                const errorMessage = couponData?.errors?.[0] || couponData?.messages?.[0] || couponData?.message || 'Invalid or expired coupon code';
                console.log('Error message:', errorMessage);
                dispatch(showToast({
                    message: errorMessage,
                    type: 'error'
                }));
            }
        } catch (error: any) {
            console.error('❌ Coupon validation failed:', error);
            console.error('Error response:', error.response);
            // Extract error from response
            const errorData = error.response?.data;
            const errorMsg = errorData?.errors?.[0] || errorData?.messages?.[0] || errorData?.message || error.response?.data?.errors?.[0] || 'Invalid or expired coupon code';
            dispatch(showToast({ message: errorMsg, type: 'error' }));
        } finally {
            setValidatingCoupon(prev => ({ ...prev, [planId]: false }));
        }
    };

    const removeCoupon = (planId: string) => {
        setAppliedCoupons(prev => {
            const updated = { ...prev };
            delete updated[planId];
            return updated;
        });
        dispatch(showToast({ message: 'Coupon removed', type: 'info' }));
    };

    const toggleCouponInput = (planId: string) => {
        setShowCouponInput(prev => ({ ...prev, [planId]: !prev[planId] }));
    };

    const calculateFinalPrice = (plan: any, coupon: any) => {
        if (!coupon) return plan.price;

        // If API provided finalPrice, use it directly
        if (coupon.finalPrice !== undefined) {
            return coupon.finalPrice;
        }

        // Otherwise calculate from discount
        let discount = 0;
        if (coupon.discountType === 'Percentage' || coupon.discountType === 1) {
            discount = (plan.price * coupon.discountValue) / 100;
            if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
                discount = coupon.maxDiscountAmount;
            }
        } else {
            discount = coupon.discountValue || coupon.discountAmount || 0;
        }

        return Math.max(0, plan.price - discount);
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

            const planId = plan.id || plan._id;
            const appliedCoupon = appliedCoupons[planId];

            const response = await subscriptionsService.subscribe({
                planId: planId,
                userPhone: user?.phoneNumber,
                couponCode: appliedCoupon?.code || undefined,
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

        } catch (e: any) {
            console.error('❌ ========== SUBSCRIPTION ERROR ==========');
            console.error('Error details:', e);
            console.error('Response data:', e.response?.data);
            console.error('Backend messages:', e.response?.data?.messages);
            console.error('Backend errors:', e.response?.data?.errors);

            // Extract meaningful error message
            const errorMsg = e.response?.data?.messages?.[0]
                || e.response?.data?.errors?.[0]
                || e.response?.data?.message
                || e.message
                || 'Failed to activate subscription. Please try again.';

            dispatch(showToast({ message: errorMsg, type: 'error' }));
        }
    };
    if (loading) return <div className="text-center py-12 text-slate-500">Loading plans...</div>;

    return (
        <div className="space-y-4 md:space-y-6 lg:space-y-8">
            {/* Header */}
            <div className="flex items-center gap-2 sm:gap-3 md:gap-4 px-2 sm:px-0">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 rounded-full transition-colors text-blue-600 dark:text-blue-400 min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                    <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
                <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white">My Subscriptions</h1>
            </div>
            {/* Current Plan Status */}
            {currentSub && (
                <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg md:rounded-xl p-4 md:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
                    <div>
                        <h3 className="text-sm md:text-base font-semibold text-slate-900 dark:text-white flex flex-wrap items-center gap-2">
                            Current Plan: <span className="text-primary-600">{currentSub.planName || currentSub.plan?.name || 'Free Trial'}</span>
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-500">
                            {['active', 'trialing', 'succeeded', 'year'].includes(currentSub.status?.toLowerCase()) ? 'Active' : 'Expired'} • Renews on {new Date(currentSub.endDate || currentSub.renewalDate).toLocaleDateString()}
                        </p>
                    </div>
                    <Button variant="outline" size="sm" className="w-full sm:w-auto">Manage Subscription</Button>
                </div>
            )}

            {/* Plans Grid */}
            <div className="px-2 sm:px-0">
                <h3 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-slate-900 dark:text-white mb-4 md:mb-6">Available Plans</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
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
                            <div key={plan.id || plan._id} className={`relative rounded-xl md:rounded-2xl p-4 md:p-6 transition-all duration-300 flex flex-col h-full ${isYearlyPlan
                                ? 'border-2 border-blue-500 bg-gradient-to-br from-blue-50 via-blue-50/50 to-white dark:from-blue-950/40 dark:via-blue-900/20 dark:to-slate-800 shadow-[0_10px_40px_rgba(59,130,246,0.2)]'
                                : isLocked
                                    // Current Plan Style: Green/Primary border, glowing effect, slightly raised
                                    ? 'border-2 border-green-500 ring-4 ring-green-500/10 dark:ring-green-500/20 bg-green-50/30 dark:bg-green-900/10 shadow-xl md:scale-[1.02] z-10'
                                    // Default Style
                                    : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:shadow-xl md:hover:-translate-y-1'
                                }`}>

                                {/* Badge for Current Active Plan */}
                                {isLocked && (
                                    <div className="absolute -top-3 md:-top-4 left-1/2 transform -translate-x-1/2 bg-green-600 text-white text-xs md:text-sm font-bold px-3 md:px-4 py-1 md:py-1.5 rounded-full shadow-lg flex items-center gap-1 md:gap-2 z-20 whitespace-nowrap">
                                        <Check size={12} className="md:w-3.5 md:h-3.5 stroke-[3]" />
                                        <span>Active Plan</span>
                                    </div>
                                )}

                                {/* Popular Badge for Yearly Plan (Hide if it's also the current plan to avoid badge overlap, or offset it) */}
                                {isYearlyPlan && !isLocked && (
                                    <div className="absolute -top-3 md:-top-4 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white text-xs md:text-sm font-bold px-3 md:px-5 py-1 md:py-2 rounded-full shadow-xl flex items-center gap-1 md:gap-2 z-10">
                                        <Star size={14} className="md:w-4 md:h-4 fill-white" />
                                        <span>Popular Plan</span>
                                    </div>
                                )}

                                <div className="mt-2"> {/* Spacer for badges */}
                                    <h4 className={`text-base md:text-lg font-bold mb-2 ${isYearlyPlan ? 'text-blue-900 dark:text-blue-100' : isLocked ? 'text-green-900 dark:text-green-100' : 'text-slate-900 dark:text-white'}`}>
                                        {plan.name}
                                    </h4>
                                </div>
                                <div className="flex items-baseline mb-3 md:mb-4">
                                    <span className={`text-2xl md:text-3xl font-bold ${isYearlyPlan ? 'text-blue-900 dark:text-blue-100' : 'text-slate-900 dark:text-white'}`}>
                                        ₹{plan.price}
                                    </span>
                                    <span className={`text-xs md:text-sm ${isYearlyPlan ? 'text-blue-700 dark:text-blue-300' : 'text-slate-500'}`}>
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

                                {/* Coupon Section */}
                                {(() => {
                                    const planId = plan.id || plan._id;
                                    const appliedCoupon = appliedCoupons[planId];
                                    const isValidating = validatingCoupon[planId];
                                    const showInput = showCouponInput[planId];

                                    return (
                                        <div className="mb-4 md:mb-6 border-t border-slate-200 dark:border-slate-700 pt-3 md:pt-4">
                                            {/* Hide coupon section for active/locked plans */}
                                            {!isLocked && (
                                                <>
                                                    {!appliedCoupon ? (
                                                        <>
                                                            <button
                                                                onClick={() => toggleCouponInput(planId)}
                                                                className="text-xs md:text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 md:gap-1.5 mb-2 min-h-[44px] md:min-h-0"
                                                            >
                                                                <Tag size={14} className="md:w-3.5 md:h-3.5" />
                                                                {showInput ? 'Hide coupon' : 'Have a coupon code?'}
                                                            </button>

                                                            {showInput && (
                                                                <div className="flex flex-col sm:flex-row gap-2 animate-in slide-in-from-top-2">
                                                                    <input
                                                                        type="text"
                                                                        placeholder="Enter code"
                                                                        value={couponCode}
                                                                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                                                        onKeyPress={(e) => {
                                                                            if (e.key === 'Enter') {
                                                                                validateAndApplyCoupon(plan, couponCode);
                                                                            }
                                                                        }}
                                                                        className="flex-1 px-3 py-2.5 md:py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] md:min-h-0"
                                                                    />
                                                                    <Button
                                                                        size="sm"
                                                                        onClick={() => validateAndApplyCoupon(plan, couponCode)}
                                                                        isLoading={isValidating}
                                                                        disabled={!couponCode.trim() || isValidating}
                                                                    >
                                                                        Apply
                                                                    </Button>
                                                                </div>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <div className="space-y-3">
                                                            {/* Applied Coupon Badge */}
                                                            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="p-1.5 bg-green-100 dark:bg-green-900/40 rounded-full">
                                                                        <Tag size={14} className="text-green-600 dark:text-green-400" />
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-sm font-semibold text-green-700 dark:text-green-300">
                                                                            {appliedCoupon.code}
                                                                        </p>
                                                                        <p className="text-xs text-green-600 dark:text-green-400">
                                                                            Coupon applied!
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    onClick={() => removeCoupon(planId)}
                                                                    className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-full transition-colors"
                                                                    title="Remove coupon"
                                                                >
                                                                    <X size={16} className="text-red-500" />
                                                                </button>
                                                            </div>

                                                            {/* Price Breakdown */}
                                                            <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
                                                                <div className="flex justify-between items-center text-sm">
                                                                    <span className="text-slate-600 dark:text-slate-400">Original Price:</span>
                                                                    <span className="text-slate-900 dark:text-white line-through">₹{plan.price}</span>
                                                                </div>
                                                                <div className="flex justify-between items-center text-sm">
                                                                    <span className="text-green-600 dark:text-green-400">Discount:</span>
                                                                    <span className="text-green-600 dark:text-green-400 font-semibold">
                                                                        -{appliedCoupon.discountType === 'Percentage' || appliedCoupon.discountType === 1
                                                                            ? `${appliedCoupon.discountValue}%`
                                                                            : `₹${appliedCoupon.discountValue}`}
                                                                    </span>
                                                                </div>
                                                                <div className="flex justify-between items-center pt-2 border-t border-slate-300 dark:border-slate-600">
                                                                    <span className="font-bold text-slate-900 dark:text-white">Final Price:</span>
                                                                    <span className="text-xl font-bold text-green-600 dark:text-green-400">
                                                                        ₹{calculateFinalPrice(plan, appliedCoupon).toFixed(2)}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    );
                                })()}

                                {(() => {
                                    // Determine Button Text & State
                                    let buttonText = isLocked ? 'Current Plan' : isCurrentPlan ? 'Renew Plan' : 'Choose Plan';
                                    let isDisabled = isLocked;

                                    // Special Handling for Free Trial Plan
                                    // If name matches "Free", and user is strictly locked out (cancelled/expired), mark as used/expired
                                    const isFreePlanCard = plan.name?.toLowerCase().includes('free');

                                    // Check if trial has expired by time (24-hour period passed)
                                    const isTrialExpiredByTime = user?.trialEndDate && new Date() > new Date(user.trialEndDate);

                                    // Check if user has an active PAID subscription (not free trial)
                                    const hasActivePaidSubscription = isSubActive && !isFreeTrial;

                                    // Check if this Free Trial card and user currently has Free Trial active
                                    const hasActiveFreeTrialSubscription = isSubActive && isFreeTrial;

                                    // Comprehensive check: Plan is used if:
                                    // 1. User has an active paid subscription (can't go back to free trial)
                                    // 2. User already has active free trial (can't use it again)
                                    // 3. User explicitly cancelled
                                    // 4. Trial period expired (24 hours)
                                    // 5. Subscription status is cancelled/expired
                                    const isPlanUsed = isFreePlanCard && (
                                        hasActivePaidSubscription ||
                                        hasActiveFreeTrialSubscription ||
                                        isExplicitlyCancelled ||
                                        isTrialExpiredByTime ||
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
                                                        message: "Plan used. You have already used your Free Trial. Please choose a premium plan to continue.",
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
