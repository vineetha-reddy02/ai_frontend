import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Share2, Award, Users, DollarSign, ArrowLeft, Trophy, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Button from '../../components/Button';
import { referralsService } from '../../services/referrals';
import { useDispatch } from 'react-redux';
import { showToast } from '../../store/uiSlice';

const UserReferrals: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [referralCode, setReferralCode] = useState<string>('');
    const [referralLink, setReferralLink] = useState<string>('');
    const [stats, setStats] = useState<any>({ earnings: 0, referralsCount: 0 });
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchReferralData();
    }, []);

    const fetchReferralData = async () => {
        try {
            setLoading(true);
            const [codeRes, statsRes, historyRes] = await Promise.all([
                referralsService.getMyCode(),
                referralsService.getStats(),
                referralsService.getHistory()
            ]);

            const codeData = (codeRes as any)?.data || codeRes;
            setReferralCode(codeData?.code || '');
            setReferralLink(codeData?.shareableUrl || '');

            const statsData = (statsRes as any)?.data || statsRes;
            setStats({
                earnings: statsData?.totalEarnings || 0,
                referralsCount: statsData?.totalReferrals || 0,
                pendingReferrals: statsData?.pendingReferrals || 0,
                successfulReferrals: statsData?.successfulReferrals || 0
            });

            const historyData = Array.isArray(historyRes) ? historyRes : (historyRes as any)?.data || [];
            setHistory(historyData);

        } catch (error) {
            console.error('Failed to load referrals:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="text-center py-20 text-slate-500 animate-pulse">{t('referrals.loading')}</div>;

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 rounded-xl">
                    <Users className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('referrals.title')}</h1>
                    <p className="text-sm text-slate-500">{t('referrals.subtitle')}</p>
                </div>
            </div>

            {/* Hero Section - Premium Gradient */}
            <div className="glass-card relative overflow-hidden rounded-3xl p-8 text-white shadow-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 border-blue-400/30">
                {/* Decorative Patterns */}
                <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-64 h-64 bg-black/10 rounded-full blur-3xl" />

                <div className="relative z-10 text-center max-w-3xl mx-auto space-y-8">
                    <div className="inline-flex items-center justify-center p-4 bg-white/10 rounded-full backdrop-blur-md border border-white/20 mb-2">
                        <GiftIcon className="w-8 h-8 text-white animate-bounce-subtle" />
                    </div>

                    <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                        {t('referrals.inviteFriends')}
                    </h2>
                    <p className="text-lg text-blue-100 max-w-2xl mx-auto leading-relaxed">
                        {t('referrals.description')}
                    </p>

                    <div className="flex flex-col gap-6 pt-4">
                        {/* Link Section */}
                        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-2 border border-white/20 flex flex-col sm:flex-row items-center gap-2">
                            <div className="flex-1 px-4 py-2 w-full text-center sm:text-left overflow-hidden">
                                <p className="text-xs uppercase tracking-wider text-blue-200 font-bold mb-1">{t('referrals.yourLink')}</p>
                                <p className="font-mono text-sm truncate select-all text-white font-medium">{referralLink}</p>
                            </div>
                            <Button
                                onClick={() => { navigator.clipboard.writeText(referralLink); dispatch(showToast({ message: t('referrals.linkCopied'), type: 'success' })); }}
                                className="w-full sm:w-auto bg-white text-blue-600 hover:bg-blue-50 font-bold px-6 py-3 rounded-xl shadow-lg ring-0 border-0"
                            >
                                <Copy size={18} className="mr-2" /> {t('referrals.copyLink')}
                            </Button>
                        </div>

                        {/* Code Section */}
                        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="text-center sm:text-left">
                                <p className="text-xs uppercase tracking-wider text-blue-200 font-bold mb-1">{t('referrals.yourCode')}</p>
                                <p className="font-mono text-2xl font-bold tracking-widest text-white">{referralCode}</p>
                            </div>
                            <Button
                                onClick={() => { navigator.clipboard.writeText(referralCode); dispatch(showToast({ message: t('referrals.codeCopied'), type: 'success' })); }}
                                className="w-full sm:w-auto bg-white/10 text-white hover:bg-white/20 font-bold px-6 py-2 rounded-xl border border-white/20"
                            >
                                <Copy size={16} className="mr-2" /> {t('referrals.copyCode')}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="glass-panel p-6 rounded-2xl flex flex-col items-center text-center hover:scale-[1.02] transition-transform duration-300">
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mb-4 shadow-inner">
                        <Users size={32} />
                    </div>
                    <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-1">{stats.referralsCount}</h3>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">{t('referrals.friendsJoined')}</p>
                </div>

                <div className="glass-panel p-6 rounded-2xl flex flex-col items-center text-center hover:scale-[1.02] transition-transform duration-300 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-2xl flex items-center justify-center mb-4 shadow-inner relative z-10">
                        <DollarSign size={32} />
                    </div>
                    <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-1 relative z-10">₹{stats.earnings}</h3>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wide relative z-10">{t('referrals.totalEarnings')}</p>
                </div>

                <div className="glass-panel p-6 rounded-2xl flex flex-col items-center text-center hover:scale-[1.02] transition-transform duration-300">
                    <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-2xl flex items-center justify-center mb-4 shadow-inner">
                        <Trophy size={32} />
                    </div>
                    <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-1">Tier 1</h3>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">{t('referrals.yourLevel')}</p>
                </div>
            </div>

            {/* History Table */}
            <div className="glass-panel p-0 rounded-3xl overflow-hidden">
                <div className="p-6 border-b border-slate-200 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-white/5">
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                        <Users size={20} className="text-slate-400" />
                        {t('referrals.history')}
                    </h3>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-white/5 text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-50/50 dark:bg-white/5">
                                <th className="py-3 px-2 sm:py-4 sm:px-6">{t('referrals.user')}</th>
                                <th className="hidden sm:table-cell py-3 px-2 sm:py-4 sm:px-6">{t('referrals.date')}</th>
                                <th className="py-3 px-2 sm:py-4 sm:px-6">{t('referrals.status')}</th>
                                <th className="py-3 px-2 sm:py-4 sm:px-6 text-right">{t('referrals.reward')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {history.length > 0 ? (
                                history.map((item, i) => (
                                    <tr key={i} className="text-xs sm:text-sm hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                        <td className="py-3 px-2 sm:py-4 sm:px-6 font-bold text-slate-900 dark:text-white truncate max-w-[80px] sm:max-w-none">
                                            <div>{item.refereeName || 'Anonymous User'}</div>
                                            <div className="text-[10px] text-slate-500 font-normal sm:hidden">{new Date(item.createdAt).toLocaleDateString()}</div>
                                        </td>
                                        <td className="hidden sm:table-cell py-3 px-2 sm:py-4 sm:px-6 text-slate-500 font-medium whitespace-nowrap">{new Date(item.createdAt).toLocaleDateString()}</td>
                                        <td className="py-3 px-2 sm:py-4 sm:px-6">
                                            <span className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold border ${['converted', 'completed'].includes((item.status || '').toLowerCase())
                                                ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20'
                                                : 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'
                                                }`}>
                                                {item.status ? t(`referrals.${item.status.toLowerCase()}`) : t('referrals.pending')}
                                            </span>
                                        </td>
                                        <td className="py-3 px-2 sm:py-4 sm:px-6 text-right font-bold text-green-600 dark:text-green-400">
                                            {item.rewardAmount ? `₹${item.rewardAmount}` : '-'}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="py-12 text-center text-slate-500 italic">
                                        {t('referrals.noReferrals')}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// Helper Icon
const GiftIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect x="3" y="8" width="18" height="4" rx="1" /><path d="M12 8v13" /><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" /><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5" /></svg>
);

export default UserReferrals;
