import { useSelector, useDispatch } from 'react-redux';
import { useEffect, useState } from 'react';
import type { RootState } from '../store';
import { checkAndReset } from '../store/usageSlice';

export const useUsageLimits = () => {
    const dispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const usageData = useSelector((state: RootState) => state.usage);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);

    // Check if user has active subscription (unlimited access)
    // Robust subscription check handling lower case, trialing, and plan existence
    const status = (user?.subscriptionStatus || (user as any)?.subscription?.status || '').toLowerCase();
    const plan = (user?.subscriptionPlan || (user as any)?.subscription?.planName || '').toLowerCase();

    // Check for active status or valid paid plan that isn't explicitly expired
    const isActiveStatus = status === 'active' || status === 'trialing' || status === 'succeeded';
    const isPaidPlan = ['basic', 'premium', 'yearly', 'pro'].some(p => plan.includes(p));

    // STRICT: If status is explicitly cancelled, we treat it as revoked access immediately 
    // (per user request: "if he cancels before 24hrs also it has to locked")
    const isExplicitlyCancelled = status === 'cancelled' || status === 'expired' || status === 'past_due';

    const hasActiveSubscription = (
        (user?.role === 'admin' || user?.role === 'instructor') ||
        (isActiveStatus && !isExplicitlyCancelled)
    );

    const isFreeTrial = plan.includes('free') || plan.includes('trial') || !!(user as any)?.subscription?.isFreeTrial;

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
    // Default to 5 mins (300s) for Free Trial, Unlimited (-1) for Paid
    const voiceCallLimitSeconds = (isFreeTrial || !hasActiveSubscription) ? 300 : -1;

    // Check remaining time
    const voiceCallRemainingSeconds = voiceCallLimitSeconds === -1
        ? 999999 // Effectively unlimited for UI display calculations
        : Math.max(0, voiceCallLimitSeconds - usageData.voiceCallUsedSeconds);

    const hasVoiceCallTimeRemaining = voiceCallRemainingSeconds > 0;

    // Trigger upgrade modal
    const triggerUpgradeModal = () => {
        setShowUpgradeModal(true);
    };

    const closeUpgradeModal = () => {
        setShowUpgradeModal(false);
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
        showUpgradeModal,
        triggerUpgradeModal,
        closeUpgradeModal,
    };
};
