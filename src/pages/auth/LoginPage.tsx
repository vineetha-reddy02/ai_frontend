import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDispatch } from 'react-redux';
import Button from '../../components/Button';
import { authService } from '../../services/auth';
import { usersService } from '../../services/users';
import { subscriptionsService } from '../../services/subscriptions';
import { setAuthData, setError, updateUserSubscription } from '../../store/authSlice';
import { showToast } from '../../store/uiSlice';
import { AppDispatch } from '../../store';
import { Logo } from '../../components/common/Logo';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const [showResend, setShowResend] = useState(false);

  // Clear the 'showResend' flag whenever the email input changes
  useEffect(() => {
    const subscription = watch((value, { name }) => {
      if (name === 'email') setShowResend(false);
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  const watchedEmail = watch('email') || '';

  const onSubmit = async (data: LoginFormData) => {
    try {
      setIsLoading(true);
      console.log('Sending login request with:', { email: data.email, password: '***' });

      const response = await authService.login({
        identifier: data.email,  // Backend expects 'identifier' not 'email'
        password: data.password,
        rememberMe: true,
      });

      console.log('Login response:', response);

      // API interceptor already unwraps response.data, so response is the inner data object
      // Structure: { user, accessToken, refreshToken } OR { accessToken, refreshToken, data: { user } }
      const user = response?.user || response?.data?.user;
      const token = response?.accessToken || response?.token;

      console.log('Extracted user:', user);
      console.log('Extracted token:', token ? 'Present' : 'Missing');
      console.log('Full response structure:', response);

      if (user && token) {
        // If backend didn't mark role but email starts with 'admin', treat as admin
        const finalUser = { ...(user as any) } as any;
        const emailLower = (data.email || '').toLowerCase();
        if (emailLower.startsWith('admin') && finalUser.role !== 'admin') {
          finalUser.role = 'admin';
        }

        // 1. Set initial auth data (token is crucial for subsequent requests)
        dispatch(setAuthData({ user: finalUser, token }));

        // 2. Fetch full profile and subscription to ensure we have the latest status
        // This prevents the "Trial Expired" flash by ensuring Redux has the "Yearly" plan data immediately
        try {
          const profileRes = await usersService.getProfile();
          const profileData = (profileRes as any)?.data || profileRes;

          let subData = null;
          try {
            const subRes = await subscriptionsService.current();
            subData = (subRes as any)?.data || subRes;
          } catch (e) { console.log('No active sub on login'); }

          // Auto-subscribe to Free Trial if no active subscription
          if (!subData || !subData.status || subData.status === 'none') {
            try {
              console.log('Auto-subscribing new user to Free Trial...');
              const subscribeRes = await subscriptionsService.subscribe({
                planId: 'plan_free_trial'
              });
              const newSub = (subscribeRes as any)?.data || subscribeRes;

              if (newSub) {
                console.log('Auto-subscription successful:', newSub);
                subData = {
                  ...newSub,
                  plan: { name: 'Free Trial' },
                  planName: 'Free Trial',
                  status: 'Active' // Assume active after successful subscribe
                };

                // Update profileData to reflect the new subscription
                if (profileData) {
                  if (!profileData.subscription) profileData.subscription = {};
                  profileData.subscription.status = 'Active';
                  profileData.subscription.planName = 'Free Trial';
                  profileData.subscription.renewalDate = newSub.renewalDate;
                  profileData.subscription.isFreeTrial = true;
                }
              }
            } catch (autoSubError) {
              console.error('Failed to auto-subscribe to Free Trial:', autoSubError);
            }
          }

          // 3. Dispatch merged updates
          if (profileData) {
            // Re-dispatch setAuthData or setUser with the richer profile
            dispatch(setAuthData({
              user: {
                ...finalUser,
                ...profileData,
                subscriptionStatus: profileData.subscriptionStatus || profileData.subscription?.status,
                subscriptionPlan: profileData.subscriptionPlan || profileData.subscription?.planName || profileData.subscription?.plan?.name,
                trialEndDate: profileData.subscription?.renewalDate // Store renewalDate as trialEndDate for timer
              },
              token
            }));
          }

          if (subData) {
            dispatch(updateUserSubscription({
              subscriptionStatus: subData.status,
              subscriptionPlan: subData.plan?.name || subData.planName,
              trialEndDate: subData.renewalDate || subData.endDate
            }));
          }

        } catch (fetchError) {
          console.error('Failed to fetch rich profile data on login', fetchError);
          // Non-blocking: we still have the basic user from login response, so we proceed
        }

        dispatch(
          showToast({
            message: 'Login successful! Welcome back.',
            type: 'success',
          })
        );

        // Redirect based on role
        if (finalUser.role === 'admin') {
          navigate('/admin');
        } else if (finalUser.role === 'instructor') {
          navigate('/instructor-dashboard');
        } else {
          navigate('/dashboard');
        }
      } else {
        console.error('Missing user or token in response');
        dispatch(showToast({ message: 'Login failed - incomplete response', type: 'error' }));
      }
    } catch (error: any) {
      console.error('Login error caught:', error);
      console.error('Error response:', error?.response);
      console.error('Error response data:', error?.response?.data);

      // Extract error message from different response formats
      let errorMessage = 'Login failed';
      const responseData = error?.response?.data;

      if (responseData?.messages && responseData.messages.length > 0) {
        errorMessage = responseData.messages[0];
      } else if (responseData?.errors && responseData.errors.length > 0) {
        errorMessage = responseData.errors[0];
      } else if (responseData?.message) {
        errorMessage = responseData.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      console.error('Final error message:', errorMessage);

      // If backend indicates the email/account is not confirmed, show the "Resend confirmation" link
      const lower = (errorMessage || '').toLowerCase();
      const responseErrors: string[] = responseData?.errors || [];
      const responseMessages: string[] = responseData?.messages || [];

      const notConfirmedIndicator =
        lower.includes('confirm') ||
        responseErrors.some((e: string) => /confirm/i.test(e)) ||
        responseMessages.some((m: string) => /confirm/i.test(m));

      if (notConfirmedIndicator) {
        setShowResend(true);
      }

      dispatch(setError(errorMessage));
      dispatch(showToast({ message: errorMessage, type: 'error' }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="card">
          {/* Back to Home Button */}
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors mb-6 group"
          >
            <svg
              className="w-5 h-5 transition-transform group-hover:-translate-x-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            {/* <span className="text-sm font-medium">Back to Home</span> */}
          </Link>

          {/* Logo */}
          <div className="flex justify-center mb-8">
            <Logo className="scale-125" />
          </div>

          <h1 className="text-3xl font-bold text-center mb-2 text-slate-900 dark:text-white">
            Welcome Back
          </h1>
          <p className="text-center text-slate-600 dark:text-slate-400 mb-8">
            Login to your EduTalks account
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
                Email Address
              </label>
              <input
                {...register('email')}
                type="email"
                placeholder="john@example.com"
                className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              {errors.email && (
                <p className="text-red-600 text-sm mt-1">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-slate-900 dark:text-white">
                  Password
                </label>
                <div className="flex items-center space-x-4">
                  <Link
                    to="/forgot-password"
                    className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
                  >
                    Forgot?
                  </Link>

                  {showResend && (
                    <Link
                      to={`/resend-confirmation?email=${encodeURIComponent(watchedEmail)}`}
                      className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
                    >
                      Resend confirmation
                    </Link>
                  )}
                </div>
              </div>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? "text" : "password"}
                  placeholder=""
                  className="w-full px-4 py-2.5 pr-12 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-600 text-sm mt-1">{errors.password.message}</p>
              )}
            </div>

            {/* Remember Me */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="remember"
                className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-2 focus:ring-primary-500"
              />
              <label htmlFor="remember" className="ml-2 text-sm text-slate-600 dark:text-slate-400">
                Remember me
              </label>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              fullWidth
              isLoading={isLoading}
              className="mt-6"
            >
              Login
            </Button>
          </form>

          {/* Register Link */}
          <p className="text-center text-slate-600 dark:text-slate-400 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary-600 dark:text-primary-400 font-medium hover:underline">
              Sign up here
            </Link>
          </p>

          {/* Demo credentials removed */}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
