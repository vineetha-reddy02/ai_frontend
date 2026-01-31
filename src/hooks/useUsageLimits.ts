import { useSelector, useDispatch } from 'react-redux';
import { useEffect, useState, useRef } from 'react';
import type { RootState } from '../store';
import { checkAndReset, incrementVoiceCallUsage, setUsage } from '../store/usageSlice';
import { callsService } from '../services/calls';
import { showModal, hideModal } from '../store/uiSlice';

export const useUsageLimits = () => {
    const dispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const usageData = useSelector((state: RootState) => state.usage);
    const { modal } = useSelector((state: RootState) => state.ui);
    const backendUsageSyncedRef = useRef(false);
    const [localBackendUsageSynced, setLocalBackendUsageSynced] = useState(false);

    // Check if upgrade modal is visible via Redux
    const isUpgradeModalOpen = modal?.type === 'upgrade' && modal?.visible;

    // Check if user has active subscription (unlimited access)
    // Robust subscription check handling lower case, trialing, and plan existence
    const status = (user?.subscriptionStatus || (user as any)?.subscription?.status || '').toLowerCase();
    const plan = (user?.subscriptionPlan || (user as any)?.subscription?.planName || '').toLowerCase();

    // Debug logging to see actual values
    console.log('🔍 Subscription Debug:', {
        status,
        plan,
        subscriptionStatus: user?.subscriptionStatus,
        subscriptionPlan: user?.subscriptionPlan,
        subscriptionObject: (user as any)?.subscription
    });

    // Check for active status or valid paid plan that isn't explicitly expired
    const isActiveStatus = status === 'active' || status === 'trialing' || status === 'succeeded';
    const isPaidPlan = ['basic', 'premium', 'yearly', 'pro', 'monthly', 'annual', 'month', 'year', 'quarterly', 'quarter'].some(p => plan.includes(p));

    // STRICT: If status is explicitly cancelled, we treat it as revoked access immediately 
    // (per user request: "if he cancels before 24hrs also it has to locked")
    const isExplicitlyCancelled = status === 'cancelled' || status === 'expired' || status === 'past_due';

    // User has active subscription if:
    // 1. They are admin/instructor, OR
    // 2. They have an active status AND a paid plan AND not cancelled
    const hasActiveSubscription = (
        (user?.role === 'admin' || user?.role === 'instructor') ||
        (isActiveStatus && isPaidPlan && !isExplicitlyCancelled)
    );

    console.log('✅ Subscription Check Result:', {
        hasActiveSubscription,
        isActiveStatus,
        isPaidPlan,
        isExplicitlyCancelled
    });

    const isFreeTrial = plan.includes('free') || plan.includes('trial') || !!(user as any)?.subscription?.isFreeTrial;

    // Sync usage from backend on mount
    useEffect(() => {
        const syncUsageFromBackend = async () => {
            if (localBackendUsageSynced || !user?.id) return;

            try {
                console.log('🔄 Starting backend usage sync...');

                // Fetch call history to calculate total used seconds
                const res = await callsService.history({ pageSize: 1000 });
                const history = (res as any)?.data || (Array.isArray(res) ? res : []);

                console.log(`📞 Fetched ${history.length} total calls from history`);

                // Get today's date string for filtering
                const today = new Date().toISOString().split('T')[0];
                console.log(`📅 Today's date: ${today}`);

                // Calculate total seconds used from ALL completed calls (Lifetime limit for free trial)
                const completedCalls = history.filter((call: any) => {
                    const status = (call.status || '').toLowerCase();
                    const isCompleted = status === 'completed';

                    // Log ignored calls for debugging
                    if (!isCompleted) {
                        console.log(`Skipping call ${call.callId || call.id}: Status=${status} (not completed)`);
                    }

                    return isCompleted;
                });

                console.log(`✅ Found ${completedCalls.length} completed calls (lifetime history)`);

                const totalUsedSeconds = completedCalls.reduce((total: number, call: any) => {
                    const duration = call.durationSeconds !== undefined ? call.durationSeconds : call.duration || 0;
                    return total + duration;
                }, 0);

                console.log(`📊 Total lifetime usage calculated: ${totalUsedSeconds} seconds (${Math.floor(totalUsedSeconds / 60)}:${String(totalUsedSeconds % 60).padStart(2, '0')})`);

                // Update Redux with backend data (this will override localStorage)
                // Always sync, even if 0, to ensure correct state if user clears history
                console.log(`💾 Updating Redux with backend usage: ${totalUsedSeconds}s`);
                dispatch(setUsage(totalUsedSeconds));
                console.log('✅ Redux updated successfully');

                setLocalBackendUsageSynced(true);
            } catch (error) {
                console.error('❌ Failed to sync usage from backend:', error);
                // Fall back to localStorage data
                setLocalBackendUsageSynced(true);
            }
        };

        syncUsageFromBackend();
    }, [user?.id, localBackendUsageSynced, dispatch]);

    // Check and reset usage on mount and periodically
    useEffect(() => {
        dispatch(checkAndReset());

        // Check every minute for daily reset
        const interval = setInterval(() => {
            dispatch(checkAndReset());
        }, 60000);

        return () => clearInterval(interval);
    }, [dispatch]);

    // Trial validity check
    const isTrialActive = () => {
        // If explicitly cancelled, trial is dead.
        if (isExplicitlyCancelled) return false;

        if (hasActiveSubscription) return true;

        if (!user?.trialEndDate) return false;

        const expiresAt = new Date(user.trialEndDate);
        return new Date() < expiresAt;
    };

    const trialRemainingTime = () => {
        if (isExplicitlyCancelled) return 'Trial Cancelled';
        if (hasActiveSubscription && !isFreeTrial) return 'Unlimited';

        if (!user?.trialEndDate) return 'Not activated';

        const expiresAt = new Date(user.trialEndDate);
        const now = new Date();

        if (now >= expiresAt) return 'Trial Expired';

        const diffMs = expiresAt.getTime() - now.getTime();
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        return `${hours}h ${minutes}m`;
    };

    // Voice Call limits
    // Paid subscribers get unlimited (-1), free trial users get 5 mins (300s)
    const voiceCallLimitSeconds = hasActiveSubscription ? -1 : 300;

    console.log('⏱️ Voice Call Limit:', {
        voiceCallLimitSeconds,
        hasActiveSubscription,
        isFreeTrial
    });

    // Check remaining time
    const voiceCallRemainingSeconds = voiceCallLimitSeconds === -1
        ? 999999 // Effectively unlimited for UI display calculations
        : Math.max(0, voiceCallLimitSeconds - usageData.voiceCallUsedSeconds);

    const hasVoiceCallTimeRemaining = voiceCallRemainingSeconds > 0;

    // Trigger upgrade modal via Redux
    const triggerUpgradeModal = (reason: string = 'general') => {
        dispatch(showModal({ type: 'upgrade', data: { reason } }));
    };

    const closeUpgradeModal = () => {
        dispatch(hideModal());
    };

    // Combined "Locked" state for UI
    // Locked if: No active subscription AND Trial is inactive (expired or cancelled)
    const isContentLocked = !hasActiveSubscription && !isTrialActive();

    return {
        hasActiveSubscription,
        isFreeTrial,
        isExplicitlyCancelled,

        // Trial access
        isTrialActive: isTrialActive(),
        trialRemainingTime: trialRemainingTime(),
        trialExpiresAt: user?.trialEndDate || null,

        // Access State
        isContentLocked,

        // Voice call session limits
        voiceCallRemainingSeconds,
        hasVoiceCallTimeRemaining,
        voiceCallUsedSeconds: usageData.voiceCallUsedSeconds,
        voiceCallLimitSeconds: voiceCallLimitSeconds,

        // Upgrade modal
        showUpgradeModal: isUpgradeModalOpen,
        triggerUpgradeModal,
        closeUpgradeModal,
    };
};
