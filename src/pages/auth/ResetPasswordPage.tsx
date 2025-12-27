import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Button from '../../components/Button';
import { authService } from '../../services/auth';
import { useDispatch } from 'react-redux';
import { showToast } from '../../store/uiSlice';

const schema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/\d/, 'Password must contain at least one digit')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const query = useQuery();
  const [userId, setUserId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    const u = query.get('userId');
    const t = query.get('token');
    setUserId(u);
    setToken(t);
  }, [query]);

  const onSubmit = async (data: FormData) => {
    if (!userId || !token) {
      dispatch(showToast({ message: 'Invalid or missing reset link parameters', type: 'error' }));
      return;
    }

    try {
      setIsLoading(true);
      // Call backend reset method (implement in authService)
      await authService.resetPassword({ userId, token, newPassword: data.password });

      dispatch(showToast({ message: 'Password reset successful. Please login.', type: 'success' }));
      navigate('/login');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to reset password';
      dispatch(showToast({ message: msg, type: 'error' }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="card">
          <h1 className="text-2xl font-bold text-center mb-4 text-slate-900 dark:text-white">Reset Password</h1>

          {!userId || !token ? (
            <div className="p-4 text-center">
              <p className="text-sm text-slate-600 dark:text-slate-400">Invalid or expired reset link.</p>
              <p className="mt-4">
                <Link to="/forgot-password" className="text-primary-600 hover:underline">Request a new reset link</Link>
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">New Password</label>
                <input {...register('password')} type="password" placeholder="••••••••" className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                {errors.password && <p className="text-red-600 text-sm mt-1">{errors.password.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">Confirm Password</label>
                <input {...register('confirmPassword')} type="password" placeholder="••••••••" className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                {errors.confirmPassword && <p className="text-red-600 text-sm mt-1">{errors.confirmPassword.message}</p>}
              </div>

              <Button type="submit" variant="primary" fullWidth isLoading={isLoading}>Set new password</Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
