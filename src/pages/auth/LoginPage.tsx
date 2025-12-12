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

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const [isLoading, setIsLoading] = useState(false);

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

          // 3. Dispatch merged updates
          if (profileData) {
            // Re-dispatch setAuthData or setUser with the richer profile
            dispatch(setAuthData({
              user: {
                ...finalUser,
                ...profileData,
                subscriptionStatus: profileData.subscriptionStatus || profileData.subscription?.status,
                subscriptionPlan: profileData.subscriptionPlan || profileData.subscription?.planName || profileData.subscription?.plan?.name,
              },
              token
            }));
          }

          if (subData) {
            dispatch(updateUserSubscription({
              subscriptionStatus: subData.status,
              subscriptionPlan: subData.plan?.name || subData.planName,
              trialEndDate: subData.endDate || subData.renewalDate
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="card">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary-600 to-secondary-600 flex items-center justify-center">
              <span className="text-white font-bold text-xl">E</span>
            </div>
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
              <input
                {...register('password')}
                type="password"
                placeholder="••••••••"
                className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
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
