// API Endpoints
export const API_ENDPOINTS = {
  // Auth (baseURL is already /api, so just use /auth/*)

  REGISTER: '/auth/register',
  LOGIN: '/auth/login',
  LOGOUT: '/auth/logout',
  REFRESH_TOKEN: '/auth/refresh-token',
  // Backend uses /users/profile for user profile endpoints (matches /api/v1/users/profile)
  GET_PROFILE: '/users/profile',
  UPDATE_PROFILE: '/users/profile',
  FORGOT_PASSWORD: '/auth/forgot-password',
  RESEND_EMAIL_CONFIRMATION: '/auth/resend-verification',
  VERIFY_EMAIL: '/auth/verify-email',
  RESET_PASSWORD: '/auth/reset-password',

  // Dashboard
  DASHBOARD_STATS: '/dashboard/stats',

  // Voice Calls
  GET_CALL_MATCHES: '/voice-calls/matches',
  CREATE_CALL_REQUEST: '/voice-calls/request',
  ACCEPT_CALL: '/voice-calls/accept',
  END_CALL: '/voice-calls/end',
  GET_CALL_HISTORY: '/voice-calls/history',

  // Daily Topics
  DAILY_TOPICS_LIST: '/daily-topics',
  GET_DAILY_TOPICS: '/daily-topics',
  GET_TOPIC_DETAILS: '/daily-topics/:id',
  MARK_TOPIC_COMPLETED: '/daily-topics/:id/complete',

  // Quizzes
  QUIZZES_LIST: '/quizzes',
  GET_QUIZZES: '/quizzes',
  GET_QUIZ_DETAILS: '/quizzes/:id',
  SUBMIT_QUIZ: '/quizzes/:id/submit',
  GET_QUIZ_RESULTS: '/quizzes/:id/results',

  // AI Pronunciation
  GET_PRONUNCIATION_TESTS: '/pronunciation/tests',
  SUBMIT_PRONUNCIATION: '/pronunciation/submit',
  GET_PRONUNCIATION_SCORE: '/pronunciation/score/:id',

  // Wallet
  WALLET_DATA: '/wallet',
  GET_WALLET: '/wallet',
  GET_TRANSACTIONS: '/wallet/transactions',
  ADD_BALANCE: '/wallet/add-balance',

  // Referrals
  GET_REFERRALS: '/referrals',
  CREATE_REFERRAL: '/referrals/create',
  GET_REFERRAL_CODE: '/referrals/code',

  // Coupons
  GET_COUPONS: '/coupons',
  APPLY_COUPON: '/coupons/apply',
  VALIDATE_COUPON: '/coupons/validate',

  // Subscriptions
  GET_SUBSCRIPTION: '/subscriptions',
  GET_SUBSCRIPTION_PLANS: '/subscriptions/plans',
  CREATE_SUBSCRIPTION: '/subscriptions/create',
  CANCEL_SUBSCRIPTION: '/subscriptions/cancel',

  // Payments
  CREATE_PAYMENT_ORDER: '/payments/create-order',
  GET_PAYMENT_STATUS: '/payments/status/:orderId',
  VERIFY_PAYMENT: '/payments/verify',
  PAYMENT_CALLBACK: '/payments/callback',
};

export const FEATURES = [
  {
    icon: 'Mic',
    title: 'AI Pronunciation',
    description: 'Perfect your pronunciation with AI-powered feedback',
  },
  {
    icon: 'BookOpen',
    title: 'Daily Topics',
    description: 'Learn new topics every day to improve your English',
  },
  {
    icon: 'Phone',
    title: 'Voice Calling',
    description: 'Practice speaking with other learners in real-time',
  },
  {
    icon: 'CheckSquare',
    title: 'Daily Quizzes',
    description: 'Test your knowledge with engaging quizzes',
  },
];

export const ROLES = [
  { value: 'user', label: 'User' },
  { value: 'admin', label: 'Admin' },
];

export const DIFFICULTY_LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

export const SUBSCRIPTION_PLANS = [
  {
    id: 'trial',
    name: 'Free Trial',
    duration: 2,
    price: 0,
    features: [
      'Access to daily topics',
      'Basic quizzes',
      'AI pronunciation (limited)',
      '2-day free trial',
    ],
  },
  {
    id: 'basic',
    name: 'Basic Plan',
    duration: 30,
    price: 299,
    features: [
      'All trial features',
      'Unlimited voice calls',
      'Full AI pronunciation',
      'Advanced quizzes',
      'Monthly subscription',
    ],
  },
  {
    id: 'premium',
    name: 'Premium Plan',
    duration: 90,
    price: 799,
    features: [
      'All basic features',
      'Priority call matching',
      'Personalized learning path',
      'One-on-one sessions',
      '3-month subscription',
    ],
  },
];

export const STORAGE_KEYS = {
  TOKEN: 'edutalks_token',
  USER: 'edutalks_user',
  THEME: 'edutalks_theme',
  TRIAL_END_DATE: 'edutalks_trial_end_date',
  REFRESH_TOKEN: 'edutalks_refresh_token',
};

// Agora Configuration
export const AGORA_CONFIG = {
  APP_ID: '3a2e9a0f5c924ca9b460555916dbaae5',
  // Note: Certificate should ONLY be used on backend for token generation
  // NEVER expose certificate in frontend code
};

export const TOAST_MESSAGES = {
  LOGIN_SUCCESS: 'Login successful! Welcome back.',
  REGISTER_SUCCESS: 'Registration successful! You now have 2 days free trial.',
  LOGOUT_SUCCESS: 'Logout successful. See you soon!',
  CALL_STARTED: 'Voice call started. Say hello!',
  CALL_ENDED: 'Voice call ended.',
  QUIZ_SUBMITTED: 'Quiz submitted successfully!',
  COUPON_APPLIED: 'Coupon applied successfully!',
  PAYMENT_SUCCESS: 'Payment successful! Your subscription is activated.',
};

// AI model selection: reads from Vite env `VITE_AI_MODEL` or falls back
// to a sensible default. This is a frontend-only toggle — actual
// provider credentials and backend wiring must be configured server-side.
export const AI_MODEL: string = (import.meta.env.VITE_AI_MODEL as string) ?? 'claude-haiku-4.5';
