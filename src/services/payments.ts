import { apiService } from './api';

export const paymentsService = {
  // Payment Processing
  createOrder: async (data: { amount: number; description?: string; itemType?: string; itemId?: string }) =>
    apiService.post('/payments/create-order', data),

  getStatus: async (orderId: string) =>
    apiService.get(`/payments/status/${orderId}`),

  verify: async (data: any) =>
    apiService.post('/payments/verify', data),

  callback: async (data: any) =>
    apiService.post('/payments/callback', data),

  getTransaction: async (transactionId: string) =>
    apiService.get(`/payments/${transactionId}`),

  getUserTransactions: async (params?: Record<string, any>) =>
    apiService.get('/payments/my-transactions', { params }),

  // Refund Management
  requestRefund: async (transactionId: string, reason: string) =>
    apiService.post(`/payments/${transactionId}/refund-request`, { reason }),

  getRefundStatus: async (refundId: string) =>
    apiService.get(`/payments/refunds/${refundId}/status`),

  // Coupon Management
  validateCoupon: async (couponCode: string) =>
    apiService.post('/coupons/validate', { code: couponCode }),

  applyCoupon: async (couponCode: string, orderId: string) =>
    apiService.post(`/payments/coupons/${couponCode}/apply`, { orderId }),

  // Wallet Operations
  addFundsToWallet: async (amount: number, paymentMethod: string) =>
    apiService.post('/wallet/add-funds', { amount, paymentMethod }),

  withdrawFunds: async (amount: number, bankDetails: any) =>
    apiService.post('/wallet/withdraw', { amount, bankDetails }),

  getWalletBalance: async () =>
    apiService.get('/wallet/balance'),

  getWalletTransactions: async (params?: Record<string, any>) =>
    apiService.get('/wallet/transactions', { params }),

  // Admin endpoints
  adminTransactions: async (params?: Record<string, any>) =>
    apiService.get('/admin/payments/transactions', { params }),

  adminWithdrawalsPending: async () =>
    apiService.get('/admin/payments/withdrawals/pending'),

  adminApproveWithdrawal: async (withdrawalId: string) =>
    apiService.post(`/admin/payments/withdrawals/${withdrawalId}/approve`),

  adminRejectWithdrawal: async (withdrawalId: string, reason?: string) =>
    apiService.post(`/admin/payments/withdrawals/${withdrawalId}/reject`, { reason }),

  adminCompleteWithdrawal: async (withdrawalId: string) =>
    apiService.post(`/admin/payments/withdrawals/${withdrawalId}/complete`),

  adminRefundsPending: async () =>
    apiService.get('/admin/payments/refunds/pending'),

  adminApproveRefund: async (refundId: string) =>
    apiService.post(`/admin/payments/refunds/${refundId}/approve`),

  adminRejectRefund: async (refundId: string, reason?: string) =>
    apiService.post(`/admin/payments/refunds/${refundId}/reject`, { reason }),

  adminAdjustWallet: async (data: { userId: string; amount: number; reason?: string }) =>
    apiService.post('/admin/payments/wallets/adjust-balance', data),



  // Subscription Payments
  purchaseSubscription: async (planId: string, paymentMethod: string) =>
    apiService.post('/subscriptions/purchase', { planId, paymentMethod }),

  renewSubscription: async (subscriptionId: string) =>
    apiService.post(`/subscriptions/${subscriptionId}/renew`),

  cancelSubscription: async (subscriptionId: string, reason?: string) =>
    apiService.post(`/subscriptions/${subscriptionId}/cancel`, { reason }),

  // Quiz Access Payments
  unlockQuiz: async (quizId: string) =>
    apiService.post(`/quizzes/${quizId}/unlock`),

  // Process Payment (New API)
  processPayment: async (data: {
    amount: number;
    currency: string;
    entityType: string;
    entityId: string;
    idempotencyKey: string;
    phoneNumber?: string;
  }) => apiService.post('/payments/process', data),

  checkPaymentStatus: async (transactionId: string) =>
    apiService.get(`/payments/${transactionId}/status`),

  // Payment Webhooks (for internal use)
  processPaymentWebhook: async (data: any) =>
    apiService.post('/payments/webhook', data),
};

export default paymentsService;
