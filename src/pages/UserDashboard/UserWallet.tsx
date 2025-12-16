import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wallet, TrendingUp, TrendingDown, Clock, ArrowLeft, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import Button from '../../components/Button';
import { walletService } from '../../services/wallet';
import { useDispatch } from 'react-redux';
import { showToast } from '../../store/uiSlice';

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

    useEffect(() => {
        fetchWalletData();
    }, []);

    const fetchWalletData = async () => {
        try {
            setLoading(true);
            const [balanceRes, transactionsRes] = await Promise.all([
                walletService.getBalance(),
                walletService.getTransactions()
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
            // Sort transactions by date (most recent first)
            const sortedTransactions = txList.sort((a: Transaction, b: Transaction) => {
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });
            setTransactions(sortedTransactions);
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
            routingNumber: '', // Optional/Default
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

    if (loading) return <div className="text-center py-12 text-slate-500">Loading wallet...</div>;

    // Helper function to determine transaction icon and color
    const getTransactionStyle = (type: string) => {
        const lowerType = type.toLowerCase();
        if (lowerType.includes('credit') || lowerType.includes('reward') || lowerType.includes('refund')) {
            return {
                icon: <TrendingUp size={20} />,
                bgColor: 'bg-green-100 dark:bg-green-900/30',
                textColor: 'text-green-600 dark:text-green-400',
                amountColor: 'text-green-600',
                prefix: '+'
            };
        } else {
            return {
                icon: <TrendingDown size={20} />,
                bgColor: 'bg-red-100 dark:bg-red-900/30',
                textColor: 'text-red-600 dark:text-red-400',
                amountColor: 'text-slate-900 dark:text-white',
                prefix: '-'
            };
        }
    };

    // Helper function to get status badge
    const getStatusBadge = (status: string) => {
        switch (status.toLowerCase()) {
            case 'completed':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        <CheckCircle size={12} /> Completed
                    </span>
                );
            case 'pending':
            case 'processing':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                        <AlertCircle size={12} /> {status}
                    </span>
                );
            case 'failed':
            case 'cancelled':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                        <XCircle size={12} /> {status}
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                        {status}
                    </span>
                );
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 rounded-full transition-colors text-blue-600 dark:text-blue-400"
                >
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Wallet</h1>
            </div>

            {/* Balance Card */}
            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>

                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <p className="text-indigo-100 font-medium mb-1 flex items-center gap-2">
                            <Wallet size={18} /> Available Balance
                        </p>
                        <h2 className="text-4xl md:text-5xl font-bold mb-4">₹{walletData.availableBalance.toFixed(2)}</h2>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-indigo-200">Total Balance</p>
                                <p className="font-semibold">₹{walletData.balance.toFixed(2)}</p>
                            </div>
                            <div>
                                <p className="text-indigo-200">Frozen Amount</p>
                                <p className="font-semibold">₹{walletData.frozenAmount.toFixed(2)}</p>
                            </div>
                            <div>
                                <p className="text-indigo-200">Total Earnings</p>
                                <p className="font-semibold text-green-300">₹{walletData.totalEarnings.toFixed(2)}</p>
                            </div>
                            <div>
                                <p className="text-indigo-200">Total Spent</p>
                                <p className="font-semibold text-red-300">₹{walletData.totalSpent.toFixed(2)}</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <Button
                            className="bg-white/20 hover:bg-white/30 text-white border-white/40 border shadow-md"
                            onClick={() => setShowWithdraw(!showWithdraw)}
                        >
                            Withdraw
                        </Button>

                    </div>
                </div>
            </div>

            {/* Withdrawal Form */}
            {showWithdraw && (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 animate-in slide-in-from-top-4">
                    <h3 className="font-bold text-lg mb-4 text-slate-900 dark:text-white">Request Withdrawal</h3>
                    <form onSubmit={handleWithdraw} className="space-y-4 max-w-lg">
                        <div>
                            <label className="block text-sm font-medium mb-1 dark:text-slate-300">Amount (₹)</label>
                            <input name="amount" type="number" min="1" max={walletData.availableBalance} required className="w-full p-2 border rounded dark:bg-slate-900 dark:border-slate-700 dark:text-white" placeholder="0.00" />
                            <p className="text-xs text-slate-500 mt-1">Available: ₹{walletData.availableBalance.toFixed(2)}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-slate-300">Bank Name</label>
                                <input name="bankName" required className="w-full p-2 border rounded dark:bg-slate-900 dark:border-slate-700 dark:text-white" placeholder="Bank Name" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-slate-300">IFSC Code</label>
                                <input name="ifsc" required className="w-full p-2 border rounded dark:bg-slate-900 dark:border-slate-700 dark:text-white" placeholder="IFSC" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 dark:text-slate-300">Account Number</label>
                            <input name="accountNumber" required className="w-full p-2 border rounded dark:bg-slate-900 dark:border-slate-700 dark:text-white" placeholder="Account Number" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 dark:text-slate-300">Account Holder Name</label>
                            <input name="accountHolderName" required className="w-full p-2 border rounded dark:bg-slate-900 dark:border-slate-700 dark:text-white" placeholder="Name as per bank" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 dark:text-slate-300">UPI ID (Optional)</label>
                            <input name="upi" className="w-full p-2 border rounded dark:bg-slate-900 dark:border-slate-700 dark:text-white" placeholder="user@upi" />
                        </div>
                        <div className="flex gap-2 pt-2">
                            <Button type="submit" isLoading={withdrawLoading}>Submit Request</Button>
                            <Button type="button" variant="ghost" onClick={() => setShowWithdraw(false)}>Cancel</Button>
                        </div>
                    </form>
                </div>
            )}

            {/* Transactions */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        <Clock size={18} className="text-slate-400" /> Recent Transactions
                    </h3>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                    {transactions.length > 0 ? (
                        transactions.map((tx) => {
                            const style = getTransactionStyle(tx.type);
                            return (
                                <div key={tx.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="flex items-start gap-4 flex-1">
                                            <div className={`p-2 rounded-full ${style.bgColor} ${style.textColor}`}>
                                                {style.icon}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <p className="font-medium text-slate-900 dark:text-white">{tx.description || tx.type}</p>
                                                    {getStatusBadge(tx.status)}
                                                </div>
                                                <p className="text-xs text-slate-500">
                                                    {new Date(tx.createdAt).toLocaleDateString('en-IN', {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </p>
                                                {tx.failureReason && (
                                                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                                                        Reason: {tx.failureReason}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className={`font-bold ${style.amountColor}`}>
                                            {style.prefix}₹{Math.abs(tx.amount).toFixed(2)}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="p-8 text-center text-slate-500 italic">No recent transactions</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserWallet;

