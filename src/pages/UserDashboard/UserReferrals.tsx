import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Share2, Award, Users, DollarSign, ArrowLeft } from 'lucide-react';
import Button from '../../components/Button';
import { referralsService } from '../../services/referrals';
import { useDispatch } from 'react-redux';
import { showToast } from '../../store/uiSlice';

const UserReferrals: React.FC = () => {
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
            // dispatch(showToast({ message: 'Failed to load referral data', type: 'error' }));
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(referralLink);
        dispatch(showToast({ message: 'Referral link copied!', type: 'success' }));
    };

    if (loading) return <div className="text-center py-12 text-slate-500">Loading referral program...</div>;

    return (
        <div className="space-y-6 md:space-y-8">
            {/* Header */}
            <div className="flex items-center gap-3 md:gap-4">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 rounded-full transition-colors text-blue-600 dark:text-blue-400"
                >
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white">My Referrals</h1>
            </div>

            {/* Hero Section */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl md:rounded-2xl p-6 md:p-8 text-white text-center shadow-lg">
                <h2 className="text-2xl md:text-3xl font-bold mb-2">Invite Friends & Earn Rewards</h2>
                <p className="text-sm md:text-base mb-6 md:mb-8 opacity-90">Get a month of Premium for every friend who joins!</p>

                <div className="max-w-3xl mx-auto flex flex-col gap-6 pt-4">
                    {/* Link Section */}
                    <div className="flex flex-col sm:flex-row gap-4 items-end justify-between">
                        <div className="flex-1 min-w-0 text-left w-full space-y-2">
                            <p className="text-xs uppercase tracking-wider opacity-75 text-blue-100 font-semibold pl-1">Your Referral Link</p>
                            <div className="bg-black/20 px-4 py-3 rounded-xl flex items-center border border-blue-300">
                                <p className="font-mono text-sm truncate select-all text-white w-full">{referralLink}</p>
                            </div>
                        </div>
                        <Button onClick={() => { navigator.clipboard.writeText(referralLink); dispatch(showToast({ message: 'Link copied!', type: 'success' })); }} className="bg-white/20 text-white hover:bg-white/30 border border-white/40 shadow-lg shrink-0 whitespace-nowrap px-8 py-3 rounded-xl h-[46px]">
                            <Copy size={18} className="mr-2" /> Copy Link
                        </Button>
                    </div>

                    {/* Code Section */}
                    <div className="flex flex-col sm:flex-row gap-4 items-end justify-between">
                        <div className="flex-1 min-w-0 text-left w-full space-y-2">
                            <p className="text-xs uppercase tracking-wider opacity-75 text-blue-100 font-semibold pl-1">Your Referral Code</p>
                            <div className="bg-black/20 px-4 py-3 rounded-xl flex items-center border border-blue-300">
                                <p className="font-mono text-xl font-bold tracking-widest text-white w-full">{referralCode}</p>
                            </div>
                        </div>
                        <Button onClick={() => { navigator.clipboard.writeText(referralCode); dispatch(showToast({ message: 'Code copied!', type: 'success' })); }} className="bg-white/20 text-white hover:bg-white/30 border border-white/40 shadow-lg shrink-0 whitespace-nowrap px-8 py-3 rounded-xl h-[46px]">
                            <Copy size={18} className="mr-2" /> Copy Code
                        </Button>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                <div className="card text-center p-4 md:p-6">
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Users size={24} />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{stats.referralsCount}</h3>
                    <p className="text-slate-500">Friends Joined</p>
                </div>
                <div className="card text-center p-6">
                    <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <DollarSign size={24} />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white">₹{stats.earnings}</h3>
                    <p className="text-slate-500">Total Earnings</p>
                </div>
                <div className="card text-center p-6">
                    <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Award size={24} />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Tier 1</h3>
                    <p className="text-slate-500">Your Level</p>
                </div>
            </div>

            {/* History */}
            <div className="card">
                <h3 className="text-base md:text-lg font-bold mb-4 text-slate-900 dark:text-white">Referral History</h3>
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                    <table className="w-full min-w-[640px] text-left">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-700 text-sm text-slate-500">
                                <th className="pb-3 px-4">User</th>
                                <th className="pb-3 px-4">Date</th>
                                <th className="pb-3 px-4">Status</th>
                                <th className="pb-3 px-4 text-right">Reward</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {history.length > 0 ? (
                                history.map((item, i) => (
                                    <tr key={i} className="text-sm">
                                        <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">{item.refereeName || 'Anonymous User'}</td>
                                        <td className="py-3 px-4 text-slate-500">{new Date(item.createdAt).toLocaleDateString()}</td>
                                        <td className="py-3 px-4">
                                            <span className={`px-2 py-1 rounded-full text-xs ${item.status === 'converted' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                {item.status || 'Pending'}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-right font-medium text-green-600">
                                            {item.rewardAmount ? `₹${item.rewardAmount}` : '-'}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="py-8 text-center text-slate-500 italic">No referrals yet. Share your link!</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default UserReferrals;

