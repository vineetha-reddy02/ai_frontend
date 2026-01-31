import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link, useParams } from 'react-router-dom';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { CheckCircle2, XCircle, Loader2, ArrowRight, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { authService } from '../../services/auth';
import Button from '../../components/Button';
import { Logo } from '../../components/common/Logo';

const VerifyEmailPage: React.FC = () => {
    const { t } = useTranslation();
    const [searchParams] = useSearchParams();
    const { token: paramsToken } = useParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');
    const [countdown, setCountdown] = useState(5);
    const verificationStarted = React.useRef(false);

    const token = paramsToken || searchParams.get('token');
    const email = searchParams.get('email');

    useEffect(() => {
        const verify = async () => {
            if (verificationStarted.current) return;

            if (!token || !email) {
                setStatus('error');
                setMessage(t('auth.verifyEmail.invalidLink'));
                return;
            }

            try {
                verificationStarted.current = true;
                await authService.verifyEmail(email, token);
                setStatus('success');
                setMessage(t('auth.verifyEmail.successMessage'));
            } catch (error: any) {
                console.error('Verification error:', error);
                setStatus('error');
                setMessage(error.response?.data?.message || t('auth.verifyEmail.errorMessage'));
            }
        };

        verify();
    }, [token, email, t]);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (status === 'success' && countdown > 0) {
            timer = setInterval(() => {
                setCountdown((prev) => prev - 1);
            }, 1000);
        } else if (status === 'success' && countdown === 0) {
            navigate('/login');
        }
        return () => clearInterval(timer);
    }, [status, countdown, navigate]);

    const containerVariants: Variants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.5, ease: "easeOut" }
        },
        exit: { opacity: 0, y: -20 }
    };

    const iconVariants: Variants = {
        hidden: { scale: 0, opacity: 0 },
        loading: { rotate: 360, transition: { duration: 1, repeat: Infinity, ease: "linear" } },
        success: { scale: [0, 1.2, 1], opacity: 1, transition: { duration: 0.5, times: [0, 0.7, 1] } },
        error: { x: [-10, 10, -10, 10, 0], opacity: 1, transition: { duration: 0.4 } }
    };

    return (
        <div className="min-h-dvh bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4">
            {/* Background Decor */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-500/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px]" />
            </div>

            <div className="w-full max-w-md z-10">
                <div className="flex justify-center mb-8">
                    <Logo className="scale-125" />
                </div>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={status}
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="card bg-white dark:bg-slate-800/50 backdrop-blur-xl border border-slate-200 dark:border-slate-700/50 shadow-2xl shadow-slate-200/50 dark:shadow-none p-8 rounded-3xl text-center"
                    >
                        {status === 'loading' && (
                            <div className="py-8">
                                <motion.div
                                    variants={iconVariants}
                                    animate="loading"
                                    className="w-20 h-20 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-full flex items-center justify-center mx-auto mb-6"
                                >
                                    <Loader2 size={40} />
                                </motion.div>
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                                    {t('auth.verifyEmail.verifyingAccount')}
                                </h2>
                                <p className="text-slate-600 dark:text-slate-400">
                                    {t('auth.verifyEmail.pleaseWait')}
                                </p>
                            </div>
                        )}

                        {status === 'success' && (
                            <div className="py-4">
                                <motion.div
                                    variants={iconVariants}
                                    initial="hidden"
                                    animate="success"
                                    className="w-24 h-24 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-6"
                                >
                                    <CheckCircle2 size={48} />
                                </motion.div>
                                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">
                                    {t('auth.verifyEmail.success')}
                                </h2>
                                <p className="text-lg text-slate-600 dark:text-slate-300 mb-6">
                                    {message}
                                </p>
                                <div className="bg-slate-50 dark:bg-slate-800/80 rounded-2xl p-4 mb-8">
                                    <p className="text-sm text-slate-600 dark:text-slate-400">
                                        {t('auth.verifyEmail.redirecting')} <span className="font-bold text-primary-600 dark:text-primary-400">{countdown}s</span>...
                                    </p>
                                </div>
                                <Button
                                    onClick={() => navigate('/login')}
                                    variant="primary"
                                    fullWidth
                                    className="flex items-center justify-center gap-2 group h-12"
                                >
                                    {t('auth.verifyEmail.goToLogin')}
                                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </Button>
                            </div>
                        )}

                        {status === 'error' && (
                            <div className="py-4">
                                <motion.div
                                    variants={iconVariants}
                                    animate="error"
                                    className="w-24 h-24 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-6"
                                >
                                    <XCircle size={48} />
                                </motion.div>
                                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">
                                    {t('auth.verifyEmail.error')}
                                </h2>
                                <p className="text-lg text-slate-600 dark:text-slate-300 mb-8 leading-relaxed">
                                    {message || t('auth.verifyEmail.errorMessage')}
                                </p>
                                <div className="space-y-3">
                                    <Button
                                        onClick={() => navigate('/resend-confirmation')}
                                        variant="primary"
                                        fullWidth
                                        className="flex items-center justify-center gap-2 h-12"
                                    >
                                        <Mail size={18} />
                                        {t('auth.verifyEmail.requestNewLink')}
                                    </Button>
                                    <Link
                                        to="/login"
                                        className="block text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 font-medium transition-colors"
                                    >
                                        {t('auth.verifyEmail.backToLogin')}
                                    </Link>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};

export default VerifyEmailPage;
