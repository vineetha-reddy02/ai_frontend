// Auth Types
export interface User {
  id: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  avatar?: string;
  role: 'user' | 'instructor' | 'admin';
  referralCode?: string;
  trialEndDate?: string;
  subscriptionStatus?: 'trial' | 'active' | 'expired' | 'none' | 'cancelled';
  subscriptionPlan?: 'trial' | 'basic' | 'premium';
  isApproved?: boolean; // instructor approval flag
}

export interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
  user: User;
  message?: string;
}

export interface LoginRequest {
  identifier: string; // email or phone
  password: string;
  rememberMe?: boolean;
}

export interface RegisterRequest {
  email: string;
  phoneNumber?: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  role: 'user' | 'instructor';
  referralCode?: string;
  referralSource?: string;
  instructorBio?: string;
  instructorExpertise?: string[];
}

// Voice Call Types
export interface VoiceCallMatch {
  id: string;
  userId: string;
  userName: string;
  userLevel: string;
  status: 'waiting' | 'matched' | 'calling' | 'ongoing';
  peerId?: string;
  createdAt: string;
}

export interface CallSignal {
  type: 'offer' | 'answer' | 'candidate';
  data: any;
  from: string;
  to: string;
}

// Daily Topics Types
export interface DailyTopic {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  estimatedTime: number;
  content: string;
  isCompleted: boolean;
  completedAt?: string;
}

export interface TopicCreateRequest {
  title: string;
  description?: string;
  categoryId?: string;
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced';
  content?: string;
}

// Quiz Types
export interface QuizQuestion {
  id: string;
  type: 'MultipleChoice' | 'TrueFalse' | 'FillInTheBlank';
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  questions: QuizQuestion[];
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  passingScore: number;
  totalQuestions: number;
  timeLimitMinutes?: number;
  randomizeQuestions?: boolean;
  maxAttempts?: number;
  showCorrectAnswers?: boolean;
  prerequisiteQuizId?: string | null;
  publishImmediately?: boolean;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  userId: string;
  answers: number[];
  score: number;
  percentage: number;
  passed: boolean;
  completedAt: string;
  timeSpent: number;
}

// AI Pronunciation Types
export interface PronunciationTest {
  id: string;
  word: string;
  correctPronunciation: string;
  audioUrl?: string;
  userId: string;
  userAudioUrl?: string;
  score: number;
  feedback: string;
  completedAt?: string;
}

export interface PronunciationParagraph {
  id: string;
  title: string;
  text: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  language?: string;
  createdBy?: string;
  createdAt?: string;
  phoneticTranscription?: string;
  referenceAudioUrl?: string;
  wordCount?: number;
  estimatedDurationSeconds?: number;
}

export interface AiAssessmentResponse {
  id: string;
  score: number;
  feedback: string;
  details?: any;
}

// Wallet Types
export interface WalletTransaction {
  id: string;
  userId: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  date: string;
  balance: number;
}

export interface Wallet {
  userId: string;
  balance: number;
  transactions: WalletTransaction[];
}

// Referral Types
export interface Referral {
  id: string;
  referrerUserId: string;
  referredUserId: string;
  status: 'pending' | 'completed';
  rewardAmount: number;
  createdAt: string;
  completedAt?: string;
}

// Coupon Types
export const DiscountType = {
  Percentage: 1,
  Flat: 2
} as const;

export const ApplicabilityType = {
  AllSubscriptions: 1,
  SpecificQuizzes: 2,
  SpecificPlans: 3
} as const;

export interface Coupon {
  id: string;
  code: string;
  description: string;
  discountType: 'Percentage' | 'Flat' | 'FixedAmount'; // API returns 'Flat', keeping FixedAmount for legacy safety
  discountValue: number;
  maxDiscountAmount: number;
  minimumPurchaseAmount: number;
  applicableTo: 'AllSubscriptions' | 'SpecificQuizzes' | 'SpecificPlans' | 'Both' | 'Quiz' | 'Plan'; // Matching API & Legacy
  specificQuizIds: string[];
  specificPlanIds: string[];
  maxTotalUsage: number;
  maxUsagePerUser: number;
  currentUsageCount: number;
  startDate: string;
  expiryDate: string;
  status: 'Active' | 'Inactive' | 'Expired';
  createdBy?: string;
  createdAt?: string;
  remainingUsage?: number;
}

export interface CreateCouponRequest {
  code: string;
  description: string;
  discountType: number; // 1 (Percentage) or 2 (Flat)
  discountValue: number;
  maxDiscountAmount?: number;
  minimumPurchaseAmount?: number;
  applicableTo: number; // 1 (All), 2 (Quiz), 3 (Plan)
  specificQuizIds?: string[];
  specificPlanIds?: string[];
  maxTotalUsage?: number;
  maxUsagePerUser?: number;
  startDate: string;
  expiryDate: string;
}

export interface UpdateCouponRequest {
  id: string;
  description?: string;
  maxDiscountAmount?: number;
  minimumPurchaseAmount?: number;
  maxTotalUsage?: number;
  maxUsagePerUser?: number;
  expiryDate?: string;
  status?: 'Active' | 'Inactive';
}

export interface ValidateCouponRequest {
  couponCode: string;
  amount: number;
  itemType: string;
  itemId: string;
}

export interface ValidateCouponResponse {
  discountAmount: number;
  finalPrice: number;
  discountPercentage?: number;
}

export interface ApplyCouponRequest {
  couponCode: string;
  originalAmount: number;
  itemType: string;
  itemId: string;
  orderId: string;
}

export interface CouponListParams {
  page?: number;
  pageSize?: number;
  status?: number;
  applicableTo?: number;
  startDateFrom?: string;
  startDateTo?: string;
  searchTerm?: string;
}

// Subscription Types
export interface Subscription {
  id: string;
  userId: string;
  plan: 'basic' | 'premium';
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  status: 'active' | 'expired' | 'cancelled';
}

// Subscription Info Data Transfer Object
export interface SubscriptionInfoDto {
  planName: string | null;
  status: string | null;
  renewalDate: string | null;
  isFreeTrial: boolean;
}

// Full user profile returned by GET /api/v1/users/profile
export interface UserProfile {
  userId: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  bio?: string;
  avatarUrl?: string;
  learningGoals?: string[];
  preferredLanguage?: string;
  timeZone?: string;
  country?: string;
  city?: string;
  dateOfBirth?: string; // ISO
  age?: number;
  subscription?: SubscriptionInfoDto;
  walletBalance?: number;
  referralCode?: string;
}

// Payment Types
export interface PaymentOrder {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  planId: string;
  merchantTransactionId: string;
  phonepeUrl?: string;
  createdAt: string;
  completedAt?: string;
}

// Admin: instructor review request
export interface InstructorReviewRequest {
  approved: boolean;
  notes?: string;
}

// Generic paginated response
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// Usage Tracking Types
export interface UsageData {
  voiceCallUsedSeconds: number; // seconds used in current session
  voiceCallLimitSeconds: number; // 300 seconds (5 minutes per session)
  lastResetDate: string; // ISO date string for daily reset tracking
}

export interface Ad {
  id: string;
  title: string;
  description: string;
  gradient: string; // CSS gradient
  icon: string; // Icon name or emoji
  ctaText?: string;
  ctaLink?: string;
}