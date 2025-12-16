import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { paymentsService } from '../services/payments';
import { subscriptionsService } from '../services/subscriptions';
import { authService } from '../services/auth';
import { updateUserSubscription, setUser } from '../store/authSlice';
import { showToast } from '../store/uiSlice';

/**
 * Global hook that checks for pending payments on every page load
 * This ensures payment verification happens regardless of where PhonePe redirects
 */
export const usePaymentVerification = () => {
    const dispatch = useDispatch();

    useEffect(() => {
        const verifyPendingPayment = async () => {
            // Check if there's a pending payment in localStorage
            const stored = localStorage.getItem('pending_payment');
            if (!stored) {
                return; // No pending payment
            }

            let pendingPayment;
            try {
                pendingPayment = JSON.parse(stored);
            } catch (e) {
                console.error('Failed to parse pending payment:', e);
                localStorage.removeItem('pending_payment');
                return;
            }

            const { transactionId, planName, timestamp } = pendingPayment;

            // Check if payment is too old (more than 1 hour)
            const oneHourAgo = Date.now() - (60 * 60 * 1000);
            if (timestamp < oneHourAgo) {
                console.log('⏰ Pending payment is too old, removing...');
                localStorage.removeItem('pending_payment');
                return;
            }

            console.log('🔍 ========== FOUND PENDING PAYMENT ==========');
            console.log('🆔 Transaction ID:', transactionId);
            console.log('📦 Plan:', planName);
            console.log('⏰ Payment initiated:', new Date(timestamp).toLocaleString());

            // Verify the payment status
            try {
                console.log('📡 Checking payment status...');
                const res = await paymentsService.checkPaymentStatus(transactionId);
                const paymentData = (res as any).data || res;
                const status = paymentData?.status?.toUpperCase();

                console.log('💳 Payment Status:', status);

                if (status === 'COMPLETED' || status === 'SUCCESS') {
                    console.log('🎉 Payment verified as completed!');

                    // Clear pending payment
                    localStorage.removeItem('pending_payment');

                    // Update Redux state
                    dispatch(updateUserSubscription({
                        subscriptionStatus: 'active',
                        subscriptionPlan: planName
                    }));

                    // Refresh user profile to get new token
                    try {
                        const profileRes = await authService.getProfile();
                        const userData = (profileRes as any).data || profileRes;
                        if (userData && userData.id) {
                            dispatch(setUser(userData));
                        }
                    } catch (err) {
                        console.error('Failed to refresh profile:', err);
                    }

                    // Show success message
                    dispatch(showToast({
                        message: 'Subscription activated successfully!',
                        type: 'success'
                    }));

                    // Navigate to profile to show the new subscription
                    setTimeout(() => {
                        window.location.href = '/profile';
                    }, 1000);

                } else if (status === 'PENDING') {
                    console.log('⏳ Payment still pending, will check again on next page load');
                } else if (status === 'FAILED') {
                    console.log('❌ Payment failed');
                    localStorage.removeItem('pending_payment');
                    dispatch(showToast({
                        message: 'Payment failed. Please try again.',
                        type: 'error'
                    }));
                }
            } catch (error) {
                console.error('Failed to verify payment:', error);
                // Keep the pending payment in localStorage to retry later
            }
        };

        // Run verification after a short delay to let the page load
        const timer = setTimeout(verifyPendingPayment, 1000);
        return () => clearTimeout(timer);
    }, [dispatch]);
};
