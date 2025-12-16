import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Tag, Search, Filter, Calendar, TrendingUp, X, ArrowLeft, Check, Copy } from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import Button from '../../components/Button';
import { couponsService } from '../../services/coupons';
import { subscriptionsService } from '../../services/subscriptions';

import { useDispatch } from 'react-redux';
import { showToast } from '../../store/uiSlice';
import { Coupon, DiscountType, ApplicabilityType } from '../../types';

interface PlanOption {
    id: string;
    name: string;
}

interface QuizOption {
    id: string;
    title: string;
}

const AdminCouponsPage: React.FC = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [filteredCoupons, setFilteredCoupons] = useState<Coupon[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
    const [creating, setCreating] = useState(false);
    const [updating, setUpdating] = useState(false);

    // Data options for selection
    const [planOptions, setPlanOptions] = useState<PlanOption[]>([]);
    const [quizOptions, setQuizOptions] = useState<QuizOption[]>([]);

    // Form states for multi-selection
    const [selectedPlans, setSelectedPlans] = useState<string[]>([]);
    const [selectedQuizzes, setSelectedQuizzes] = useState<string[]>([]);
    const [createApplicableType, setCreateApplicableType] = useState<number>(ApplicabilityType.AllSubscriptions);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'Active' | 'Inactive' | 'Expired'>('all');
    const [applicableToFilter, setApplicableToFilter] = useState<'all' | 'Quiz' | 'Plan' | 'Both'>('all');

    useEffect(() => {
        fetchCoupons();
        fetchOptions();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [coupons, searchTerm, statusFilter, applicableToFilter]);

    const fetchOptions = async () => {
        try {
            // Fetch Plans
            const plansRes = await subscriptionsService.getPlans();
            const plansData = (plansRes as any)?.data || (Array.isArray(plansRes) ? plansRes : []);
            setPlanOptions(plansData);

            // Quizzes fetching disabled as per request
            setQuizOptions([]);
        } catch (error) {
            console.error('Failed to fetch options:', error);
            dispatch(showToast({ message: 'Failed to load plan options', type: 'error' }));
        }
    };

    const fetchCoupons = async () => {
        try {
            setLoading(true);
            const res = await couponsService.list();
            const data = (res as any)?.data || (Array.isArray(res) ? res : []);
            setCoupons(data);
        } catch (error) {
            console.error('Failed to fetch coupons:', error);
            dispatch(showToast({ message: 'Failed to load coupons', type: 'error' }));
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        let filtered = [...coupons];

        // Search filter
        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            filtered = filtered.filter(c =>
                c.code.toLowerCase().includes(search) ||
                c.description.toLowerCase().includes(search)
            );
        }

        // Status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter(c => c.status === statusFilter);
        }

        // ApplicableTo filter
        if (applicableToFilter !== 'all') {
            filtered = filtered.filter(c => {
                const type = c.applicableTo;
                // Map API enum string/number to filter logic
                if (applicableToFilter === 'Both') return type === 'AllSubscriptions' || type === 'Both' || type === 1;
                if (applicableToFilter === 'Quiz') return type === 'SpecificQuizzes' || type === 'Quiz' || type === 2;
                if (applicableToFilter === 'Plan') return type === 'SpecificPlans' || type === 'Plan' || type === 3;
                return true;
            });
        }

        setFilteredCoupons(filtered);
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);

        // Map form values to Enum integers for API
        const formDiscountType = formData.get('discountType') as string;
        // 1 = Percentage, 2 = Flat
        const discountType = formDiscountType === 'Percentage' ? DiscountType.Percentage : DiscountType.Flat;

        // Applicable Type logic
        // 1 = All/Both, 2 = Quiz, 3 = Plan
        // If 2, send specificQuizIds. If 3, send specificPlanIds.
        const applicableTo = parseInt(formData.get('applicableTo') as string) || ApplicabilityType.AllSubscriptions;

        const data = {
            code: formData.get('code') as string,
            description: formData.get('description') as string,
            discountType: discountType,
            discountValue: parseFloat(formData.get('discountValue') as string),
            maxDiscountAmount: parseFloat(formData.get('maxDiscountAmount') as string) || 0,
            minimumPurchaseAmount: parseFloat(formData.get('minimumPurchaseAmount') as string) || 0,
            applicableTo: applicableTo,
            specificQuizIds: applicableTo === ApplicabilityType.SpecificQuizzes ? selectedQuizzes : [],
            specificPlanIds: applicableTo === ApplicabilityType.SpecificPlans ? selectedPlans : [],
            maxTotalUsage: parseInt(formData.get('maxTotalUsage') as string) || 1000,
            maxUsagePerUser: parseInt(formData.get('maxUsagePerUser') as string) || 1,
            startDate: new Date(formData.get('startDate') as string).toISOString(),
            expiryDate: new Date(formData.get('expiryDate') as string).toISOString(),
            status: 'Active' as const
        };

        console.log('Creating coupon with data:', data);

        try {
            setCreating(true);
            await couponsService.create(data);
            dispatch(showToast({ message: 'Coupon created successfully!', type: 'success' }));
            setShowCreateModal(false);
            fetchCoupons();
            // Reset selection states
            setSelectedPlans([]);
            setSelectedQuizzes([]);
            (e.target as HTMLFormElement).reset();
        } catch (error: any) {
            console.error('Create failed:', error);
            console.error('Error response:', error.response?.data);

            const errorData = error.response?.data;
            let errorMsg = 'Failed to create coupon';

            if (errorData?.errors && Array.isArray(errorData.errors) && errorData.errors.length > 0) {
                errorMsg = errorData.errors.join(', ');
            } else if (errorData?.messages && Array.isArray(errorData.messages) && errorData.messages.length > 0) {
                errorMsg = errorData.messages.join(', ');
            } else if (errorData?.message) {
                errorMsg = errorData.message;
            } else if (errorData?.title) {
                errorMsg = errorData.title;
            }

            dispatch(showToast({ message: errorMsg, type: 'error' }));
        } finally {
            setCreating(false);
        }
    };

    const handleEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingCoupon) return;

        const formData = new FormData(e.target as HTMLFormElement);

        const data = {
            id: editingCoupon.id,
            description: formData.get('description') as string,
            maxDiscountAmount: parseFloat(formData.get('maxDiscountAmount') as string) || 0,
            minimumPurchaseAmount: parseFloat(formData.get('minimumPurchaseAmount') as string) || 0,
            maxTotalUsage: parseInt(formData.get('maxTotalUsage') as string),
            maxUsagePerUser: parseInt(formData.get('maxUsagePerUser') as string),
            expiryDate: new Date(formData.get('expiryDate') as string).toISOString(),
            status: formData.get('status') as 'Active' | 'Inactive',
        };

        try {
            setUpdating(true);
            await couponsService.update(editingCoupon.id, data);
            dispatch(showToast({ message: 'Coupon updated successfully!', type: 'success' }));
            setShowEditModal(false);
            setEditingCoupon(null);
            fetchCoupons();
        } catch (error: any) {
            console.error('Update failed:', error);
            const errorMsg = error.response?.data?.message || error.response?.data?.title || 'Failed to update coupon';
            dispatch(showToast({ message: errorMsg, type: 'error' }));
        } finally {
            setUpdating(false);
        }
    };

    const handleDelete = async (id: string, code: string) => {
        if (!window.confirm(`Are you sure you want to delete coupon "${code}"?`)) return;

        try {
            await couponsService.delete(id);
            dispatch(showToast({ message: 'Coupon deleted successfully', type: 'success' }));
            fetchCoupons();
        } catch (error: any) {
            console.error('Delete failed:', error);
            const errorMsg = error.response?.data?.message || 'Failed to delete coupon';
            dispatch(showToast({ message: errorMsg, type: 'error' }));
        }
    };

    const openEditModal = (coupon: Coupon) => {
        setEditingCoupon(coupon);
        setShowEditModal(true);
    };

    const togglePlanSelection = (planId: string) => {
        setSelectedPlans(prev =>
            prev.includes(planId)
                ? prev.filter(id => id !== planId)
                : [...prev, planId]
        );
    };

    const toggleQuizSelection = (quizId: string) => {
        setSelectedQuizzes(prev =>
            prev.includes(quizId)
                ? prev.filter(id => id !== quizId)
                : [...prev, quizId]
        );
    };

    const getStatusBadge = (status: string) => {
        const styles = {
            Active: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
            Inactive: 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300',
            Expired: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
        };
        return styles[status as keyof typeof styles] || styles.Inactive;
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        dispatch(showToast({ message: 'Copied to clipboard', type: 'success' }));
    };

    // Helper to format date for input[type="date"]
    const formatDateForInput = (dateString?: string) => {
        if (!dateString) return new Date().toISOString().split('T')[0];
        return new Date(dateString).toISOString().split('T')[0];
    };

    return (
        <AdminLayout>
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-600 dark:text-slate-400"
                        >
                            <ArrowLeft size={24} />
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Coupon Management</h1>
                            <p className="text-slate-600 dark:text-slate-400 mt-1">Create and manage discount coupons</p>
                        </div>
                    </div>
                    <Button
                        onClick={() => {
                            setCreateApplicableType(ApplicabilityType.AllSubscriptions); // Reset default
                            setShowCreateModal(true);
                        }}
                        leftIcon={<Plus size={18} />}
                    >
                        Create Coupon
                    </Button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-600 dark:text-slate-400">Total Coupons</p>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{coupons.length}</p>
                            </div>
                            <Tag className="text-blue-500" size={32} />
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-600 dark:text-slate-400">Active</p>
                                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                                    {coupons.filter(c => c.status === 'Active').length}
                                </p>
                            </div>
                            <TrendingUp className="text-green-500" size={32} />
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-600 dark:text-slate-400">Inactive</p>
                                <p className="text-2xl font-bold text-gray-600 dark:text-gray-400 mt-1">
                                    {coupons.filter(c => c.status === 'Inactive').length}
                                </p>
                            </div>
                            <Filter className="text-gray-500" size={32} />
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-600 dark:text-slate-400">Expired</p>
                                <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                                    {coupons.filter(c => c.status === 'Expired').length}
                                </p>
                            </div>
                            <Calendar className="text-red-500" size={32} />
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                <Search size={16} className="inline mr-1" />
                                Search
                            </label>
                            <input
                                type="text"
                                placeholder="Search by code or description..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Status</label>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as any)}
                                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="all">All Status</option>
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                                <option value="Expired">Expired</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Applicable To</label>
                            <select
                                value={applicableToFilter}
                                onChange={(e) => setApplicableToFilter(e.target.value as any)}
                                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="all">All Types</option>
                                <option value="Both">Both (Quiz & Plan)</option>
                                <option value="Quiz">Quiz Only</option>
                                <option value="Plan">Plan Only</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Coupons Table */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        {loading ? (
                            <div className="text-center py-12 text-slate-500">Loading coupons...</div>
                        ) : filteredCoupons.length === 0 ? (
                            <div className="text-center py-12 text-slate-500">
                                {searchTerm || statusFilter !== 'all' || applicableToFilter !== 'all'
                                    ? 'No coupons match your filters'
                                    : 'No coupons found. Create one above!'}
                            </div>
                        ) : (
                            <table className="w-full">
                                <thead className="bg-slate-50 dark:bg-slate-900/50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4">Code</th>
                                        <th className="px-6 py-4">Discount</th>
                                        <th className="px-6 py-4">Type</th>
                                        <th className="px-6 py-4">Usage</th>
                                        <th className="px-6 py-4">Expiry</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {filteredCoupons.map((coupon) => (
                                        <tr key={coupon.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/20 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-pink-100 dark:bg-pink-900/20 rounded-lg text-pink-600">
                                                        <Tag size={16} />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900 dark:text-white">{coupon.code}</p>
                                                        <p className="text-xs text-slate-500">{coupon.description}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-semibold">
                                                {coupon.discountType === 'Percentage' || coupon.discountType as any === 1
                                                    ? `${coupon.discountValue}%`
                                                    : `₹${coupon.discountValue}`} OFF
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                                    {coupon.applicableTo === 'AllSubscriptions' || coupon.applicableTo as any === 1 ? 'Both' :
                                                        coupon.applicableTo === 'SpecificQuizzes' || coupon.applicableTo as any === 2 ? 'Quiz Only' :
                                                            coupon.applicableTo === 'SpecificPlans' || coupon.applicableTo as any === 3 ? 'Plan Only' :
                                                                coupon.applicableTo}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-300 text-sm">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-24 bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                                                        <div
                                                            className="bg-green-500 h-full rounded-full"
                                                            style={{ width: `${Math.min((coupon.currentUsageCount / coupon.maxTotalUsage) * 100, 100)}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs">{coupon.currentUsageCount}/{coupon.maxTotalUsage}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-300 text-sm">
                                                <div className="flex items-center gap-1">
                                                    <Calendar size={14} className="text-slate-400" />
                                                    {new Date(coupon.expiryDate).toLocaleDateString()}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${getStatusBadge(coupon.status)}`}>
                                                    {coupon.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => openEditModal(coupon)}
                                                        className="text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                                    >
                                                        <Edit2 size={16} />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDelete(coupon.id, coupon.code)}
                                                        className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                    >
                                                        <Trash2 size={16} />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* Create Modal */}
                {showCreateModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-slate-900 rounded-xl max-w-2xl w-full border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Create New Coupon</h3>
                                    <button
                                        onClick={() => setShowCreateModal(false)}
                                        className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                                    >
                                        <X size={24} />
                                    </button>
                                </div>
                                <form onSubmit={handleCreate} className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1 dark:text-slate-300">Code *</label>
                                            <input name="code" required placeholder="SUMMER2025" className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1 dark:text-slate-300">Discount Type *</label>
                                            <select name="discountType" className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                                                <option value="Percentage">Percentage</option>
                                                <option value="Flat">Flat (Fixed Amount)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1 dark:text-slate-300">Discount Value *</label>
                                            <input name="discountValue" type="number" step="0.01" required placeholder="50" className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1 dark:text-slate-300">Max Discount Amount</label>
                                            <input name="maxDiscountAmount" type="number" step="0.01" defaultValue="0" placeholder="500" className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1 dark:text-slate-300">Min Purchase Amount</label>
                                            <input name="minimumPurchaseAmount" type="number" step="0.01" defaultValue="0" placeholder="100" className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1 dark:text-slate-300">Applicable To *</label>
                                            <select
                                                name="applicableTo"
                                                className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                                value={createApplicableType}
                                                onChange={(e) => setCreateApplicableType(parseInt(e.target.value))}
                                            >
                                                <option value={ApplicabilityType.AllSubscriptions}>Both (Applicable to All)</option>
                                                <option value={ApplicabilityType.SpecificQuizzes}>Specific Quizzes</option>
                                                <option value={ApplicabilityType.SpecificPlans}>Specific Plans</option>
                                            </select>
                                        </div>

                                        {/* Dynamic Selections */}
                                        {createApplicableType === ApplicabilityType.SpecificPlans && (
                                            <div className="md:col-span-2">
                                                <label className="block text-sm font-medium mb-2 dark:text-slate-300">Select Plans</label>
                                                <div className="max-h-56 overflow-y-auto border rounded p-2 dark:border-slate-700">
                                                    {planOptions.map(plan => (
                                                        <div key={plan.id} className="flex items-start gap-3 mb-2 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded border border-transparent hover:border-slate-200 dark:hover:border-slate-600 transition-colors">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedPlans.includes(plan.id)}
                                                                onChange={() => togglePlanSelection(plan.id)}
                                                                className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                            />
                                                            <div className="flex-1">
                                                                <p className="text-sm font-medium dark:text-slate-200">{plan.name}</p>
                                                                <div className="flex items-center gap-2 mt-0.5">
                                                                    <code className="text-xs bg-slate-100 dark:bg-slate-900 text-slate-500 px-1 py-0.5 rounded">{plan.id}</code>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => copyToClipboard(plan.id)}
                                                                        title="Copy ID"
                                                                        className="text-slate-400 hover:text-blue-500"
                                                                    >
                                                                        <Copy size={12} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {planOptions.length === 0 && <p className="text-xs text-slate-500">No plans available.</p>}
                                                </div>
                                                <p className="text-xs text-slate-500 mt-1">{selectedPlans.length} plans selected</p>
                                            </div>
                                        )}

                                        {createApplicableType === ApplicabilityType.SpecificQuizzes && (
                                            <div className="md:col-span-2">
                                                <label className="block text-sm font-medium mb-2 dark:text-slate-300">Select Quizzes</label>
                                                <div className="max-h-56 overflow-y-auto border rounded p-2 dark:border-slate-700">
                                                    {quizOptions.map(quiz => (
                                                        <div key={quiz.id} className="flex items-start gap-3 mb-2 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded border border-transparent hover:border-slate-200 dark:hover:border-slate-600 transition-colors">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedQuizzes.includes(quiz.id)}
                                                                onChange={() => toggleQuizSelection(quiz.id)}
                                                                className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                            />
                                                            <div className="flex-1">
                                                                <p className="text-sm font-medium dark:text-slate-200">{quiz.title}</p>
                                                                <div className="flex items-center gap-2 mt-0.5">
                                                                    <code className="text-xs bg-slate-100 dark:bg-slate-900 text-slate-500 px-1 py-0.5 rounded">{quiz.id}</code>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => copyToClipboard(quiz.id)}
                                                                        title="Copy ID"
                                                                        className="text-slate-400 hover:text-blue-500"
                                                                    >
                                                                        <Copy size={12} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {quizOptions.length === 0 && <p className="text-xs text-slate-500">No quizzes available.</p>}
                                                </div>
                                                <p className="text-xs text-slate-500 mt-1">{selectedQuizzes.length} quizzes selected</p>
                                            </div>
                                        )}

                                        <div>
                                            <label className="block text-sm font-medium mb-1 dark:text-slate-300">Max Total Usage *</label>
                                            <input name="maxTotalUsage" type="number" defaultValue="1000" required className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1 dark:text-slate-300">Max Usage Per User *</label>
                                            <input name="maxUsagePerUser" type="number" defaultValue="1" required className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1 dark:text-slate-300">Start Date *</label>
                                            <input
                                                name="startDate"
                                                type="date"
                                                required
                                                defaultValue={formatDateForInput()}
                                                className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1 dark:text-slate-300">End Date *</label>
                                            <input
                                                name="expiryDate"
                                                type="date"
                                                required
                                                className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                            />
                                        </div>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium mb-1 dark:text-slate-300">Description *</label>
                                        <input
                                            name="description"
                                            required
                                            minLength={10}
                                            maxLength={500}
                                            placeholder="e.g., Get 50% off on all premium plans this December"
                                            className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                        />
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Must be between 10-500 characters</p>
                                    </div>

                                    <div className="flex gap-2 pt-4">
                                        <Button type="submit" isLoading={creating}>Create Coupon</Button>
                                        <Button type="button" variant="ghost" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {/* Edit Modal */}
                {showEditModal && editingCoupon && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-slate-900 rounded-xl max-w-2xl w-full border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Edit Coupon: {editingCoupon.code}</h3>
                                    <button
                                        onClick={() => setShowEditModal(false)}
                                        className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                                    >
                                        <X size={24} />
                                    </button>
                                </div>
                                <form onSubmit={handleEdit} className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1 dark:text-slate-300">Description *</label>
                                            <input name="description" required defaultValue={editingCoupon.description} className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1 dark:text-slate-300">Max Discount Amount</label>
                                            <input name="maxDiscountAmount" type="number" step="0.01" defaultValue={editingCoupon.maxDiscountAmount} className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1 dark:text-slate-300">Min Purchase Amount</label>
                                            <input name="minimumPurchaseAmount" type="number" step="0.01" defaultValue={editingCoupon.minimumPurchaseAmount} className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1 dark:text-slate-300">Max Total Usage *</label>
                                            <input name="maxTotalUsage" type="number" defaultValue={editingCoupon.maxTotalUsage} required className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1 dark:text-slate-300">Max Usage Per User *</label>
                                            <input name="maxUsagePerUser" type="number" defaultValue={editingCoupon.maxUsagePerUser} required className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1 dark:text-slate-300">End Date *</label>
                                            <input
                                                name="expiryDate"
                                                type="date"
                                                defaultValue={formatDateForInput(editingCoupon.expiryDate)}
                                                required
                                                className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1 dark:text-slate-300">Status *</label>
                                            <select name="status" defaultValue={editingCoupon.status} className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                                                <option value="Active">Active</option>
                                                <option value="Inactive">Inactive</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 pt-4">
                                        <Button type="submit" isLoading={updating}>Save Changes</Button>
                                        <Button type="button" variant="ghost" onClick={() => setShowEditModal(false)}>Cancel</Button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
};

export default AdminCouponsPage;
