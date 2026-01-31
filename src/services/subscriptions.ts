import { apiService } from './api';

export const subscriptionsService = {
  // Plan Management
  getPlans: async () =>
    apiService.get('/Subscriptions/plans'),

  // Subscription Operations
  subscribe: async (data: {
    planId: string;
    paymentMethodId?: string;
    useFreeTrial?: boolean;
    couponCode?: string;
    userPhone?: string;
  }) =>
    apiService.post('/Subscriptions/subscribe', data),

  current: async () =>
    apiService.get('/Subscriptions/current'),

  // Plan Changes
  changePlan: async (data: { userId?: string; newPlanId: string }) =>
    apiService.put('/Subscriptions/change-plan', data),

  // Subscription Management
  cancel: async (data: { subscriptionId?: string; reason?: string }) =>
    apiService.post('/Subscriptions/cancel', data),

  renew: async (data: { subscriptionId?: string; userPhone?: string }) =>
    apiService.post('/Subscriptions/renew', data),

  // Billing Information
  getBillingHistory: async (params?: Record<string, any>) =>
    apiService.get('/subscriptions/billing-history', { params }),

  getNextBillingDate: async () =>
    apiService.get('/subscriptions/next-billing-date'),

  // Usage & Limits
  getUsage: async () =>
    apiService.get('/subscriptions/usage'),

  getSubscriptionLimit: async (limitType: string) =>
    apiService.get(`/subscriptions/limits/${limitType}`),

  // Features
  getSubscriptionFeatures: async (planId?: string) =>
    apiService.get('/subscriptions/features', { params: { planId } }),

  // Trial
  startTrial: async (planId?: string) =>
    apiService.post('/subscriptions/trial/start', { planId }),

  extendTrial: async (days: number) =>
    apiService.post('/subscriptions/trial/extend', { days }),

  getTrialStatus: async () =>
    apiService.get('/subscriptions/trial-status'),

  // Promo Codes & Discounts
  validatePromoCode: async (code: string) =>
    apiService.post('/subscriptions/promo-code/validate', { code }),

  applyPromoCode: async (code: string, planId: string) =>
    apiService.post('/subscriptions/promo-code/apply', { code, planId }),

  getAvailablePromoCodes: async () =>
    apiService.get('/subscriptions/promo-codes'),

  // Admin Operations - Subscription Management
  adminGetSubscriptions: async (params?: Record<string, any>) =>
    apiService.get('/admin/subscriptions', { params }),

  adminGetSubscription: async (subscriptionId: string) =>
    apiService.get(`/admin/subscriptions/${subscriptionId}`),

  adminGetUserSubscription: async (userId: string) =>
    apiService.get(`/admin/users/${userId}/subscription`),

  adminCreateSubscription: async (userId: string, planId: string) =>
    apiService.post(`/admin/users/${userId}/subscriptions`, { planId }),

  adminCancelSubscription: async (subscriptionId: string, reason?: string) =>
    apiService.post(`/admin/subscriptions/${subscriptionId}/cancel`, { reason }),

  adminExtendSubscription: async (subscriptionId: string, days: number) =>
    apiService.post(`/admin/subscriptions/${subscriptionId}/extend`, { days }),

  adminApplyPromoCode: async (subscriptionId: string, promoCode: string) =>
    apiService.post(`/admin/subscriptions/${subscriptionId}/apply-promo`, { promoCode }),

  // Admin Operations - Plan Management (CRUD)
  createPlan: async (data: {
    name: string;
    description: string;
    price: number;
    currency: string;
    billingCycle: 'Monthly' | 'Yearly' | 'Quarterly' | 'Free';
    features?: Record<string, string>;
    isActive?: boolean;
    displayOrder?: number;
    trialDays?: number;
    isMostPopular?: boolean;
    marketingTagline?: string;
  }) =>
    apiService.post('/Subscriptions/plans', data),

  updatePlan: async (planId: string, data: {
    planId?: string;
    name?: string;
    description?: string;
    price?: number;
    currency?: string;
    billingCycle?: 'Monthly' | 'Yearly' | 'Quarterly' | 'Free';
    features?: Record<string, string>;
    isMostPopular?: boolean;
    isActive?: boolean;
    displayOrder?: number;
    trialDays?: number;
    replaceAllFeatures?: boolean;
    marketingTagline?: string;
  }) =>
    apiService.put(`/Subscriptions/plans/${planId}`, data),

  deletePlan: async (planId: string) =>
    apiService.delete(`/Subscriptions/plans/${planId}`),

  // Admin Operations - Feature Management
  addFeature: async (planId: string, data: {
    planId?: string;
    featureKey: string;
    value: string;
  }) =>
    apiService.post(`/Subscriptions/plans/${planId}/features`, data),

  updateFeature: async (planId: string, featureKey: string, data: {
    planId?: string;
    featureKey?: string;
    isEnabled?: boolean;
    value?: string;
  }) =>
    apiService.put(`/Subscriptions/plans/${planId}/features/${featureKey}`, data),

  deleteFeature: async (planId: string, featureKey: string) =>
    apiService.delete(`/Subscriptions/plans/${planId}/features/${featureKey}`),

  // Analytics
  getSubscriptionAnalytics: async (params?: Record<string, any>) =>
    apiService.get('/admin/subscriptions/analytics', { params }),

  getChurnAnalytics: async () =>
    apiService.get('/admin/subscriptions/churn'),

  getRevenueAnalytics: async (params?: Record<string, any>) =>
    apiService.get('/admin/subscriptions/revenue', { params }),
};

export default subscriptionsService;
