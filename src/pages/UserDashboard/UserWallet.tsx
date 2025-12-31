import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wallet, TrendingUp, TrendingDown, Clock, ArrowLeft, AlertCircle, CheckCircle, XCircle, Gift, CreditCard, Landmark } from 'lucide-react';
import Button from '../../components/Button';
import { walletService } from '../../services/wallet';
import { referralsService } from '../../services/referrals';
import { useDispatch } from 'react-redux';
import { showToast } from '../../store/uiSlice';
import { useTranslation } from 'react-i18next';

interface WalletBalance {
    balance: number;
    currency: string;
    frozenAmount: number;
    availableBalance: number;
    totalEarnings: number;
    totalSpent: number;
    pendingTransactions: any[];
}

interface Transaction {
    id: string;
    type: string;
    status: string;
    amount: number;
    currency: string;
    description: string;
    relatedEntityId?: string;
    relatedEntityType?: string;
    createdAt: string;
    failureReason?: string;
}

const UserWallet: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { t } = useTranslation();

    const [walletData, setWalletData] = useState<WalletBalance>({
        balance: 0,
        currency: 'INR',
        frozenAmount: 0,
        availableBalance: 0,
        totalEarnings: 0,
        totalSpent: 0,
        pendingTransactions: []
    });
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [referralEarnings, setReferralEarnings] = useState(0);

    useEffect(() => {
        fetchWalletData();
    }, []);

    const fetchWalletData = async () => {
        try {
            setLoading(true);
            const [balanceRes, transactionsRes, referralStatsRes] = await Promise.all([
                walletService.getBalance(),
                walletService.getTransactions(),
                referralsService.getStats().catch(() => ({ data: { totalEarnings: 0 } }))
            ]);

            const balanceData = (balanceRes as any)?.data || balanceRes;
            setWalletData({
                balance: balanceData?.balance || 0,
                currency: balanceData?.currency || 'INR',
                frozenAmount: balanceData?.frozenAmount || 0,
                availableBalance: balanceData?.availableBalance || 0,
                totalEarnings: balanceData?.totalEarnings || 0,
                totalSpent: balanceData?.totalSpent || 0,
                pendingTransactions: balanceData?.pendingTransactions || []
            });

            const txList = Array.isArray(transactionsRes) ? transactionsRes : (transactionsRes as any)?.data || [];
            const sortedTransactions = txList.sort((a: Transaction, b: Transaction) => {
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });
            setTransactions(sortedTransactions);

            const referralData = (referralStatsRes as any)?.data || referralStatsRes;
            setReferralEarnings(referralData?.totalEarnings || 0);
        } catch (error) {
            console.error('Failed to load wallet:', error);
            dispatch(showToast({ message: 'Failed to load wallet info', type: 'error' }));
        } finally {
            setLoading(false);
        }
    };

    const [showWithdraw, setShowWithdraw] = useState(false);
    const [withdrawLoading, setWithdrawLoading] = useState(false);

    const handleWithdraw = async (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        const amount = parseFloat(formData.get('amount') as string);

        if (amount <= 0) {
            dispatch(showToast({ message: 'Invalid amount', type: 'error' }));
            return;
        }

        const bankDetails = {
            bankName: formData.get('bankName') as string,
            accountHolderName: formData.get('accountHolderName') as string,
            accountNumber: formData.get('accountNumber') as string,
            ifsc: formData.get('ifsc') as string,
            routingNumber: '',
            upi: formData.get('upi') as string || ''
        };

        try {
            setWithdrawLoading(true);
            await walletService.withdraw({
                amount,
                currency: 'INR',
                bankDetails
            });
            dispatch(showToast({ message: 'Withdrawal requested successfully', type: 'success' }));
            setShowWithdraw(false);
            fetchWalletData();
        } catch (error) {
            console.error('Withdrawal failed:', error);
            dispatch(showToast({ message: 'Withdrawal failed', type: 'error' }));
        } finally {
            setWithdrawLoading(false);
        }
    };

    if (loading) return <div className="text-center py-20 text-slate-500 animate-pulse">{t('common.loading')}</div>;

    const getPlanTranslationKey = (planName: string) => {
        if (!planName) return null;
        const normalized = planName.toLowerCase().trim();
        if (normalized.includes('free trial')) return 'freeTrial';
        if (normalized.includes('monthly')) return 'monthlyPlan';
        if (normalized.includes('quarterly')) return 'quarterlyPlan';
        if (normalized.includes('yearly') || normalized.includes('annual')) return 'yearlyPlan';
        return null;
    };

    const getTranslatedPlanName = (originalName: string) => {
        const key = getPlanTranslationKey(originalName);
        return key ? t(`subscriptionsPageView.plans.${key}.name`) : originalName;
    };

    const getTranslatedDescription = (description: string) => {
        if (!description) return '';
        if (description.startsWith('Subscription payment for')) {
            const planName = description.replace('Subscription payment for', '').trim();
            const translatedPlan = getTranslatedPlanName(planName);
            return t('wallet.subscriptionPaymentFor', { plan: translatedPlan });
        }
        if (description.toLowerCase() === 'referral reward') {
            return t('wallet.referralReward');
        }
        return description;
    };

    const getTransactionStyle = (type: string) => {
        const lowerType = type.toLowerCase();
        if (lowerType.includes('credit') || lowerType.includes('reward') || lowerType.includes('refund')) {
            return {
                icon: <TrendingUp size={18} />,
                bgColor: 'bg-green-100 dark:bg-green-900/30',
                textColor: 'text-green-600 dark:text-green-400',
                amountColor: 'text-green-600 dark:text-green-400',
                prefix: '+'
            };
        } else {
            return {
                icon: <TrendingDown size={18} />,
                bgColor: 'bg-slate-100 dark:bg-slate-800',
                textColor: 'text-slate-600 dark:text-slate-400',
                amountColor: 'text-slate-900 dark:text-white',
                prefix: '-'
            };
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status.toLowerCase()) {
            case 'completed': return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400 border border-green-200 dark:border-green-500/20"><CheckCircle size={10} /> {t('wallet.completed')}</span>;
            case 'pending':
            case 'processing': return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20"><AlertCircle size={10} /> {t('wallet.pending')}</span>;
            case 'failed':
            case 'cancelled': return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400 border border-red-200 dark:border-red-500/20"><XCircle size={10} /> {status.toLowerCase() === 'failed' ? t('wallet.failed') : t('wallet.cancelled')}</span>;
            default: return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">{status}</span>;
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-indigo-500/10 rounded-xl">
                    <Wallet className="w-6 h-6 text-indigo-500" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('wallet.myWallet')}</h1>
                    <p className="text-sm text-slate-500">{t('wallet.manageFinances')}</p>
                </div>
            </div>

            {/* Balance Card - Premium Glass */}
            <div className="glass-card relative overflow-hidden rounded-3xl p-8 text-white shadow-2xl bg-gradient-to-br from-indigo-700 via-violet-700 to-purple-800 border-indigo-500/30">
                {/* Decorative Patterns */}
                <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse-slow" />
                <div className="absolute bottom-0 left-0 -mb-16 -ml-16 w-64 h-64 bg-black/10 rounded-full blur-3xl" />

                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                    <div>
                        <p className="text-indigo-100 font-bold tracking-wider text-xs uppercase mb-1 flex items-center gap-2">
                            {t('wallet.availableBalance')}
                        </p>
                        <h2 className="text-4xl md:text-5xl font-extrabold mb-6 tracking-tight">₹{walletData.availableBalance.toFixed(2)}</h2>

                        <div className="flex gap-4 md:gap-8 flex-wrap">
                            <div className="pr-4 md:pr-8 border-r border-white/10">
                                <p className="text-indigo-200 text-xs uppercase font-bold tracking-wider mb-1">{t('wallet.totalEarnings')}</p>
                                <p className="font-bold text-lg text-green-300">+₹{walletData.totalEarnings.toFixed(2)}</p>
                            </div>
                            <div className="pr-4 md:pr-8 border-r border-white/10">
                                <p className="text-indigo-200 text-xs uppercase font-bold tracking-wider mb-1">{t('wallet.totalSpent')}</p>
                                <p className="font-bold text-lg text-red-300">-₹{walletData.totalSpent.toFixed(2)}</p>
                            </div>
                            <div>
                                <p className="text-indigo-200 text-xs uppercase font-bold tracking-wider mb-1">{t('wallet.frozenAmount')}</p>
                                <p className="font-bold text-lg text-white/80">₹{walletData.frozenAmount.toFixed(2)}</p>
                            </div>
                        </div>
                    </div>
                    <div className="w-full sm:w-auto">
                        <Button
                            className="w-full sm:w-auto bg-white text-indigo-900 hover:bg-white/90 font-bold px-8 py-4 rounded-xl shadow-xl shadow-black/20"
                            onClick={() => setShowWithdraw(!showWithdraw)}
                        >
                            <span className="flex items-center gap-2">
                                <Landmark size={20} />
                                {t('wallet.withdraw')}
                            </span>
                        </Button>
                    </div>
                </div>
            </div>

            {/* Referral Earnings Card */}
            {referralEarnings > 0 && (
                <div className="glass-panel p-6 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 border-amber-200 dark:border-amber-700/30">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl shadow-lg shadow-orange-500/20 text-white">
                                <Gift size={24} />
                            </div>
                            <div>
                                <p className="text-amber-600 dark:text-amber-400 font-bold text-xs uppercase tracking-wider">{t('wallet.referralEarnings')}</p>
                                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">₹{referralEarnings.toFixed(2)}</h3>
                            </div>
                        </div>
                        <Button
                            onClick={() => navigate('/referrals')}
                            className="bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 hover:bg-amber-50 border border-amber-200 dark:border-amber-700/50"
                        >
                            {t('wallet.viewReferrals')}
                        </Button>
                    </div>
                </div>
            )}

            {/* Withdrawal Form */}
            {showWithdraw && (
                <div className="glass-panel p-8 rounded-3xl animate-in slide-in-from-top-4 fade-in duration-300 border-l-4 border-l-indigo-500">
                    <h3 className="font-bold text-xl mb-6 text-slate-900 dark:text-white flex items-center gap-2">
                        <Landmark className="text-indigo-500" />
                        {t('wallet.requestWithdrawal')}
                    </h3>

                    <form onSubmit={handleWithdraw} className="space-y-6 max-w-2xl">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{t('wallet.amount')} (₹)</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                                <input
                                    name="amount"
                                    type="number"
                                    min="1"
                                    max={walletData.availableBalance}
                                    required
                                    className="glass-input w-full pl-8 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 font-bold text-lg"
                                    placeholder="0.00"
                                />
                            </div>
                            <p className="text-xs font-bold text-indigo-500 mt-2 flex items-center gap-1">
                                <CheckCircle size={12} /> {t('wallet.available')}: ₹{walletData.availableBalance.toFixed(2)}
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">{t('wallet.bankName')}</label>
                                <input name="bankName" required className="glass-input w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50" placeholder="e.g. HDFC Bank" />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">{t('wallet.ifsc')}</label>
                                <input name="ifsc" required className="glass-input w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 uppercase" placeholder="HDFC0001234" />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">{t('wallet.accountNumber')}</label>
                                <input name="accountNumber" required className="glass-input w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50" placeholder="0000000000" />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">{t('wallet.accountHolder')}</label>
                                <input name="accountHolderName" required className="glass-input w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50" placeholder="Name as per bank records" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">{t('wallet.upi')}</label>
                            <input name="upi" className="glass-input w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50" placeholder="username@upi (Optional)" />
                        </div>

                        <div className="flex gap-3 pt-2">
                            <Button type="submit" isLoading={withdrawLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/30 px-8">
                                {t('wallet.submitRequest')}
                            </Button>
                            <Button type="button" variant="ghost" onClick={() => setShowWithdraw(false)}>
                                {t('common.cancel')}
                            </Button>
                        </div>
                    </form>
                </div>
            )}

            {/* Transactions Section */}
            <div className="glass-panel p-0 rounded-3xl overflow-hidden">
                <div className="p-6 border-b border-slate-200 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-white/5">
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                        <Clock size={20} className="text-slate-400" />
                        {t('wallet.recentTransactions')}
                    </h3>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-white/5 max-h-[500px] overflow-y-auto custom-scrollbar">
                    {transactions.length > 0 ? (
                        transactions.map((tx) => {
                            const style = getTransactionStyle(tx.type);
                            return (
                                <div key={tx.id} className="p-3 sm:p-5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                                    <div className="flex justify-between items-start gap-3 sm:gap-4">
                                        <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                                            <div className={`p-2 sm:p-3 rounded-2xl ${style.bgColor} ${style.textColor} group-hover:scale-110 transition-transform shrink-0`}>
                                                {style.icon}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                                                    <p className="font-bold text-slate-900 dark:text-white text-sm sm:text-base truncate">{getTranslatedDescription(tx.description || tx.type)}</p>
                                                    <div className="shrink-0">{getStatusBadge(tx.status)}</div>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                                                    <span>
                                                        {new Date(tx.createdAt).toLocaleDateString('en-IN', {
                                                            year: 'numeric',
                                                            month: 'short',
                                                            day: 'numeric'
                                                        })}
                                                    </span>
                                                    <span>•</span>
                                                    <span>
                                                        {new Date(tx.createdAt).toLocaleTimeString('en-IN', {
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </span>
                                                </div>
                                                {tx.failureReason && (
                                                    <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-medium bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded inline-block">
                                                        Error: {tx.failureReason}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className={`font-extrabold text-lg ${style.amountColor}`}>
                                            {style.prefix}₹{Math.abs(tx.amount).toFixed(2)}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="p-12 text-center text-slate-500">
                            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CreditCard className="w-8 h-8 text-slate-400" />
                            </div>
                            <p className="font-medium">{t('wallet.noTransactions')}</p>
                            <p className="text-sm mt-1">Transactions will appear here once you start earning or spending.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserWallet;
