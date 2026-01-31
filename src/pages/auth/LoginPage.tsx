import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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



const LoginPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Memoize schema to prevent recreation on every render, but allow it to update when language changes
  const loginSchema = React.useMemo(() => z.object({
    email: z.string().email(t('auth.validation.emailInvalid')),
    password: z.string().min(1, t('auth.validation.passwordRequired')),
  }), [t]);

  type LoginFormData = z.infer<typeof loginSchema>;

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
        identifier: data.email,
        password: data.password,
        rememberMe: true,
      });

      console.log('Login response:', response);

      // Handle different response structures
      // 1. Nested: { user: {...}, token: '...' }
      // 2. Flattened: { id: 1, email: '...', token: '...' }
      let user = response?.user || response?.data?.user;
      let token = response?.accessToken || response?.token;

      // Fallback for flattened structure (backend returns user fields at root)
      if (!user && response?.id && response?.email) {
        user = response;
        token = response.token;
      }

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

        // Save refresh token for automatic token refresh
        const refreshToken = response?.refreshToken || response?.data?.refreshToken;
        if (refreshToken) {
          localStorage.setItem('edutalks_refresh_token', refreshToken);
          console.log('✅ Refresh token saved');
        } else {
          console.warn('⚠️ No refresh token in login response');
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
            message: t('auth.loginSuccess'),
            type: 'success',
          })
        );

        // Redirect based on role
        const roleLower = String(finalUser.role || '').toLowerCase();
        if (roleLower === 'admin') {
          navigate('/admindashboard');
        } else if (finalUser.role === 'instructor') {
          navigate('/instructor-dashboard');
        } else {
          navigate('/dashboard');
        }
      } else {
        console.error('Missing user or token in response');
        dispatch(showToast({ message: t('auth.loginFailed'), type: 'error' }));
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
        lower.includes('verify') ||
        responseErrors.some((e: string) => /confirm|verify/i.test(e)) ||
        responseMessages.some((m: string) => /confirm|verify/i.test(m));

      if (notConfirmedIndicator) {
        setShowResend(true);
      }

      dispatch(setError(errorMessage));
      dispatch(showToast({ message: errorMessage, type: 'error' }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!watchedEmail) {
      dispatch(showToast({ message: t('auth.validation.emailInvalid'), type: 'error' }));
      return;
    }

    try {
      setIsResending(true);
      await authService.resendEmailConfirmation(watchedEmail);
      dispatch(
        showToast({
          message: t('auth.resendSuccess') || 'If this email is registered, a confirmation email has been sent.',
          type: 'success',
        })
      );
      setShowResend(false);
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 'Failed to resend confirmation';
      dispatch(showToast({ message: errorMessage, type: 'error' }));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-dvh bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
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
            {t('auth.welcomeBack')}
          </h1>
          <p className="text-center text-slate-600 dark:text-slate-400 mb-8">
            {t('auth.subtitle')}
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
                {t('auth.emailLabel')}
              </label>
              <input
                {...register('email')}
                type="email"
                placeholder={t('auth.enterEmail')}
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
                  {t('auth.password')}
                </label>
                <div className="flex items-center space-x-4">
                  <Link
                    to="/forgot-password"
                    className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
                  >
                    {t('auth.forgot')}
                  </Link>

                  {showResend && (
                    <button
                      type="button"
                      disabled={isResending}
                      onClick={handleResendConfirmation}
                      className="text-sm text-primary-600 dark:text-primary-400 hover:underline disabled:opacity-50"
                    >
                      {isResending ? t('common.loading') : t('auth.resendConfirmation')}
                    </button>
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
                  aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
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
                {t('auth.rememberMe')}
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
              {t('auth.login')}
            </Button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-slate-800 text-slate-500">
                  {t('auth.orContinueWith') || 'Or continue with'}
                </span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button type="button" className="social-btn">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Google
              </button>
              <button type="button" className="social-btn">
                <svg className="w-5 h-5 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
                  />
                </svg>
                Facebook
              </button>
            </div>
          </div>

          {/* Register Link */}
          <p className="text-center text-slate-600 dark:text-slate-400 mt-6">
            {t('auth.dontHaveAccount')}{' '}
            <Link to="/register" className="text-primary-600 dark:text-primary-400 font-medium hover:underline">
              {t('auth.signUpLink')}
            </Link>
          </p>

          {/* Demo credentials removed */}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
