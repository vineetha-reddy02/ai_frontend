import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign, Users, TrendingUp, Settings, FileText,
  AlertCircle, CheckCircle, XCircle, ArrowLeft, Wallet, RefreshCcw, Eye
} from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import Button from '../../components/Button';
import { showToast } from '../../store/uiSlice';
import { adminPaymentsService, AdminPaymentTransaction, AdminWithdrawalRequest, AdminRefundRequest, UserDetail } from '../../services/adminPayments';

const AdminPaymentsPage: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'transactions' | 'withdrawals' | 'refunds' | 'adjustments'>('transactions');
  const [isLoading, setIsLoading] = useState(false);

  // Data States
  const [transactions, setTransactions] = useState<AdminPaymentTransaction[]>([]);
  const [allTransactions, setAllTransactions] = useState<AdminPaymentTransaction[]>([]); // Store all transactions
  const [withdrawals, setWithdrawals] = useState<AdminWithdrawalRequest[]>([]);
  const [refunds, setRefunds] = useState<AdminRefundRequest[]>([]);

  // Filter States
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');

  // Modal States
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<AdminWithdrawalRequest | null>(null);
  const [selectedRefund, setSelectedRefund] = useState<AdminRefundRequest | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<AdminPaymentTransaction | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'complete' | null>(null);
  const [actionNote, setActionNote] = useState('');

  // Wallet Adjustment State
  const [adjustmentData, setAdjustmentData] = useState({
    userId: '',
    amount: 0,
    type: 'Credit' as 'Credit' | 'Debit',
    reason: ''
  });
  const [searchedUser, setSearchedUser] = useState<UserDetail | null>(null);
  const [userTransactions, setUserTransactions] = useState<AdminPaymentTransaction[]>([]);
  const [isFetchingUser, setIsFetchingUser] = useState(false);

  useEffect(() => {
    fetchData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchData();
    }, 30000);
    return () => clearInterval(interval);
  }, [activeTab]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'transactions') {
        const res = await adminPaymentsService.getTransactions();
        console.log('📊 Raw transactions:', res);
        // Sort transactions in descending order (newest first)
        const sortedTransactions = (res || []).sort((a, b) => {
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          return dateB - dateA; // Descending order (newest first)
        });
        console.log('✅ Sorted transactions (newest first):', sortedTransactions.map(t => ({ id: t.id, date: t.createdAt })));
        setAllTransactions(sortedTransactions); // Store all
        applyFilters(sortedTransactions); // Apply current filters
      } else if (activeTab === 'withdrawals') {
        const res = await adminPaymentsService.getPendingWithdrawals();
        setWithdrawals(res || []);
      } else if (activeTab === 'refunds') {
        const res = await adminPaymentsService.getPendingRefunds();
        setRefunds(res || []);
      }
    } catch (error: any) {
      console.error('Failed to fetch data:', error);
      // dispatch(showToast({ message: 'Failed to load data', type: 'error' }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleWithdrawalAction = async () => {
    if (!selectedWithdrawal || !actionType) return;
    setIsLoading(true);
    try {
      if (actionType === 'approve') {
        if (!actionNote.trim()) {
          dispatch(showToast({ message: 'Reference number is required for manual approval', type: 'error' }));
          setIsLoading(false);
          return;
        }
        await adminPaymentsService.approveWithdrawal(selectedWithdrawal.id, actionNote);
        dispatch(showToast({ message: 'Withdrawal Manually Approved', type: 'success' }));
      } else if (actionType === 'reject') {
        if (!actionNote.trim()) {
          dispatch(showToast({ message: 'Rejection reason is required', type: 'error' }));
          setIsLoading(false);
          return;
        }
        await adminPaymentsService.rejectWithdrawal(selectedWithdrawal.id, actionNote);
        dispatch(showToast({ message: 'Withdrawal Rejected', type: 'success' }));
      }
      setSelectedWithdrawal(null);
      setActionType(null);
      setActionNote('');
      fetchData();
    } catch (error: any) {
      dispatch(showToast({ message: error.response?.data?.detail || 'Action failed', type: 'error' }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefundAction = async () => {
    if (!selectedRefund || !actionType) return;
    setIsLoading(true);
    try {
      if (actionType === 'approve') {
        await adminPaymentsService.approveRefund(selectedRefund.id, actionNote);
        dispatch(showToast({ message: 'Refund Approved', type: 'success' }));
      } else if (actionType === 'reject') {
        await adminPaymentsService.rejectRefund(selectedRefund.id, actionNote);
        dispatch(showToast({ message: 'Refund Rejected', type: 'success' }));
      }
      setSelectedRefund(null);
      setActionType(null);
      setActionNote('');
      fetchData();
    } catch (error: any) {
      dispatch(showToast({ message: error.response?.data?.detail || 'Action failed', type: 'error' }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleWalletAdjustment = async () => {
    if (!adjustmentData.userId || adjustmentData.amount <= 0) {
      dispatch(showToast({ message: 'Please provide user ID and amount', type: 'error' }));
      return;
    }
    setIsLoading(true);
    try {
      await adminPaymentsService.adjustWalletBalance(adjustmentData);
      dispatch(showToast({ message: 'Wallet Balance Adjusted', type: 'success' }));
      setAdjustmentData({ ...adjustmentData, amount: 0, reason: '' });
      // Refresh user data after adjustment
      handleFetchUser(adjustmentData.userId);
      fetchData();
    } catch (error: any) {
      dispatch(showToast({ message: error.response?.data?.detail || 'Adjustment failed', type: 'error' }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleFetchUser = async (userId: string) => {
    if (!userId) return;
    setIsFetchingUser(true);
    try {
      const [user, txns] = await Promise.all([
        adminPaymentsService.getUserDetails(userId),
        adminPaymentsService.getUserTransactions(userId)
      ]);
      setSearchedUser(user);
      setUserTransactions(txns);
    } catch (error: any) {
      console.error('Failed to fetch user:', error);
      setSearchedUser(null);
      setUserTransactions([]);
      dispatch(showToast({ message: 'User not found or fetch failed', type: 'error' }));
    } finally {
      setIsFetchingUser(false);
    }
  };

  const handleViewTransactionDetails = async (transactionId: string) => {
    try {
      // Find transaction from existing list instead of API call
      const transaction = transactions.find(t => t.id === transactionId);
      if (transaction) {
        setSelectedTransaction(transaction);
      } else {
        dispatch(showToast({ message: 'Transaction not found', type: 'error' }));
      }
    } catch (error: any) {
      dispatch(showToast({ message: 'Failed to load transaction details', type: 'error' }));
    }
  };

  // Apply filters to transactions
  const applyFilters = (transactionsToFilter: AdminPaymentTransaction[] = allTransactions) => {
    let filtered = [...transactionsToFilter];

    // Apply status filter
    if (statusFilter) {
      filtered = filtered.filter(t => (t.status || '').toLowerCase() === statusFilter.toLowerCase());
    }

    // Apply type filter
    if (typeFilter) {
      // Handle special case for "Referral Reward" which might be "referral_reward" or "ReferralReward"
      if (typeFilter === 'ReferralReward') {
        filtered = filtered.filter(t =>
          (t.type || '').toLowerCase() === 'referralreward' ||
          (t.type || '').toLowerCase() === 'referral_reward'
        );
      } else {
        filtered = filtered.filter(t => (t.type || '').toLowerCase() === typeFilter.toLowerCase());
      }
    }

    console.log(`🔍 Filtered transactions: ${filtered.length} of ${transactionsToFilter.length}`);
    setTransactions(filtered);
  };

  // Re-apply filters when filter values change
  useEffect(() => {
    if (allTransactions.length > 0) {
      applyFilters();
    }
  }, [statusFilter, typeFilter]);

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <button
              onClick={() => navigate('/admin')}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-slate-600 dark:text-slate-400" />
            </button>
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white">Payment Management</h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400 ml-14">
            Manage transactions, withdrawals, and refunds
          </p>
        </div>

        {/* Tabs */}
        <div className="flex space-x-4 mb-8 border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
          {[
            { id: 'transactions', label: 'Transactions', icon: DollarSign },
            { id: 'withdrawals', label: 'Withdrawals', icon: Wallet },
            { id: 'refunds', label: 'Refunds', icon: RefreshCcw },
            { id: 'adjustments', label: 'Wallet Adjustments', icon: Settings },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === 'transactions' && (
          <>
            {/* Filters */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Status Filter
                  </label>
                  <select
                    value={statusFilter}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="">All Statuses</option>
                    <option value="Completed">Completed</option>
                    <option value="Pending">Pending</option>
                    <option value="Failed">Failed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Type Filter
                  </label>
                  <select
                    value={typeFilter}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    onChange={(e) => setTypeFilter(e.target.value)}
                  >
                    <option value="">All Types</option>
                    <option value="Payment">Payment</option>
                    <option value="Refund">Refund</option>
                    <option value="Withdrawal">Withdrawal</option>
                    <option value="ReferralReward">Referral Reward</option>
                    <option value="SubscriptionPayment">Subscription Payment</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={fetchData}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                  >
                    Refresh
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">ID</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">User</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">Type</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">Amount</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">Status</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">Date</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {isLoading ? (
                      <tr><td colSpan={6} className="p-8 text-center">Loading...</td></tr>
                    ) : transactions.length === 0 ? (
                      <tr><td colSpan={6} className="p-8 text-center text-slate-500">No transactions found</td></tr>
                    ) : (
                      transactions.map((txn) => (
                        <tr key={txn.id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                          <td className="px-6 py-4 text-sm font-mono text-slate-500">{txn.id.toString().substring(0, 8)}...</td>
                          <td className="px-6 py-4 text-sm">
                            <div className="font-medium text-slate-900 dark:text-white">{(txn as any).userName || 'Unknown'}</div>
                            <div className="text-xs text-slate-500">{(txn as any).email}</div>
                            <div className="text-xs text-slate-400">{(txn as any).phoneNumber || 'No phone'}</div>
                          </td>
                          <td className="px-6 py-4 text-sm">{txn.type}</td>
                          <td className={`px-6 py-4 text-sm font-bold ${txn.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {txn.currency} {txn.amount}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${txn.status === 'Completed' ? 'bg-green-100 text-green-800' :
                              txn.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                              {txn.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500">
                            {new Date(txn.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <button
                              onClick={() => handleViewTransactionDetails(txn.id)}
                              className="flex items-center gap-1 px-3 py-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            >
                              <Eye size={16} />
                              <span>Details</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {activeTab === 'withdrawals' && (
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">User</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">Amount</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">Bank</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {isLoading ? (
                  <tr><td colSpan={5} className="p-8 text-center">Loading...</td></tr>
                ) : withdrawals.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-slate-500">No pending withdrawals</td></tr>
                ) : (
                  withdrawals.map((w) => (
                    <tr key={w.id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                      <td className="px-6 py-4 text-sm">
                        <div className="font-medium text-slate-900 dark:text-white">{(w as any).userName || 'Unknown'}</div>
                        <div className="text-xs text-slate-500">{(w as any).email}</div>
                        <div className="text-xs text-slate-400">{(w as any).phoneNumber || 'No phone'}</div>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-900 dark:text-white">
                        {w.currency} {w.amount}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {w.bankName} - {w.accountNumber}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                          {w.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm flex gap-2">
                        <Button size="sm" onClick={() => { setSelectedWithdrawal(w); setActionType('approve'); }}>Approve & Pay</Button>
                        <Button size="sm" variant="danger" onClick={() => { setSelectedWithdrawal(w); setActionType('reject'); }}>Reject</Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'refunds' && (
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">Txn ID</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">User</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">Amount</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">Reason</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {isLoading ? (
                  <tr><td colSpan={5} className="p-8 text-center">Loading...</td></tr>
                ) : refunds.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-slate-500">No pending refunds</td></tr>
                ) : (
                  refunds.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                      <td className="px-6 py-4 text-sm font-mono">{r.transactionId}</td>
                      <td className="px-6 py-4 text-sm">
                        <div className="font-medium text-slate-900 dark:text-white">{(r as any).userName || 'Unknown'}</div>
                        <div className="text-xs text-slate-500">{(r as any).email}</div>
                        <div className="text-xs text-slate-400">{(r as any).phoneNumber || 'No phone'}</div>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-900 dark:text-white">
                        {r.currency} {r.amount}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {r.reason}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800">
                          {r.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm flex gap-2">
                        <Button size="sm" onClick={() => { setSelectedRefund(r); setActionType('approve'); }}>Approve</Button>
                        <Button size="sm" variant="danger" onClick={() => { setSelectedRefund(r); setActionType('reject'); }}>Reject</Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'adjustments' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Manual Wallet Adjustment</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">User ID</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={adjustmentData.userId}
                        onChange={(e) => setAdjustmentData({ ...adjustmentData, userId: e.target.value })}
                        className="flex-1 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                        placeholder="Enter user ID"
                      />
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleFetchUser(adjustmentData.userId)}
                        isLoading={isFetchingUser}
                      >
                        Fetch
                      </Button>
                    </div>
                  </div>

                  {searchedUser && (
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-lg space-y-4">
                      {/* Personal Info */}
                      <div>
                        <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Personal Information</h4>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                          <div className="col-span-2">
                            <span className="text-xs text-slate-500 block">Full Name</span>
                            <span className="text-sm font-medium text-slate-900 dark:text-white">{searchedUser.fullName}</span>
                          </div>
                          <div>
                            <span className="text-xs text-slate-500 block">Email</span>
                            <span className="text-sm font-medium text-slate-900 dark:text-white truncate block" title={searchedUser.email}>{searchedUser.email}</span>
                          </div>
                          <div>
                            <span className="text-xs text-slate-500 block">Phone</span>
                            <span className="text-sm font-medium text-slate-900 dark:text-white">{searchedUser.phoneNumber || 'N/A'}</span>
                          </div>
                        </div>
                      </div>

                      {/* System Info */}
                      <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                        <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">System Details</h4>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                          <div>
                            <span className="text-xs text-slate-500 block">Role</span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${searchedUser.role === 'Instructor' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                              {searchedUser.role}
                            </span>
                          </div>
                          <div>
                            <span className="text-xs text-slate-500 block">Joined</span>
                            <span className="text-sm font-medium text-slate-900 dark:text-white">
                              {searchedUser.createdAt ? new Date(searchedUser.createdAt).toLocaleDateString() : 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Financial Info */}
                      <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                        <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Financial & Status</h4>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                          <div>
                            <span className="text-xs text-slate-500 block">Wallet Balance</span>
                            <span className="text-lg font-bold text-green-600 dark:text-green-400">₹{searchedUser.walletBalance}</span>
                          </div>
                          <div>
                            <span className="text-xs text-slate-500 block">Current Plan</span>
                            <span className="text-sm font-bold text-orange-600 dark:text-orange-400">{searchedUser.planName || 'No Plan'}</span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-xs text-slate-500 block">Subscription Status</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${searchedUser.subscriptionStatus === 'active' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'}`}>
                              {searchedUser.subscriptionStatus || 'None'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Amount</label>
                      <input
                        type="number"
                        value={adjustmentData.amount}
                        onChange={(e) => setAdjustmentData({ ...adjustmentData, amount: parseFloat(e.target.value) || 0 })}
                        className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Type</label>
                      <select
                        value={adjustmentData.type}
                        onChange={(e) => setAdjustmentData({ ...adjustmentData, type: e.target.value as 'Credit' | 'Debit' })}
                        className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                      >
                        <option value="Credit">Credit (Add)</option>
                        <option value="Debit">Debit (Deduct)</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Reason</label>
                    <textarea
                      value={adjustmentData.reason}
                      onChange={(e) => setAdjustmentData({ ...adjustmentData, reason: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                      rows={3}
                      placeholder="Reason for adjustment"
                    />
                  </div>
                  <div className="flex justify-end pt-4">
                    <Button onClick={handleWalletAdjustment} isLoading={isLoading} disabled={!searchedUser}>
                      Submit Adjustment
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Transaction History</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Recent wallet activity for the selected user</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {isFetchingUser ? (
                        <tr><td colSpan={4} className="p-8 text-center">Loading history...</td></tr>
                      ) : userTransactions.length === 0 ? (
                        <tr><td colSpan={4} className="p-8 text-center text-slate-500">No transactions found</td></tr>
                      ) : (
                        userTransactions.map((txn) => (
                          <tr key={txn.id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                            <td className="px-6 py-4 text-sm text-slate-500">
                              {new Date(txn.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 text-sm capitalize">{txn.type}</td>
                            <td className={`px-6 py-4 text-sm font-bold ${txn.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              ₹{txn.amount}
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate" title={txn.description}>
                              {txn.description}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Confirm Action Modal */}
        {(selectedWithdrawal || selectedRefund) && actionType && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg max-w-md w-full p-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 capitalize">
                {actionType} {selectedWithdrawal ? 'Withdrawal' : 'Refund'}
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                {actionType === 'approve' ? 'Are you sure you want to approve this withdrawal? Please ensure you have transferred the funds manually before confirming.' : `Are you sure you want to ${actionType} this request?`}
              </p>

              {actionType === 'approve' && selectedWithdrawal && (
                <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-xs text-yellow-700 dark:text-yellow-400 font-medium flex items-center gap-2">
                    ⚠️ <strong>Manual Payout:</strong> You must transfer ₹{selectedWithdrawal.amount} to the bank details below and provide the transaction reference ID.
                  </p>
                  <div className="mt-2 text-[10px] text-slate-500 font-mono">
                    {selectedWithdrawal.bankName} - {selectedWithdrawal.accountNumber} ({selectedWithdrawal.ifsc})
                  </div>
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {actionType === 'reject' ? 'Rejection Reason' : 'Bank Transfer Reference ID'}
                </label>
                <textarea
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700"
                  rows={3}
                />
              </div>

              <div className="flex gap-3 justify-end">
                <Button variant="secondary" onClick={() => {
                  setSelectedWithdrawal(null);
                  setSelectedRefund(null);
                  setActionType(null);
                }}>
                  Cancel
                </Button>
                <Button
                  variant={actionType === 'reject' ? 'danger' : 'primary'}
                  onClick={selectedWithdrawal ? handleWithdrawalAction : handleRefundAction}
                  isLoading={isLoading}
                >
                  Confirm
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Transaction Detail Modal */}
        {selectedTransaction && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Transaction Details</h2>
                <button
                  onClick={() => setSelectedTransaction(null)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <XCircle className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Transaction ID */}
                <div className="border-b border-slate-200 dark:border-slate-700 pb-3">
                  <label className="text-sm font-medium text-slate-500 dark:text-slate-400">Transaction ID</label>
                  <p className="text-base font-mono text-slate-900 dark:text-white mt-1">{selectedTransaction.transactionId || selectedTransaction.id}</p>
                </div>

                {/* Merchant Order ID */}
                {selectedTransaction.merchantOrderId && (
                  <div className="border-b border-slate-200 dark:border-slate-700 pb-3">
                    <label className="text-sm font-medium text-slate-500 dark:text-slate-400">Merchant Order ID</label>
                    <p className="text-base font-mono text-slate-900 dark:text-white mt-1">{selectedTransaction.merchantOrderId}</p>
                  </div>
                )}

                {/* Payment Provider Transaction ID */}
                {selectedTransaction.paymentProviderTransactionId && (
                  <div className="border-b border-slate-200 dark:border-slate-700 pb-3">
                    <label className="text-sm font-medium text-slate-500 dark:text-slate-400">Payment Provider Transaction ID</label>
                    <p className="text-base font-mono text-slate-900 dark:text-white mt-1">{selectedTransaction.paymentProviderTransactionId}</p>
                  </div>
                )}

                {/* Status */}
                <div className="border-b border-slate-200 dark:border-slate-700 pb-3">
                  <label className="text-sm font-medium text-slate-500 dark:text-slate-400">Status</label>
                  <div className="mt-1">
                    <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${selectedTransaction.status === 'Completed' ? 'bg-green-100 text-green-800' :
                      selectedTransaction.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                      {selectedTransaction.status}
                    </span>
                  </div>
                </div>

                {/* Amount & Currency */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="border-b border-slate-200 dark:border-slate-700 pb-3">
                    <label className="text-sm font-medium text-slate-500 dark:text-slate-400">Amount</label>
                    <p className={`text-xl font-bold mt-1 ${selectedTransaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {selectedTransaction.amount}
                    </p>
                  </div>
                  <div className="border-b border-slate-200 dark:border-slate-700 pb-3">
                    <label className="text-sm font-medium text-slate-500 dark:text-slate-400">Currency</label>
                    <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">{selectedTransaction.currency}</p>
                  </div>
                </div>

                {/* Description */}
                {selectedTransaction.description && (
                  <div className="border-b border-slate-200 dark:border-slate-700 pb-3">
                    <label className="text-sm font-medium text-slate-500 dark:text-slate-400">Description</label>
                    <p className="text-base text-slate-900 dark:text-white mt-1">{selectedTransaction.description}</p>
                  </div>
                )}

                {/* Payment Method Type */}
                {selectedTransaction.paymentMethodType && (
                  <div className="border-b border-slate-200 dark:border-slate-700 pb-3">
                    <label className="text-sm font-medium text-slate-500 dark:text-slate-400">Payment Method</label>
                    <p className="text-base text-slate-900 dark:text-white mt-1">{selectedTransaction.paymentMethodType}</p>
                  </div>
                )}

                {/* Type */}
                {selectedTransaction.type && (
                  <div className="border-b border-slate-200 dark:border-slate-700 pb-3">
                    <label className="text-sm font-medium text-slate-500 dark:text-slate-400">Transaction Type</label>
                    <p className="text-base text-slate-900 dark:text-white mt-1">{selectedTransaction.type}</p>
                  </div>
                )}

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="border-b border-slate-200 dark:border-slate-700 pb-3">
                    <label className="text-sm font-medium text-slate-500 dark:text-slate-400">Created At</label>
                    <p className="text-base text-slate-900 dark:text-white mt-1">
                      {new Date(selectedTransaction.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {selectedTransaction.completedAt && (
                    <div className="border-b border-slate-200 dark:border-slate-700 pb-3">
                      <label className="text-sm font-medium text-slate-500 dark:text-slate-400">Completed At</label>
                      <p className="text-base text-slate-900 dark:text-white mt-1">
                        {new Date(selectedTransaction.completedAt).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>

                {/* Failure Reason */}
                {selectedTransaction.failureReason && (
                  <div className="border-b border-slate-200 dark:border-slate-700 pb-3">
                    <label className="text-sm font-medium text-slate-500 dark:text-slate-400">Failure Reason</label>
                    <p className="text-base text-red-600 dark:text-red-400 mt-1">{selectedTransaction.failureReason}</p>
                  </div>
                )}

                {/* Related Entity */}
                {selectedTransaction.relatedEntityType && selectedTransaction.relatedEntityId && (
                  <div className="border-b border-slate-200 dark:border-slate-700 pb-3">
                    <label className="text-sm font-medium text-slate-500 dark:text-slate-400">Related Entity</label>
                    <p className="text-base text-slate-900 dark:text-white mt-1">
                      {selectedTransaction.relatedEntityType}: {selectedTransaction.relatedEntityId}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                <Button variant="secondary" onClick={() => setSelectedTransaction(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminPaymentsPage;
